import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it
} from 'vitest';

import manifest from '../../../assets/fonts/manifest.json';
import {
    BUNDLED_FONT_NAME,
    getFontDirectory,
    installBundledFonts,
    setupMacFonts
} from '../font-setup';

describe('bundled font setup', () => {
    let home = '';

    beforeEach(() => {
        home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-powerline-font-setup-'));
    });

    afterEach(() => {
        fs.rmSync(home, { recursive: true, force: true });
    });

    it.each(['darwin', 'linux', 'win32'] as const)('installs all four verified font faces in the user font directory on %s', (platform) => {
        const result = installBundledFonts({ home, platform, run: () => '' });
        expect(result.success).toBe(true);
        const directory = getFontDirectory(home, platform) ?? '';
        for (const font of manifest.fonts) {
            const data = fs.readFileSync(path.join(directory, font.file));
            expect(createHash('sha256').update(data).digest('hex')).toBe(font.sha256);
        }
    });

    it('leaves existing matching font files untouched on repeated installs', () => {
        installBundledFonts({ home, platform: 'darwin' });
        const file = path.join(getFontDirectory(home, 'darwin') ?? '', manifest.fonts[0]?.file ?? '');
        const past = new Date('2020-01-01T00:00:00Z');
        fs.utimesSync(file, past, past);
        const result = installBundledFonts({ home, platform: 'darwin' });
        expect(result.success).toBe(true);
        expect(fs.statSync(file).mtimeMs).toBe(past.getTime());
    });

    it('refreshes the Linux cache only when files change', () => {
        const calls: string[][] = [];
        const run = (file: string, args: string[]) => {
            calls.push([file, ...args]);
            return '';
        };
        installBundledFonts({ home, platform: 'linux', run });
        installBundledFonts({ home, platform: 'linux', run });
        expect(calls).toEqual([['fc-cache', '-f', getFontDirectory(home, 'linux') ?? '']]);
    });

    it('selects the font for the calling Apple Terminal TTY and confirms activation', () => {
        const calls: string[][] = [];
        const status = setupMacFonts({
            home, platform: 'darwin', env: { TERM_PROGRAM: 'Apple_Terminal' },
            run: (file, args) => {
                calls.push([file, ...args]);
                return file === '/bin/ps' ? 'ttys007\n' : `ready:${manifest.postscriptName}`;
            }
        });
        expect(status).toMatchObject({ installed: true, active: true, fontName: manifest.postscriptName });
        expect(calls[1]?.slice(-2)).toEqual(['/dev/ttys007', manifest.postscriptName]);
    });

    it('retains the font name when Terminal confirms an existing Nerd Font', () => {
        const status = setupMacFonts({
            home, platform: 'darwin', env: { TERM_PROGRAM: 'Apple_Terminal' },
            run: file => file === '/bin/ps' ? 'ttys001' : 'ready:JetBrainsMonoNFM-Regular'
        });
        expect(status).toMatchObject({ installed: true, active: true, fontName: 'JetBrainsMonoNFM-Regular' });
    });

    it('keeps installed files and reports the selection step when automation is denied', () => {
        const status = setupMacFonts({
            home, platform: 'darwin', env: { TERM_PROGRAM: 'Apple_Terminal' },
            run: (file) => {
                if (file === '/bin/ps')
                    return 'ttys001';
                throw new Error('Not authorized to send Apple events');
            }
        });
        expect(status).toMatchObject({ installed: true, active: false });
        expect(status.message).toContain('Terminal could not select it automatically');
        expect(status.message).toContain(BUNDLED_FONT_NAME);
    });

    it('does not mark an unexpected automation reply as ready', () => {
        const status = setupMacFonts({
            home, platform: 'darwin', env: { TERM_PROGRAM: 'Apple_Terminal' },
            run: file => file === '/bin/ps' ? 'ttys001' : 'Menlo-Regular'
        });
        expect(status.active).toBe(false);
    });

    it.each([
        { TERM_PROGRAM: 'iTerm.app' },
        { TERM_PROGRAM: 'Apple_Terminal', SSH_TTY: '/dev/ttys001' },
        { TERM_PROGRAM: 'Apple_Terminal', CI: '1' }
    ])('installs without controlling Terminal in unsupported or unattended sessions: %j', (env) => {
        let called = false;
        const status = setupMacFonts({
            home, platform: 'darwin', env,
            run: () => { called = true; return ''; }
        });
        expect(status.installed).toBe(true);
        expect(status.active).toBeUndefined();
        expect(called).toBe(false);
    });

    it('does not control a Terminal window when there is no matching controlling TTY', () => {
        const calls: string[] = [];
        const status = setupMacFonts({
            home, platform: 'darwin', env: { TERM_PROGRAM: 'Apple_Terminal' },
            run: (file) => { calls.push(file); return '??'; }
        });
        expect(status.installed).toBe(true);
        expect(status.active).toBeUndefined();
        expect(calls).toEqual(['/bin/ps']);
    });
});
