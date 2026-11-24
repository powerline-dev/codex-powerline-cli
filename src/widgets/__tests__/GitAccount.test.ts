import type * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it
} from 'vitest';

import { DEFAULT_SETTINGS } from '../../types/Settings';
import type { WidgetItem } from '../../types/Widget';
import { getWidget } from '../../utils/widgets';
import { GitAccountWidget } from '../GitAccount';

const widget = new GitAccountWidget();
const item: WidgetItem = { id: 'account', type: 'git-account' };

// Other suites mock child_process globally under Bun. Use real Git for fixture
// setup and run the live widget in a fresh process, as in git-conflicts.test.ts.
const require = createRequire(import.meta.url);
const { execFileSync } = require('node:child_process') as typeof childProcess;

describe('Git Account', () => {
    let probeDirectory: string;
    let probePath: string;
    let directory: string;
    let repository: string;
    let env: NodeJS.ProcessEnv;

    function git(...args: string[]): string {
        return execFileSync('git', args, { cwd: repository, encoding: 'utf8', env });
    }

    function render(widgetItem = item, cwd = repository): unknown {
        const output = execFileSync(process.execPath, [probePath, cwd, JSON.stringify(widgetItem)], { encoding: 'utf8', env });
        return JSON.parse(output);
    }

    beforeAll(() => {
        probeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'powerline-git-account-probe-'));
        const entryPath = path.join(probeDirectory, 'probe.ts');
        probePath = path.join(probeDirectory, 'probe.mjs');
        const modulePath = (relative: string) => JSON.stringify(fileURLToPath(new URL(relative, import.meta.url)));
        fs.writeFileSync(entryPath, `
            import { GitAccountWidget } from ${modulePath('../GitAccount.ts')};
            import { DEFAULT_SETTINGS } from ${modulePath('../../types/Settings.ts')};
            const [, , cwd, rawItem] = process.argv;
            const output = new GitAccountWidget().render(JSON.parse(rawItem), { data: { cwd } }, DEFAULT_SETTINGS);
            console.log(JSON.stringify(output));
        `);
        const bun = typeof Bun === 'undefined' ? 'bun' : process.execPath;
        execFileSync(bun, ['build', entryPath, '--target=node', `--outfile=${probePath}`], { stdio: 'pipe' });
    });

    afterAll(() => {
        if (probeDirectory)
            fs.rmSync(probeDirectory, { recursive: true, force: true });
    });

    beforeEach(() => {
        directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'powerline-git-account-')));
        repository = path.join(directory, 'repo');
        fs.mkdirSync(repository);
        const globalConfig = path.join(directory, 'gitconfig');
        env = {
            ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))),
            HOME: directory,
            USERPROFILE: directory,
            GIT_CONFIG_NOSYSTEM: '1',
            GIT_CONFIG_GLOBAL: globalConfig,
            CODEX_HOME: path.join(directory, 'codex')
        };
        fs.writeFileSync(globalConfig, '');
        git('init', '--quiet');
    });

    afterEach(() => {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    it('is registered with a static preview and raw value support', () => {
        expect(getWidget('git-account')).toBeInstanceOf(GitAccountWidget);
        // Even an invalid directory must not be read for the preview.
        expect(widget.render(item, { isPreview: true, data: { cwd: '/missing' } }, DEFAULT_SETTINGS)).toBe('Git: you@work.com');
        expect(widget.render({ ...item, rawValue: true }, { isPreview: true }, DEFAULT_SETTINGS)).toBe('you@work.com');
    });

    it('uses the repository email ahead of the global personal account', () => {
        git('config', '--global', 'user.email', 'personal@example.com');
        git('config', '--local', 'user.email', 'work@example.com');
        git('remote', 'add', 'origin', 'git@github.com:someone-else/repo.git');
        expect(render()).toBe('Git: work@example.com');
        expect(render({ ...item, rawValue: true })).toBe('work@example.com');
        expect(render({ ...item, metadata: { label: 'Account: ' } })).toBe('Account: work@example.com');
    });

    it('resolves conditional includes for the active project', () => {
        const includedConfig = path.join(directory, 'work.gitconfig');
        fs.writeFileSync(includedConfig, '[user]\n email = included@work.com\n');
        git('config', '--global', 'user.email', 'personal@example.com');
        const gitDir = git('rev-parse', '--absolute-git-dir').trim();
        git('config', '--global', `includeIf.gitdir:${gitDir}.path`, includedConfig);
        expect(render()).toBe('Git: included@work.com');
    });

    it('falls back to the configured name when email is missing', () => {
        git('config', 'user.name', 'Work Account');
        expect(render()).toBe('Git: Work Account');
    });

    it('hides an unknown identity and respects no-git hiding', () => {
        expect(render()).toBeNull();
        expect(render(item, directory)).toBe('(no git)');
        expect(render({ ...item, metadata: { hide: 'no-git' } }, directory)).toBeNull();
    });
});
