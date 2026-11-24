import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import manifest from '../../../assets/fonts/manifest.json';
import { getFontDirectory } from '../font-setup';
import { installPowerlineFonts } from '../powerline';

describe('installPowerlineFonts', () => {
    let home: string;
    const originalTerminal = process.env.TERM_PROGRAM;

    beforeEach(() => {
        home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-powerline-font-install-home-'));
        vi.spyOn(os, 'homedir').mockReturnValue(home);
        process.env.TERM_PROGRAM = 'font-install-test';
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (originalTerminal === undefined)
            delete process.env.TERM_PROGRAM;
        else
            process.env.TERM_PROGRAM = originalTerminal;
        fs.rmSync(home, { recursive: true, force: true });
    });

    it('installs the bundled family without downloading or executing an upstream script', async () => {
        const result = await installPowerlineFonts();
        const directory = getFontDirectory(home);
        expect(result.success).toBe(true);
        expect(directory).toBeDefined();
        expect(fs.readdirSync(directory ?? '').sort()).toEqual(manifest.fonts.map(font => font.file).sort());
    });

    it('reports a failure when the user font directory cannot be created', async () => {
        const directory = getFontDirectory(home);
        if (!directory)
            throw new Error('The test needs a supported platform');
        fs.mkdirSync(path.dirname(directory), { recursive: true });
        fs.writeFileSync(directory, 'occupied');
        const result = await installPowerlineFonts();
        expect(result.success).toBe(false);
        expect(result.message).toContain('Could not install the bundled font');
    });
});
