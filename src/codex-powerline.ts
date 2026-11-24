#!/usr/bin/env node
import { parseArgs } from 'node:util';

import { StatusJSONSchema } from './types/StatusJSON';
import {
    initConfigPath,
    loadSettings
} from './utils/config';
import { prepareMacFonts } from './utils/font-setup';
import {
    GIT_REVIEW_REFRESH_FLAG,
    refreshGitReviewCacheFromCli
} from './utils/git-review-cache';
import { renderCodexStatus } from './utils/status-render';
import {
    getPackageVersion,
    getTerminalWidth
} from './utils/terminal';

const help = `Usage: codex-powerline [--config PATH] [COMMAND]

  configure          Edit and preview the status line (default in a terminal)
  run [CODEX ARGS]   Start Codex with the Powerline status bar
  render             Render a JSON status payload read from stdin
  --version          Show the package version
`;

async function main(args: string[]): Promise<void> {
    if (args[0] === GIT_REVIEW_REFRESH_FLAG) {
        const [, cwd, mode, lockPath] = args;
        if (cwd && lockPath && (mode === 'metadata' || mode === 'checks')) {
            refreshGitReviewCacheFromCli(cwd, { includeChecks: mode === 'checks' }, lockPath);
        }
        return;
    }

    const runIndex = args.findIndex((arg, index) => arg === 'run' && args[index - 1] !== '--config');
    const cliArgs = runIndex === -1 ? args : args.slice(0, runIndex);
    const { values, positionals } = parseArgs({
        args: cliArgs,
        options: {
            'config': { type: 'string' },
            'version': { type: 'boolean', short: 'v' },
            'help': { type: 'boolean', short: 'h' },
            'render-worker': { type: 'boolean' }
        },
        allowPositionals: true
    });
    if (values.version) {
        console.log(getPackageVersion());
        return;
    }
    if (values.help) {
        console.log(help);
        return;
    }
    initConfigPath(values.config);

    if (values['render-worker']) {
        const settings = loadSettings();
        process.on('message', (message: { data: unknown; width: number }) => {
            void settings.then((current) => {
                const data = StatusJSONSchema.parse(message.data);
                process.send?.({ width: message.width, lines: renderCodexStatus(data, current, message.width) });
            }).catch((error: unknown) => {
                process.send?.({ error: error instanceof Error ? error.message : String(error) });
            });
        });
        return;
    }
    if (runIndex >= 0 && positionals.length === 0) {
        if (process.stdin.isTTY && process.stdout.isTTY)
            prepareMacFonts();
        const { launchCodex } = await import('./codex/launcher');
        const code = await launchCodex(args.slice(runIndex + 1));
        // On Windows ConPTY can keep handles active after the child exits.
        // The launcher has already flushed the terminal and closed its app server.
        process.exit(code);
    }
    if (positionals.length > 1 || runIndex >= 0)
        throw new Error(help);
    const mode = positionals[0] ?? (process.stdin.isTTY ? 'configure' : 'render');
    if (mode === 'configure') {
        if (!process.stdin.isTTY || !process.stdout.isTTY)
            throw new Error('The editor requires an interactive terminal.');
        prepareMacFonts();
        if (process.env.CODEX_POWERLINE_DEV_RELOAD === '1') {
            const { getDevReloadMode, superviseDevReload } = await import('./utils/dev-reload');
            if (getDevReloadMode(process.env) === 'supervisor') {
                process.exitCode = await superviseDevReload(args);
                return;
            }
        }
        const { runTUI } = await import('./tui');
        runTUI();
    } else if (mode === 'render') {
        process.stdin.setEncoding('utf8');
        const chunks: string[] = [];
        for await (const chunk of process.stdin)
            chunks.push(String(chunk));
        if (!chunks.join('').trim())
            throw new Error('No input received on stdin.');
        const raw: unknown = JSON.parse(chunks.join(''));
        const data = StatusJSONSchema.parse(raw);
        const settings = await loadSettings();
        const width = getTerminalWidth({ sessionId: data.session_id, ttlSeconds: settings.terminalWidthCacheTtlSeconds });
        const lines = renderCodexStatus(data, settings, width, raw as Record<string, unknown>);
        if (lines.length > 0)
            console.log(lines.join('\n'));
    } else {
        throw new Error(`Unknown command: ${mode}\n${help}`);
    }
}

void main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
