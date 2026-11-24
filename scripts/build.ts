import {
    cp,
    readdir,
    rm
} from 'node:fs/promises';

const outdir = 'dist';
await rm(outdir, { recursive: true, force: true });
const result = await Bun.build({
    entrypoints: ['src/codex-powerline.ts', 'src/install.ts'],
    target: 'node',
    splitting: true,
    format: 'esm',
    outdir,
    external: ['@xterm/headless', '@powerline-dev/codex-powerline-core', 'node-pty', 'ws']
});

if (!result.success) {
    for (const log of result.logs)
        console.error(log);
    process.exit(1);
}

const coreManifest = import.meta.resolve('@powerline-dev/codex-powerline-core/package.json');
await cp(new URL('./configTemplates/', coreManifest), 'configTemplates', { recursive: true });

// Bun writes the executable and its lazy chunks as JavaScript.
const packageJson = await Bun.file('package.json').json() as { version: string };
const { version } = packageJson;
await Promise.all((await readdir(outdir)).filter(name => name.endsWith('.js')).map(async (name) => {
    const path = `${outdir}/${name}`;
    const file = Bun.file(path);
    const source = await file.text();
    if (source.includes('__PACKAGE_VERSION__')) {
        await Bun.write(path, source.replaceAll('__PACKAGE_VERSION__', version));
    }
}));
