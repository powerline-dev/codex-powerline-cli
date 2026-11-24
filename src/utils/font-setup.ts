import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';

import manifest from '../../assets/fonts/manifest.json';
import type { PowerlineFontStatus } from '../types/PowerlineFontStatus';

export const BUNDLED_FONT_NAME = manifest.family;

const packageRoot = path.dirname(createRequire(import.meta.url).resolve('@powerline-dev/codex-powerline-cli/package.json'));
const fontAssets = path.join(packageRoot, 'assets', 'fonts');
let lastFontStatus: PowerlineFontStatus | undefined;

export interface FontSetupOptions {
    home?: string;
    platform?: NodeJS.Platform;
    env?: NodeJS.ProcessEnv;
    run?: (file: string, args: string[]) => string;
}

function runCommand(file: string, args: string[]): string {
    return execFileSync(file, args, { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim();
}

export function getFontDirectory(home = os.homedir(), platform = process.platform): string | undefined {
    if (platform === 'darwin')
        return path.join(home, 'Library', 'Fonts');
    if (platform === 'linux')
        return path.join(home, '.local', 'share', 'fonts');
    if (platform === 'win32')
        return path.join(home, 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts');
    return undefined;
}

export function getBundledFontStatus(): PowerlineFontStatus {
    const directory = getFontDirectory();
    const installed = Boolean(directory && manifest.fonts.every(font => fs.existsSync(path.join(directory, font.file))));
    return { ...lastFontStatus, installed, fontName: BUNDLED_FONT_NAME, checkedSymbol: '\uE0B4' };
}

// Select only the profile belonging to the calling terminal's TTY. Do not use
// the front window: it may belong to a different tab while npm installs.
export const APPLE_TERMINAL_FONT_SCRIPT = `on run argv
    set targetTTY to item 1 of argv
    set targetFont to item 2 of argv
    if application "Terminal" is not running then error "Apple Terminal is not running"
    tell application "Terminal"
        repeat with terminalWindow in windows
            repeat with terminalTab in tabs of terminalWindow
                if tty of terminalTab is targetTTY then
                    set activeSettings to current settings of terminalTab
                    set existingFont to font name of activeSettings as text
                    if existingFont contains "Nerd" or existingFont contains "NFM-" or existingFont contains "NF-" then
                        return "ready:" & existingFont
                    end if
                    set font name of activeSettings to targetFont
                    if (font name of activeSettings as text) is not targetFont then
                        error "Terminal did not activate the bundled font"
                    end if
                    return "ready:" & targetFont
                end if
            end repeat
        end repeat
    end tell
    error "No Apple Terminal tab matches the calling terminal"
end run`;

export function installBundledFonts(options: FontSetupOptions = {}): { success: boolean; message: string } {
    const { home = os.homedir(), platform = process.platform, run = runCommand } = options;
    const directory = getFontDirectory(home, platform);
    if (!directory)
        return { success: false, message: 'Unsupported platform for font installation.' };

    try {
        fs.mkdirSync(directory, { recursive: true });
        let changed = false;
        for (const font of manifest.fonts) {
            const source = fs.readFileSync(path.join(fontAssets, font.file));
            const digest = (data: Buffer) => createHash('sha256').update(data).digest('hex');
            if (digest(source) !== font.sha256)
                throw new Error(`Bundled font checksum failed: ${font.file}`);
            const destination = path.join(directory, font.file);
            if (fs.existsSync(destination) && digest(fs.readFileSync(destination)) === font.sha256)
                continue;
            fs.writeFileSync(destination, source, { mode: 0o644 });
            changed = true;
        }
        if (changed && platform === 'linux') {
            try {
                run('fc-cache', ['-f', directory]);
            } catch {
                // The files are installed even on systems without fontconfig.
            }
        }
        return { success: true, message: `${BUNDLED_FONT_NAME} installed successfully.` };
    } catch (error) {
        return { success: false, message: `Could not install the bundled font: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export function setupMacFonts(options: FontSetupOptions = {}): PowerlineFontStatus {
    const { platform = process.platform, env = process.env, run = runCommand } = options;
    const result = installBundledFonts(options);
    const status: PowerlineFontStatus = { installed: result.success, fontName: BUNDLED_FONT_NAME, message: result.message, checkedSymbol: '\uE0B4' };
    if (!result.success || platform !== 'darwin')
        return status;

    status.message = `Font installed. Select ${BUNDLED_FONT_NAME} in your terminal's font settings.`;
    if (env.TERM_PROGRAM !== 'Apple_Terminal' || env.CI || env.SSH_CONNECTION || env.SSH_TTY)
        return status;

    try {
        const tty = run('/bin/ps', ['-p', String(process.pid), '-o', 'tty=']).trim();
        if (!/^ttys\d+$/.test(tty))
            return status;
        const reply = run('/usr/bin/osascript', ['-e', APPLE_TERMINAL_FONT_SCRIPT, `/dev/${tty}`, manifest.postscriptName]).trim();
        if (!reply.startsWith('ready:'))
            throw new Error('Terminal did not confirm the selected font');
        status.active = true;
        status.fontName = reply.slice('ready:'.length);
        status.message = 'Apple Terminal is ready for Powerline symbols.';
    } catch {
        status.active = false;
        status.message = `Font installed, but Terminal could not select it automatically. Allow Terminal automation when macOS asks, or select ${BUNDLED_FONT_NAME} in Terminal > Settings > Profiles > Text > Font.`;
    }
    lastFontStatus = status;
    return status;
}

export function prepareMacFonts(): void {
    if (process.platform !== 'darwin')
        return;
    const status = setupMacFonts();
    if (!status.installed || status.active === false || (process.env.TERM_PROGRAM === 'Apple_Terminal' && !status.active))
        console.error(`Codex Powerline: ${status.message}`);
}
