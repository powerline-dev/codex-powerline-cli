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
    dependencies: Record<string, string>;
}

interface PackedPackage {
    name: string;
    version: string;
    filename: string;
}

const cliDirectory = resolve(import.meta.dir, '..');
const coreDirectory = resolve(cliDirectory, '../codex-powerline-core');
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

async function requirePublishedCore(core: Manifest): Promise<void> {
    const spec = `${core.name}@${core.version}`;
    const response = await fetch(`${registry}${encodeURIComponent(core.name)}/${encodeURIComponent(core.version)}`, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(15000)
    });
    if (response.status === 404) {
        throw new Error(`${spec} is not on npm. Release Core separately before releasing the CLI.`);
    }
    if (!response.ok) {
        throw new Error(`Could not check ${spec} on npm (HTTP ${response.status}).`);
    }
    await response.body?.cancel();
}

const [mode, ...extraArgs] = process.argv.slice(2);
if (extraArgs.length || (mode !== '--dry-run' && mode !== '--publish')) {
    throw new Error('Use bun run release or bun run release:dry-run.');
}

const core = await Bun.file(join(coreDirectory, 'package.json')).json() as Manifest;
const cli = await Bun.file(join(cliDirectory, 'package.json')).json() as Manifest;
if (core.name !== '@powerline-dev/codex-powerline-core' || cli.name !== '@powerline-dev/codex-powerline-cli') {
    throw new Error('Both checkouts must use the powerline-dev npm package names.');
}
const coreVersion = cli.dependencies[core.name];
if (coreVersion !== core.version) {
    throw new Error(`Core checkout ${core.version} does not match the CLI pin ${coreVersion ?? '(missing)'}.`);
}

if (mode === '--publish') {
    await requirePublishedCore(core);
}
await run(coreDirectory, 'bun', 'install', '--frozen-lockfile');
await run(coreDirectory, 'bun', 'run', 'build');
await check(cliDirectory);
await run(cliDirectory, 'node', 'dist/codex-powerline.js', '--version');
await run(cliDirectory, 'node', 'dist/codex-powerline.js', '--help');

const staging = await mkdtemp(join(tmpdir(), 'powerline-release-'));
try {
    const packedCli = await pack(cliDirectory, staging);
    if (mode === '--dry-run') {
        console.log(`Checked ${packedCli.name}@${packedCli.version} (${packedCli.filename}).`);
        console.log('Dry run complete. Nothing was published.');
    } else {
        const tarball = join(staging, packedCli.filename);
        // Check the distribution without the local Bun link. npm installs the
        // pinned Core from the registry just as it does for a CLI user.
        await run(staging, 'npm', 'install', '--prefix', staging, '--ignore-scripts', '--no-audit', '--no-fund', '--registry', registry, tarball);
        await run(staging, 'node', join('node_modules', cli.name, 'dist/codex-powerline.js'), '--version');
        await run(staging, 'npm', 'publish', tarball, '--access', 'public', '--registry', registry);
    }
} finally {
    await rm(staging, { recursive: true, force: true });
}
