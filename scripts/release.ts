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
    integrity: string;
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

async function isPublished(packed: PackedPackage): Promise<boolean> {
    const spec = `${packed.name}@${packed.version}`;
    const response = await fetch(`${registry}${encodeURIComponent(packed.name)}/${encodeURIComponent(packed.version)}`, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(15000)
    });
    if (response.status === 404) {
        return false;
    }
    if (!response.ok) {
        throw new Error(`Could not check ${spec} on npm (HTTP ${response.status}).`);
    }
    const metadata = await response.json() as { dist?: { integrity?: string } };
    if (metadata.dist?.integrity !== packed.integrity) {
        throw new Error(`${spec} already exists on npm with different contents. Use its release checkout or bump the version.`);
    }
    return true;
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
const coreRange = cli.dependencies[core.name];
if (!coreRange || !Bun.semver.satisfies(core.version, coreRange)) {
    throw new Error(`Core ${core.version} does not match the CLI dependency ${coreRange ?? '(missing)'}.`);
}

await check(coreDirectory);
await check(cliDirectory);
await run(cliDirectory, 'node', 'dist/codex-powerline.js', '--version');
await run(cliDirectory, 'node', 'dist/codex-powerline.js', '--help');

const staging = await mkdtemp(join(tmpdir(), 'powerline-release-'));
try {
    const packages = [await pack(coreDirectory, staging), await pack(cliDirectory, staging)];
    if (mode === '--dry-run') {
        for (const packed of packages) {
            console.log(`Checked ${packed.name}@${packed.version} (${packed.filename}).`);
        }
        console.log('Dry run complete. Nothing was published.');
    } else {
        // Check both versions before publishing either package. A retry can
        // skip an identical upload when only one package reached npm.
        const status = await Promise.all(packages.map(async packed => ({ packed, published: await isPublished(packed) })));
        for (const { packed, published } of status) {
            if (published) {
                console.log(`Already published: ${packed.name}@${packed.version}`);
                continue;
            }
            await run(staging, 'npm', 'publish', join(staging, packed.filename), '--access', 'public', '--registry', registry);
        }
    }
} finally {
    await rm(staging, { recursive: true, force: true });
}
