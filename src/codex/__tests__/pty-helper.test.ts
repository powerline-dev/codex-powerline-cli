import type * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it
} from 'vitest';

const require = createRequire(import.meta.url);
const { execFileSync } = require('node:child_process') as typeof childProcess;

// Exercise real native PTYs in a copied dependency, without changing the
// developer's installed helper or depending on mocks from other test suites.
describe.skipIf(process.platform !== 'darwin')('macOS PTY helper permissions', () => {
    let root = '';
    let helper = '';
    let originalHelper = '';
    let probe = '';

    beforeAll(() => {
        root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-powerline-pty-helper-')));
        const packageRoot = path.dirname(require.resolve('node-pty/package.json'));
        const utilsPath = require.resolve('node-pty/lib/utils');
        const { loadNativeModule } = require(utilsPath) as { loadNativeModule: (name: string) => { dir: string } };
        originalHelper = path.resolve(path.dirname(utilsPath), loadNativeModule('pty').dir, 'spawn-helper');
        const copiedPackage = path.join(root, 'node_modules', 'node-pty');
        fs.cpSync(packageRoot, copiedPackage, { recursive: true });
        helper = path.join(copiedPackage, path.relative(packageRoot, originalHelper));
        execFileSync('bun', ['build', fileURLToPath(new URL('../pty-helper.ts', import.meta.url)),
            '--target=node', `--outfile=${path.join(root, 'helper.mjs')}`], { stdio: 'pipe' });
        probe = path.join(root, 'probe.mjs');
        fs.writeFileSync(probe, `
            import { preparePtyHelper } from './helper.mjs';
            import pty from 'node-pty';
            if (process.argv[2] === 'repair') {
                preparePtyHelper();
                console.log('helper-ready');
                process.exit(0);
            }
            const terminal = pty.spawn('/usr/bin/true', [], {
                cwd: ${JSON.stringify(root)}, env: process.env
            });
            terminal.onExit(({ exitCode }) => {
                console.log('pty-exited');
                process.exit(exitCode);
            });
            setTimeout(() => process.exit(2), 3000);
        `);
    });

    beforeEach(() => {
        fs.rmSync(helper, { force: true });
        fs.copyFileSync(originalHelper, helper);
        fs.chmodSync(helper, 0o644);
    });

    afterAll(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    for (const runtime of ['node', 'bun']) {
        it(`repairs the helper under ${runtime} so Node can start a native PTY`, () => {
            expect(() => execFileSync('node', [probe], { stdio: 'pipe', timeout: 10000 })).toThrow('posix_spawnp failed');
            execFileSync(runtime, [probe, 'repair'], { stdio: 'pipe', timeout: 10000 });
            const output = execFileSync('node', [probe], { encoding: 'utf8', timeout: 10000 });
            expect(output.trim()).toBe('pty-exited');
            expect(fs.statSync(helper).mode & 0o777).toBe(0o744);
        });
    }

    it('preserves an already executable helper without adding write permission', () => {
        fs.chmodSync(helper, 0o555);
        const output = execFileSync('node', [probe, 'repair'], { encoding: 'utf8', timeout: 10000 });
        expect(output.trim()).toBe('helper-ready');
        expect(fs.statSync(helper).mode & 0o777).toBe(0o555);
    });

    it('reports the helper path and repair action when the helper is missing', () => {
        fs.unlinkSync(helper);
        expect(() => execFileSync('node', [probe, 'repair'], { stdio: 'pipe', timeout: 10000 }))
            .toThrow(`Cannot execute the terminal helper at ${helper}. Grant execute permission`);
    });
});
