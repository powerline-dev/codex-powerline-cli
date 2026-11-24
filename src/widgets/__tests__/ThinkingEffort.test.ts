import chalk from 'chalk';
import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import type {
    RenderContext,
    StatusJSON,
    WidgetItem
} from '../../types';
import {
    DEFAULT_SETTINGS,
    type Settings
} from '../../types/Settings';
import { updateColorMap } from '../../utils/colors';
import {
    calculateMaxWidthsFromPreRendered,
    preRenderAllWidgets,
    renderStatusLine
} from '../../utils/renderer';
import { ThinkingEffortWidget } from '../ThinkingEffort';

function render(options: {
    rawValue?: boolean;
    isPreview?: boolean;
    statusData?: Partial<StatusJSON>;
    item?: Partial<WidgetItem>;
    settings?: Partial<Settings>;
} = {}): string | null {
    const {
        rawValue = false,
        isPreview = false,
        statusData = {},
        item: itemOverrides = {},
        settings = {}
    } = options;

    const widget = new ThinkingEffortWidget();
    const context: RenderContext = { data: statusData, isPreview };
    const item: WidgetItem = {
        id: 'thinking-effort',
        type: 'thinking-effort',
        rawValue,
        ...itemOverrides
    };

    return widget.render(item, context, { ...DEFAULT_SETTINGS, ...settings });
}

describe('ThinkingEffortWidget', () => {
    describe('metadata', () => {
        it('has correct display name', () => {
            const widget = new ThinkingEffortWidget();
            expect(widget.getDisplayName()).toBe('Thinking Effort');
        });

        it('has correct category', () => {
            const widget = new ThinkingEffortWidget();
            expect(widget.getCategory()).toBe('Core');
        });

        it('supports raw value', () => {
            const widget = new ThinkingEffortWidget();
            expect(widget.supportsRawValue()).toBe(true);
        });

        it('supports colors', () => {
            const widget = new ThinkingEffortWidget();
            expect(widget.supportsColors({ type: 'thinking-effort' } as never)).toBe(true);
        });
    });

    describe('preview mode', () => {
        it('returns labelled preview', () => {
            const result = render({ isPreview: true });
            expect(result).toBe('Thinking: high');
        });

        it('returns raw preview', () => {
            const result = render({ isPreview: true, rawValue: true });
            expect(result).toBe('high');
        });
    });

    describe('status JSON source', () => {
        it('reads max effort from status JSON', () => {
            const result = render({ statusData: { effort: { level: 'max' } } });
            expect(result).toBe('Thinking: max');
        });

        it('returns raw status JSON effort when requested', () => {
            const result = render({
                rawValue: true,
                statusData: { effort: { level: 'max' } }
            });
            expect(result).toBe('max');
        });

        it('uses the reported effort for the displayed model', () => {
            const result = render({ statusData: { effort: { level: 'max' } } });
            expect(result).toBe('Thinking: max');
        });

        it('supports xhigh effort from status JSON', () => {
            const result = render({ statusData: { effort: { level: 'xhigh' } } });
            expect(result).toBe('Thinking: xhigh');
        });

        it('shows unknown-but-valid status JSON effort with trailing "?" marker', () => {
            const result = render({ statusData: { effort: { level: 'ultra' } } });
            expect(result).toBe('Thinking: ultra?');
        });

        it('treats null status JSON effort as explicit default', () => {
            const result = render({ statusData: { effort: { level: null } } });
            expect(result).toBe('Thinking: default');
        });
    });

    describe('brackets and level colors', () => {
        const ORANGE = '\x1b[38;5;208m';
        const FG_RESET = '\x1b[39m';
        const xhighStatus = { effort: { level: 'xhigh' } };

        it('wraps the live effort in the chosen brackets', () => {
            expect(render({ rawValue: true, statusData: xhighStatus, item: { metadata: { brackets: '()' } } })).toBe('(xhigh)');
        });

        it('applies brackets to the preview too', () => {
            expect(render({ rawValue: true, isPreview: true, item: { metadata: { brackets: '[]' } } })).toBe('[high]');
        });

        it('colors only the effort by level, leaving the rest to the renderer', () => {
            const result = render({
                statusData: xhighStatus,
                item: { color: 'hex:112233', metadata: { brackets: '()', levelColors: 'true', bracketColor: 'widget' } }
            });

            expect(result).toBe(`(Thinking: ${ORANGE}xhigh${FG_RESET})`);
        });

        // The label editor's override replaces "Thinking: " inside the brackets
        it('draws an edited label, or none, with brackets and level colors', () => {
            expect(render({ isPreview: true, item: { metadata: { brackets: '[]', label: 'T ' } } })).toBe('[T high]');
            expect(render({ isPreview: true, item: { metadata: { label: '' } } })).toBe('high');

            const result = render({
                statusData: xhighStatus,
                item: { color: 'hex:112233', metadata: { levelColors: 'true', label: 'T ' } }
            });
            expect(result).toBe(`T ${ORANGE}xhigh${FG_RESET}`);
        });

        it('leaves unknown levels to the renderer\'s color', () => {
            const result = render({
                rawValue: true,
                statusData: { effort: { level: 'super-max' } },
                item: { color: 'hex:112233', metadata: { levelColors: 'true' } }
            });

            expect(result).toBe('super-max?');
        });

        it('emits plain text when colors are disabled', () => {
            const result = render({
                rawValue: true,
                statusData: xhighStatus,
                item: { metadata: { brackets: '()', levelColors: 'true' } },
                settings: { colorLevel: 0 }
            });

            expect(result).toBe('(xhigh)');
        });

        it('asks the renderer to color around its level runs only while level colors are on', () => {
            const widget = new ThinkingEffortWidget();
            const item: WidgetItem = { id: 'e', type: 'thinking-effort' };

            expect(widget.colorsOnlyItsRuns(item)).toBe(false);
            expect(widget.colorsOnlyItsRuns({ ...item, metadata: { levelColors: 'true' } })).toBe(true);
        });

        it('cycles brackets from the (b) keybind and opens the level color editor from (l)', () => {
            const widget = new ThinkingEffortWidget();
            const item: WidgetItem = { id: 'e', type: 'thinking-effort' };
            const keybinds = widget.getCustomKeybinds();
            const bracketAction = keybinds.find(keybind => keybind.key === 'b')?.action ?? '';
            const colorsAction = keybinds.find(keybind => keybind.key === 'l')?.action ?? '';

            expect(widget.handleEditorAction(bracketAction, item)?.metadata).toEqual({ brackets: '()' });
            // null hands the action to renderEditor
            expect(widget.handleEditorAction(colorsAction, item)).toBeNull();
            expect(widget.renderEditor({ widget: item, onComplete: vi.fn(), onCancel: vi.fn(), action: colorsAction })).not.toBeNull();
        });

        it('lists the active options beside the name in the line editor', () => {
            const widget = new ThinkingEffortWidget();

            expect(widget.getEditorDisplay({ id: 'e', type: 'thinking-effort' }).modifierText).toBeUndefined();
            expect(widget.getEditorDisplay({ id: 'e', type: 'thinking-effort', metadata: { brackets: '<>', levelColors: 'true' } }).modifierText)
                .toBe('(brackets <>, level colors)');
        });
    });

    // The renderer colors everything but the level runs, the way it colors any widget
    describe('level colors on the status line', () => {
        const ORANGE = '\x1b[38;5;208m';
        const FG_RESET = '\x1b[39m';
        const levelColored: WidgetItem = { id: 'e', type: 'thinking-effort', metadata: { levelColors: 'true' } };

        function renderLine(item: WidgetItem, settings: Partial<Settings>): string {
            const fullSettings: Settings = { ...DEFAULT_SETTINGS, defaultPadding: '', ...settings };
            const context: RenderContext = { isPreview: false, terminalWidth: 0, data: { effort: { level: 'xhigh' } } };
            const preRenderedLines = preRenderAllWidgets([[item]], fullSettings, context);
            const maxWidths = calculateMaxWidthsFromPreRendered(preRenderedLines, fullSettings);
            return renderStatusLine([item], fullSettings, context, preRenderedLines[0] ?? [], maxWidths);
        }

        it('draws the label in the Powerline theme\'s text color', () => {
            const line = renderLine(levelColored, {
                colorLevel: 2,
                powerline: { ...DEFAULT_SETTINGS.powerline, enabled: true, theme: 'nord' }
            });
            // nord's first segment at 256 colors: text 16 on background 73
            const themeText = '\x1b[38;5;16m';

            expect(line).toBe(`${themeText}\x1b[48;5;73mThinking: ${ORANGE}xhigh${themeText}\x1b[49m${FG_RESET}`);
        });

        it('draws the label and widget-colored brackets in the item color', () => {
            const item = { ...levelColored, color: 'hex:112233', metadata: { levelColors: 'true', brackets: '()' } };
            const BASE = '\x1b[38;2;17;34;51m';

            expect(renderLine(item, { colorLevel: 3 })).toBe(
                `${BASE}${ORANGE}(${BASE}Thinking: ${ORANGE}xhigh${BASE}${ORANGE})${BASE}${FG_RESET}`
            );
        });

        it('leaves the label in the terminal\'s color when the item color is "Default"', () => {
            expect(renderLine({ ...levelColored, color: '' }, { colorLevel: 3 })).toBe(`Thinking: ${ORANGE}xhigh${FG_RESET}`);
        });

        it('sweeps an item gradient across the label and keeps the level color', () => {
            const line = renderLine({ ...levelColored, color: 'gradient:atlas' }, { colorLevel: 3 });

            // atlas runs #feac5e to #4bc0c8 across "Thinking:", the text it colors
            expect(line.startsWith('\x1b[38;2;254;172;94mT')).toBe(true);
            expect(line).toContain(`\x1b[38;2;75;192;200m: ${ORANGE}xhigh${FG_RESET}`);
        });

        it('gives way to a global foreground override', () => {
            expect(renderLine(levelColored, { colorLevel: 3, overrideForegroundColor: 'hex:AABBCC' }))
                .toBe(`\x1b[38;2;170;187;204mThinking: xhigh${FG_RESET}`);
        });

        it('colors nothing at the No Color level', () => {
            const originalLevel = chalk.level;
            try {
                // The CLI and editor set Chalk before calling the renderer.
                chalk.level = 0;
                updateColorMap();
                expect(renderLine(levelColored, { colorLevel: 0 })).toBe('Thinking: xhigh');
            } finally {
                chalk.level = originalLevel;
                updateColorMap();
            }
        });
    });
});
