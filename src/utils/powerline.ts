import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { PowerlineFontStatus } from '../types/PowerlineFontStatus';

import {
    getBundledFontStatus,
    installBundledFonts,
    setupMacFonts
} from './font-setup';

// Re-export for backward compatibility
export type { PowerlineFontStatus };

// Track if fonts were installed during this session (for DEBUG_FONT_INSTALL)
let fontsInstalledThisSession = false;

/**
 * Detect installed font files; only terminal setup can confirm the active font
 */
export function checkPowerlineFonts(): PowerlineFontStatus {
    // Debug mode: pretend fonts aren't installed (unless we installed them this session)
    if (process.env.DEBUG_FONT_INSTALL === '1' && !fontsInstalledThisSession) {
        return {
            installed: false,
            checkedSymbol: '\uE0B0'
        };
    }

    const bundled = getBundledFontStatus();
    if (bundled.installed)
        return bundled;

    try {
        // Representative symbols for the font status display. Finding font
        // files does not establish that the terminal selected one of them.
        const testSymbols = {
            rightArrow: '\uE0B0',     //
            rightThinArrow: '\uE0B1',  //
            leftArrow: '\uE0B2',       //
            leftThinArrow: '\uE0B3'   //
        };

        // Try to detect if fonts are available
        // This is a heuristic check - we assume if the system has common Powerline font files, they're available
        const platform = os.platform();
        let fontPaths: string[] = [];

        if (platform === 'darwin') {
            fontPaths = [
                path.join(os.homedir(), 'Library', 'Fonts'),
                '/Library/Fonts',
                '/System/Library/Fonts'
            ];
        } else if (platform === 'linux') {
            fontPaths = [
                path.join(os.homedir(), '.local', 'share', 'fonts'),
                path.join(os.homedir(), '.fonts'),
                '/usr/share/fonts',
                '/usr/local/share/fonts'
            ];
        } else if (platform === 'win32') {
            fontPaths = [
                path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts'),
                'C:\\Windows\\Fonts'
            ];
        }

        // Common Powerline font patterns to look for
        const powerlineFontPatterns = [
            /powerline/i,
            /nerd.?font/i,
            /for powerline/i,
            /meslo.*lg/i,  // Meslo LG fonts often include Powerline
            /source.*code.*pro.*powerline/i,
            /dejavu.*powerline/i,
            /ubuntu.*mono.*powerline/i,
            /cascadia.*code.*pl/i,  // Cascadia Code PL
            /fira.*code.*nerd/i
        ];

        // Check if any Powerline fonts exist
        for (const fontPath of fontPaths) {
            if (fs.existsSync(fontPath)) {
                try {
                    const files = fs.readdirSync(fontPath);
                    for (const file of files) {
                        for (const pattern of powerlineFontPatterns) {
                            if (pattern.test(file)) {
                                return {
                                    installed: true,
                                    checkedSymbol: testSymbols.rightArrow
                                };
                            }
                        }
                    }
                } catch {
                    // Ignore read errors for specific directories
                }
            }
        }

        return {
            installed: false,
            checkedSymbol: testSymbols.rightArrow
        };
    } catch {
        return { installed: false };
    }
}

/**
 * Check if Powerline fonts are installed (async version with fc-list check)
 */
export async function checkPowerlineFontsAsync(): Promise<PowerlineFontStatus> {
    // Ensure this is always async
    await Promise.resolve();

    // Debug mode: pretend fonts aren't installed (unless we installed them this session)
    if (process.env.DEBUG_FONT_INSTALL === '1' && !fontsInstalledThisSession) {
        return {
            installed: false,
            checkedSymbol: '\uE0B0'
        };
    }

    try {
        // First do the quick synchronous check
        const quickCheck = checkPowerlineFonts();
        if (quickCheck.installed) {
            return quickCheck;
        }

        // Additional check: See if fontconfig knows about Powerline fonts (Linux/macOS)
        const platform = os.platform();
        if (platform === 'linux' || platform === 'darwin') {
            try {
                const { exec } = await import('node:child_process');
                const { promisify } = await import('node:util');
                const execAsync = promisify(exec);

                const { stdout } = await execAsync('fc-list 2>/dev/null | grep -i powerline', {
                    encoding: 'utf8',
                    windowsHide: true
                });

                if (stdout.trim()) {
                    return {
                        installed: true,
                        checkedSymbol: '\uE0B0'
                    };
                }
            } catch {
                // fc-list not available or no Powerline fonts found
            }
        }

        return quickCheck;
    } catch {
        return { installed: false };
    }
}

/**
 * Install Powerline fonts on the system
 */
export function installPowerlineFonts(): Promise<{ success: boolean; message: string }> {
    const result = process.platform === 'darwin'
        ? (() => {
            const status = setupMacFonts();
            return { success: status.installed, message: status.message ?? 'Font setup finished.' };
        })()
        : installBundledFonts();
    if (result.success && process.env.DEBUG_FONT_INSTALL === '1')
        fontsInstalledThisSession = true;
    return Promise.resolve(result);
}

/**
 * Get a user-friendly message about Powerline font status
 */
export function getPowerlineStatusMessage(status: PowerlineFontStatus): string {
    if (status.installed) {
        return status.active ? '✓ Terminal font ready' : '✓ Font files detected; terminal font not verified';
    } else {
        return `✗ Powerline fonts not detected - some symbols may not display correctly`;
    }
}
