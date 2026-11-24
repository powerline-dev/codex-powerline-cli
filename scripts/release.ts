import {
    mkdtemp,
    rm
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
    join,
    resolve
} from 'node:path';

interface Manifest {
    name: string;
    version: string;
}

interface PackedPackage {
    name: string;
    version: string;
    filename: string;
}

const cliDirectory = resolve(import.meta.dir, '..');
const registry = 'https://registry.npmjs.org/';

async function run(cwd: string, ...command: string[]): Promise<void> {
    const child = Bun.spawn(command, { cwd, stdio: ['inherit', 'inherit', 'inherit'] });
    const status = await child.exited;
    if (status !== 0) {
        throw new Error(`${command.join(' ')} failed (exit ${status}).`);
    }
}

async function check(cwd: string): Promise<void> {
    await run(cwd, 'bun', 'install', '--frozen-lockfile');
    await run(cwd, 'bun', 'run', 'lint');
    await run(cwd, 'bun', 'test');
    await run(cwd, 'bun', 'run', 'build');
}

async function pack(cwd: string, destination: string): Promise<PackedPackage> {
    const child = Bun.spawn(['npm', 'pack', '--json', '--pack-destination', destination], {
        cwd,
        stdout: 'pipe',
        stderr: 'inherit'
    });
    const output = await new Response(child.stdout).text();
    if (await child.exited !== 0) {
        throw new Error(`npm pack failed in ${cwd}.`);
    }
    const [packed] = JSON.parse(output) as PackedPackage[];
    if (!packed) {
        throw new Error(`npm pack did not produce a tarball in ${cwd}.`);
    }
    return packed;
}

const [mode, ...extraArgs] = process.argv.slice(2);
if (extraArgs.length || (mode !== '--dry-run' && mode !== '--publish')) {
    throw new Error('Use bun run release or bun run release:dry-run.');
}

const cli = await Bun.file(join(cliDirectory, 'package.json')).json() as Manifest;
if (cli.name !== '@powerline-dev/codex-powerline-cli') {
    throw new Error('Expected the Codex Powerline CLI package.');
}

await check(cliDirectory);
await run(cliDirectory, 'node', 'dist/codex-powerline.js', '--version');
await run(cliDirectory, 'node', 'dist/codex-powerline.js', '--help');

const staging = await mkdtemp(join(tmpdir(), 'powerline-release-'));
try {
    const packedCli = await pack(cliDirectory, staging);
    const tarball = join(staging, packedCli.filename);
    // Validate the packed distribution in isolation for both release modes.
    await run(staging, 'npm', 'install', '--prefix', staging, '--ignore-scripts', '--no-audit', '--no-fund', '--registry', registry, tarball);
    const entrypoint = join('node_modules', cli.name, 'dist/codex-powerline.js');
    await run(staging, 'node', entrypoint, '--version');
    await run(staging, 'node', entrypoint, '--help');
    if (mode === '--dry-run') {
        console.log(`Checked ${packedCli.name}@${packedCli.version} (${packedCli.filename}).`);
        console.log('Dry run complete. Nothing was published.');
    } else {
        await run(staging, 'npm', 'publish', tarball, '--access', 'public', '--registry', registry);
    }
} finally {
    await rm(staging, { recursive: true, force: true });
}
