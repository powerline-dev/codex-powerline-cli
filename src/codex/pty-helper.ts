import {
    accessSync,
    chmodSync,
    constants,
    statSync
} from 'node:fs';
import { createRequire } from 'node:module';
import {
    dirname,
    resolve
} from 'node:path';

// node-pty 1.1.0 ships macOS prebuilt spawn-helper binaries with mode 0644.
// Repair the helper selected by its native loader, including source builds.
export function preparePtyHelper(): void {
    if (process.platform !== 'darwin')
        return;

    const require = createRequire(import.meta.url);
    const utilsPath = require.resolve('node-pty/lib/utils');
    const { loadNativeModule } = require(utilsPath) as { loadNativeModule: (name: string) => { dir: string } };
    const helper = resolve(dirname(utilsPath), loadNativeModule('pty').dir, 'spawn-helper');
    try {
        accessSync(helper, constants.X_OK);
        return;
    } catch {
        // Installations that preserve the tarball mode need owner execute.
    }

    try {
        chmodSync(helper, (statSync(helper).mode & 0o7777) | 0o100);
        accessSync(helper, constants.X_OK);
    } catch (cause) {
        throw new Error(`Cannot execute the terminal helper at ${helper}. Grant execute permission to this file and try again.`, { cause });
    }
}
