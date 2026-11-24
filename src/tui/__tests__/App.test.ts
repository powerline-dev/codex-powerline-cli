import chalk from 'chalk';
import * as fs from 'node:fs';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
    CURRENT_VERSION,
    DEFAULT_SETTINGS
} from '../../types/Settings';
import {
    getColorAnsiCode,
    updateColorMap
} from '../../utils/colors';
import {
    applyTuiImport,
    buildConfigLoadNotice,
    buildConfigLoadWarning,
    buildInvalidConfigSaveConfirm,
    getConfirmCancelScreen
} from '../App';

import {
    KEYS,
    pressKey,
    renderApp,
    setUpAppSandbox,
    type AppSandbox,
    type RenderedApp
} from './helpers/render-app';
import { waitFor } from './helpers/wait-for-ink';

describe('App confirm navigation helpers', () => {
    it('defaults confirmation cancel navigation to the main menu', () => {
        expect(getConfirmCancelScreen(null)).toBe('main');
        expect(getConfirmCancelScreen({
            message: 'Confirm change?',
            action: () => Promise.resolve()
        })).toBe('main');
    });

    it('returns to the run command when the confirm dialog requests it', () => {
        expect(getConfirmCancelScreen({
            message: 'Confirm install?',
            action: () => Promise.resolve(),
            cancelScreen: 'runHelp'
        })).toBe('runHelp');
    });
});

describe('TUI config imports', () => {
    it('synchronizes Chalk with the imported color level', () => {
        const originalLevel = chalk.level;

        try {
            const imported = applyTuiImport(
                { ...DEFAULT_SETTINGS, colorLevel: 2 },
                { ...DEFAULT_SETTINGS, colorLevel: 0 },
                'merge',
                ['colorLevel']
            );

            expect(imported.colorLevel).toBe(0);
            expect(chalk.level).toBe(0);
        } finally {
            chalk.level = originalLevel;
        }
    });

    it('builds the named colors for the imported color level', () => {
        const originalLevel = chalk.level;

        try {
            // The color codes as built at startup in a terminal that reports 16 colors
            chalk.level = 1;
            updateColorMap();

            applyTuiImport(
                { ...DEFAULT_SETTINGS, colorLevel: 1 },
                { ...DEFAULT_SETTINGS, colorLevel: 2 },
                'merge',
                ['colorLevel']
            );

            expect(getColorAnsiCode('cyan', 'ansi256')).toBe('\x1b[38;5;30m');
        } finally {
            chalk.level = originalLevel;
            updateColorMap();
        }
    });
});

describe('Invalid-config TUI guards', () => {
    it('returns null when there is no config load error', () => {
        expect(buildConfigLoadWarning(null)).toBeNull();
        expect(buildInvalidConfigSaveConfirm(null, vi.fn())).toBeNull();
    });

    it('builds a banner that names the reason and warns about overwriting', () => {
        const warning = buildConfigLoadWarning('settings.json is not valid JSON');
        expect(warning).toContain('settings.json is not valid JSON');
        expect(warning).toContain('overwrites the file');
    });

    it('builds a save-guard confirm dialog that returns to main on cancel', () => {
        const guard = buildInvalidConfigSaveConfirm('settings.json could not be read', vi.fn());
        expect(guard).not.toBeNull();
        expect(guard?.cancelScreen).toBe('main');
        expect(guard?.message).toContain('preserved');
        expect(guard?.message).toContain('could not be read');
    });

    it('builds a save-guard confirm dialog that returns to the given screen on cancel', () => {
        expect(buildInvalidConfigSaveConfirm('settings.json could not be read', vi.fn(), 'items')?.cancelScreen)
            .toBe('items');
    });

    it('invokes the provided onConfirm when the guard action runs', async () => {
        const onConfirm = vi.fn();
        const guard = buildInvalidConfigSaveConfirm('settings.json is not valid JSON', onConfirm);
        await guard?.action();
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it('reflects the specific load-error reason in the save-guard message', () => {
        expect(buildInvalidConfigSaveConfirm('settings.json is not valid JSON', vi.fn())?.message)
            .toContain('settings.json is not valid JSON');
        expect(buildInvalidConfigSaveConfirm('settings.json is not in a valid format', vi.fn())?.message)
            .toContain('not in a valid format');
    });
});

describe('App live label preview', () => {
    let sandbox: AppSandbox;

    beforeEach(() => {
        sandbox = setUpAppSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it.each([false, true])('previews label spacing, cancels drafts, and commits or resets labels (Powerline: %s)', async (powerline) => {
        const initial = {
            ...DEFAULT_SETTINGS,
            powerline: { ...DEFAULT_SETTINGS.powerline, enabled: powerline },
            lines: [
                [{ id: 'anchor', type: 'custom-text', customText: 'Untouched line' }],
                [{ id: 'model', type: 'model', metadata: { label: '7d' } }]
            ]
        };
        fs.writeFileSync(sandbox.settingsPath, JSON.stringify(initial));
        const rendered = renderApp();

        try {
            await waitFor(() => {
                expect(rendered.getFrame()).toContain('Main Menu');
                expect(rendered.getFrame()).toContain('7dgpt-6.2-sol');
            });
            await pressKey(rendered, KEYS.enter, 'Select Line to Edit Items');
            await pressKey(rendered, KEYS.down, 'Line 2');
            await pressKey(rendered, KEYS.enter, 'Edit Line 2');
            await pressKey(rendered, 'e', '(default: "Model: ")');
            await pressKey(rendered, ' ', '7d gpt-6.2-sol');
            await pressKey(rendered, '\x7f', '7dgpt-6.2-sol');
            await pressKey(rendered, 'XYZ', '7dXYZgpt-6.2-sol');
            expect(rendered.getFrame()).toContain('Untouched line');
            expect(JSON.parse(fs.readFileSync(sandbox.settingsPath, 'utf-8'))).toEqual(initial);

            await pressKey(rendered, KEYS.escape, 'Edit Line 2');
            expect(rendered.getFrame()).toContain('7dgpt-6.2-sol');
            expect(rendered.getFrame()).not.toContain('7dXYZgpt-6.2-sol');
            await pressKey(rendered, 'e', '(default: "Model: ")');
            await pressKey(rendered, ' ', '7d gpt-6.2-sol');
            await pressKey(rendered, KEYS.enter, 'Edit Line 2');
            expect(rendered.getFrame()).toContain('7d gpt-6.2-sol');
            await pressKey(rendered, KEYS.ctrlS, 'Configuration saved');
            expect(JSON.parse(fs.readFileSync(sandbox.settingsPath, 'utf-8'))).toMatchObject({ lines: [initial.lines[0], [{ id: 'model', metadata: { label: '7d ' } }]] });

            await pressKey(rendered, 'e', '(default: "Model: ")');
            await pressKey(rendered, '!', '7d !gpt-6.2-sol');
            await pressKey(rendered, '\t', 'Edit Line 2');
            expect(rendered.getFrame()).toContain('Model: gpt-6.2-sol');
            expect(rendered.getFrame()).not.toContain('7d !gpt-6.2-sol');
        } finally {
            rendered.cleanup();
        }
    });
});

describe('App save guard for an invalid settings.json', () => {
    let sandbox: AppSandbox;

    beforeEach(() => {
        sandbox = setUpAppSandbox();
        fs.writeFileSync(sandbox.settingsPath, JSON.stringify({ lines: 'not a list' }));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('returns to the screen Ctrl+S was pressed on, whether the save is cancelled or confirmed', async () => {
        const rendered = renderApp();

        try {
            await waitFor(() => {
                expect(rendered.getFrame()).toContain('not in a valid format');
            });
            await pressKey(rendered, KEYS.enter, 'Select Line to Edit Items');
            await pressKey(rendered, KEYS.enter, 'Edit Line 1');

            await pressKey(rendered, KEYS.ctrlS, 'is preserved on disk');
            await pressKey(rendered, KEYS.escape, 'Edit Line 1');
            expect(fs.readFileSync(sandbox.settingsPath, 'utf-8')).toContain('not a list');

            await pressKey(rendered, KEYS.ctrlS, 'is preserved on disk');
            await pressKey(rendered, KEYS.enter, 'Configuration saved');
            expect(rendered.getFrame()).toContain('Edit Line 1');
            const saved = JSON.parse(fs.readFileSync(sandbox.settingsPath, 'utf-8')) as { lines: unknown };
            expect(Array.isArray(saved.lines)).toBe(true);
        } finally {
            rendered.cleanup();
        }
    });
});

describe('App with a migration it could not back up', () => {
    let sandbox: AppSandbox;

    beforeEach(() => {
        sandbox = setUpAppSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('builds a notice that says the settings shown are migrated and a save backs up the file', () => {
        expect(buildConfigLoadNotice(null)).toBeNull();
        const notice = buildConfigLoadNotice('settings.json could not be backed up before migrating');
        expect(notice).toContain('could not be backed up before migrating');
        expect(notice).toContain('showing the migrated settings');
        expect(notice).toContain('backs up the file first');
    });

    it('shows the migrated settings and saves only once the original can be backed up', async () => {
        const original = JSON.stringify({
            version: 3,
            lines: [[{ id: 'mine', type: 'custom-text', customText: 'My own line' }]]
        });
        fs.writeFileSync(sandbox.settingsPath, original);
        const backupPath = `${sandbox.settingsPath}.v3.bak`;
        // A directory where the backup goes makes the backup write fail
        fs.mkdirSync(backupPath);
        const rendered = renderApp();

        try {
            await waitFor(() => {
                expect(rendered.getFrame()).toContain('could not be backed up before migrating');
                expect(rendered.getFrame()).toContain('My own line');
            });

            await pressKey(rendered, KEYS.ctrlS, 'Could not save configuration');
            expect(fs.readFileSync(sandbox.settingsPath, 'utf-8')).toBe(original);

            fs.rmdirSync(backupPath);
            await pressKey(rendered, KEYS.ctrlS, 'Configuration saved');
            expect(fs.readFileSync(backupPath, 'utf-8')).toBe(original);
            expect(JSON.parse(fs.readFileSync(sandbox.settingsPath, 'utf-8'))).toMatchObject({
                version: CURRENT_VERSION,
                lines: [[{ id: 'mine', type: 'custom-text', customText: 'My own line' }]]
            });
            expect(rendered.getFrame()).not.toContain('could not be backed up');
        } finally {
            rendered.cleanup();
        }
    });
});

describe('App main menu highlight across Ctrl+S', () => {
    let sandbox: AppSandbox;

    beforeEach(() => {
        sandbox = setUpAppSandbox();
        fs.writeFileSync(sandbox.settingsPath, JSON.stringify(DEFAULT_SETTINGS));
    });

    afterEach(() => {
        sandbox.restore();
    });

    // The main menu entry the cursor is on
    function getHighlightedEntry(rendered: RenderedApp): string | undefined {
        return rendered.getFrame().split('\n').find(line => line.startsWith('▶  '))?.slice(3).trimEnd();
    }

    // Changes Color Level, so the main menu offers Save & Exit, then moves down
    // from Terminal Options, the entry last opened, to the given entry, past
    // whatever entries lie between
    async function changeAndMoveDownTo(rendered: RenderedApp, target: string): Promise<void> {
        await waitFor(() => {
            expect(rendered.getFrame()).toContain('Main Menu');
        });
        await pressKey(rendered, KEYS.down, '▶  🎨 Edit Colors');
        await pressKey(rendered, KEYS.down, '▶  ⚡ Powerline Setup');
        await pressKey(rendered, KEYS.down, '▶  💻 Terminal Options');
        await pressKey(rendered, KEYS.enter, '▶  ▓ Color Level');
        await pressKey(rendered, KEYS.enter, '(Truecolor)');
        await pressKey(rendered, KEYS.escape, '💾 Save & Exit');
        for (let steps = 0; getHighlightedEntry(rendered) !== target; steps += 1) {
            expect(steps).toBeLessThan(20);
            const before = getHighlightedEntry(rendered);
            rendered.stdin.write(KEYS.down);
            await waitFor(() => {
                expect(getHighlightedEntry(rendered)).not.toBe(before);
            });
        }
    }

    it('keeps the highlighted entry, so Enter opens it', async () => {
        const rendered = renderApp();

        try {
            await changeAndMoveDownTo(rendered, 'Run with Codex');
            await pressKey(rendered, KEYS.ctrlS, 'Configuration saved');
            expect(rendered.getFrame()).not.toContain('💾 Save & Exit');
            expect(rendered.getFrame()).toContain('▶  Run with Codex');

            await pressKey(rendered, KEYS.enter, 'Launch Codex with: codex-powerline run');
        } finally {
            rendered.cleanup();
        }
    });

    // Saving replaces Save & Exit and Exit without saving with a single Exit
    it.each([
        { highlighted: '💾 Save & Exit', after: '🚪 Exit', above: 'Run with Codex' },
        { highlighted: '❌ Exit without saving', after: '🚪 Exit', above: 'Run with Codex' }
    ])('highlights $after after a save from $highlighted', async ({ highlighted, after, above }) => {
        const rendered = renderApp();

        try {
            await changeAndMoveDownTo(rendered, highlighted);
            await pressKey(rendered, KEYS.ctrlS, 'Configuration saved');
            await waitFor(() => {
                expect(rendered.getFrame()).toContain(`▶  ${after}`);
            });

            await pressKey(rendered, KEYS.up, `▶  ${above}`);
        } finally {
            rendered.cleanup();
        }
    });
});

describe('App preview colors in a terminal that reports fewer colors', () => {
    let sandbox: AppSandbox;

    beforeEach(() => {
        sandbox = setUpAppSandbox();
        // The color codes as built at startup in a terminal that reports 16 colors
        chalk.level = 1;
        updateColorMap();
    });

    afterEach(() => {
        sandbox.restore();
    });

    function writeSettingsAt256Colors(line: unknown[]): void {
        fs.writeFileSync(sandbox.settingsPath, JSON.stringify({ ...DEFAULT_SETTINGS, colorLevel: 2, lines: [line] }));
    }

    it('draws the preview in the configured color level', async () => {
        writeSettingsAt256Colors([{ id: 'model', type: 'model' }]);
        const rendered = renderApp();

        try {
            await waitFor(() => {
                expect(rendered.getFrame()).toContain('Main Menu');
            });
            // Cyan as the status line draws it at 256 colors, not as black, its 16-color stand-in
            expect(rendered.getRawFrame()).toContain('\x1b[38;5;30mModel: gpt-6.2-sol');
        } finally {
            rendered.cleanup();
        }
    });

    it.each([
        { case: 'without custom colors', customColors: false },
        { case: 'after the custom-colors warning', customColors: true }
    ])('redraws the preview in the color level picked in Terminal Options ($case)', async ({ customColors }) => {
        writeSettingsAt256Colors([
            { id: 'model', type: 'model' },
            ...(customColors ? [{ id: 'orange', type: 'custom-text', customText: 'Orange', color: 'ansi256:208' }] : [])
        ]);
        const rendered = renderApp();

        try {
            await waitFor(() => {
                expect(rendered.getFrame()).toContain('Main Menu');
            });
            await pressKey(rendered, KEYS.down, '▶  🎨 Edit Colors');
            await pressKey(rendered, KEYS.down, '▶  ⚡ Powerline Setup');
            await pressKey(rendered, KEYS.down, '▶  💻 Terminal Options');
            await pressKey(rendered, KEYS.enter, '▶  ▓ Color Level');
            if (customColors) {
                await pressKey(rendered, KEYS.enter, 'Custom colors detected');
            }
            await pressKey(rendered, KEYS.enter, '(Truecolor)');

            expect(rendered.getRawFrame()).toContain('\x1b[38;2;6;152;154mModel: gpt-6.2-sol');
        } finally {
            rendered.cleanup();
        }
    });
});
