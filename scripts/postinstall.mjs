import { existsSync } from 'node:fs';

// A source checkout builds after bun install. Published packages contain the
// built installer and all font assets, so installation needs only Node.js.
const installer = new URL('../dist/install.js', import.meta.url);
if (!existsSync(new URL('../src/install.ts', import.meta.url)) && existsSync(installer)) {
    try {
        await import(installer.href);
    } catch (error) {
        console.warn(`Codex Powerline font setup will retry on first launch: ${error.message}`);
    }
}
