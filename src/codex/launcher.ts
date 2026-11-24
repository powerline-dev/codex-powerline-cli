import xterm from '@xterm/headless';
import nodePty from 'node-pty';
import { fork } from 'node:child_process';

import {
    getConfigPath,
    loadSettings
} from '../utils/config';
import { getCodexLines } from '../utils/widgets';

import { startBridge } from './bridge';
import { codexCommand } from './command';
import { preparePtyHelper } from './pty-helper';
import { CodexTelemetry } from './telemetry';
import { paintTerminal } from './terminal';

const ESC = '\x1b';
const TOKEN_ENV = 'CODEX_POWERLINE_BRIDGE_TOKEN';

export async function launchCodex(args: string[]): Promise<number> {
    const { stdin, stdout } = process;
    if (!stdin.isTTY || !stdout.isTTY)
        throw new Error('Run requires an interactive terminal.');
    if (args.some(arg => /^--remote(?:=|-auth-token-env|$)/.test(arg))) {
        throw new Error('The launcher uses its own local Codex app-server. Do not pass --remote.');
    }

    const executable = process.argv[1];
    if (!executable)
        throw new Error('Could not find the Powerline renderer entry point.');
    const command = codexCommand();
    preparePtyHelper();
    const settings = await loadSettings();
    const numLines = getCodexLines(settings.lines).filter(line => line.length > 0).length;
    const dimensions = () => {
        const rows = Math.max(1, stdout.rows || 24);
        const reserved = Math.min(numLines, Math.max(0, rows - 3));
        return { cols: Math.max(2, stdout.columns || 80), rows, childRows: rows - reserved };
    };
    let size = dimensions();
    const telemetry = new CodexTelemetry(process.cwd());
    const bridge = await startBridge(command, telemetry);

    try {
        const pty = nodePty.spawn(command.file, [...command.args, '--remote', bridge.url,
            '--remote-auth-token-env', TOKEN_ENV, '-c', 'tui.status_line=[]', ...args], {
            name: 'xterm-256color',
            cols: size.cols,
            rows: size.childRows,
            cwd: process.cwd(),
            env: { ...process.env, TERM: 'xterm-256color', [TOKEN_ENV]: bridge.token }
        });
        const screen = new xterm.Terminal({
            allowProposedApi: true, cols: size.cols, rows: size.childRows, scrollback: 3000,
            windowsPty: process.platform === 'win32' ? { backend: 'conpty' } : undefined
        });

        return await new Promise<number>((resolveExit) => {
            let done = false;
            let canRender = true;
            let cursorVisible = true;
            let footer: string[] = [];
            let lastFrame: string[] = [];
            let pendingFrame: ReturnType<typeof setTimeout> | undefined;
            const renderer = fork(executable, ['--config', getConfigPath(), '--render-worker'], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
            const paint = () => {
                pendingFrame = undefined;
                if (!done)
                    stdout.write(paintTerminal(screen, footer, size.rows, cursorVisible, lastFrame));
            };
            const schedule = () => { pendingFrame ??= setTimeout(paint, 16); };
            const rendererUnavailable = () => {
                if (done) {
                    return;
                }
                footer = ['Powerline: status unavailable'.slice(0, size.cols)];
                schedule();
            };
            const refresh = () => {
                if (!canRender || !renderer.connected)
                    return;
                canRender = false;
                renderer.send({ data: telemetry.snapshot(), width: size.cols }, (error) => {
                    if (error) {
                        rendererUnavailable();
                    }
                });
            };
            renderer.on('message', (result: { lines?: string[]; width?: number; error?: string }) => {
                canRender = true;
                if (result.error) {
                    rendererUnavailable();
                    return;
                }
                if (result.width !== size.cols) {
                    refresh();
                    return;
                }
                footer = result.lines ?? [];
                schedule();
            });
            renderer.on('error', rendererUnavailable);
            renderer.on('exit', rendererUnavailable);

            // Xterm answers cursor queries itself. Mirror only input-related
            // modes to the outer terminal; the child cannot move its cursor
            // into the reserved footer or switch the outer terminal buffer.
            for (const [final, enabled] of [['h', true], ['l', false]] as const) {
                screen.parser.registerCsiHandler({ prefix: '?', final }, (params) => {
                    for (const param of params) {
                        if (param === 25)
                            cursorVisible = enabled;
                        if ([1, 1000, 1002, 1003, 1004, 1006, 2004].some(mode => mode === param)) {
                            stdout.write(ESC + '[?' + String(param) + final);
                        }
                    }
                    return false;
                });
            }
            screen.onData((data) => {
                if (!done)
                    pty.write(data);
            });
            pty.onData((data) => {
                if (!done)
                    screen.write(data, schedule);
            });
            const originalRaw = stdin.isRaw;
            const input = (data: string) => {
                if (data === ESC + '[5;2~' || data === ESC + '[6;2~') {
                    screen.scrollLines(data === ESC + '[5;2~' ? -size.childRows : size.childRows);
                    schedule();
                    return;
                }
                screen.scrollToBottom();
                pty.write(data.replace(/\x1b\[<(\d+);(\d+);(\d+)[Mm]/g, (event, _button: string, _col: string, row: string) => Number(row) <= size.childRows ? event : ''));
                schedule();
            };
            const resize = () => {
                size = dimensions();
                lastFrame = [];
                stdout.write(ESC + '[2J');
                screen.resize(size.cols, size.childRows);
                pty.resize(size.cols, size.childRows);
                footer = [];
                refresh();
                schedule();
            };
            const interrupt = () => { finish(130); };
            const terminate = () => { finish(143); };
            const timer = setInterval(refresh, settings.refreshIntervalSeconds * 1000);
            function finish(code: number, childExited = false) {
                if (done)
                    return;
                done = true;
                clearInterval(timer);
                if (pendingFrame)
                    clearTimeout(pendingFrame);
                stdin.off('data', input);
                stdout.off('resize', resize);
                process.off('SIGINT', interrupt);
                process.off('SIGTERM', terminate);
                stdin.setRawMode(originalRaw);
                stdin.pause();
                renderer.kill();
                screen.dispose();
                if (!childExited)
                    pty.kill();
                stdout.write(ESC + '[0m' + ESC + '[?1;1000;1002;1003;1004;1006;2004l' + ESC + '[?25h' + ESC + '[?1049l', () => {
                    resolveExit(code);
                });
            }

            stdout.write(ESC + '[?1049h' + ESC + '[2J');
            stdin.setRawMode(true);
            stdin.setEncoding('utf8');
            stdin.on('data', input);
            stdout.on('resize', resize);
            process.once('SIGINT', interrupt);
            process.once('SIGTERM', terminate);
            pty.onExit(({ exitCode }) => { finish(exitCode, true); });
            refresh();
        });
    } finally {
        await bridge.close();
    }
}
