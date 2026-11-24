import {
    describe,
    expect,
    it
} from 'vitest';

import type {
    RenderContext,
    WidgetItem
} from '../../types';
import { DEFAULT_SETTINGS } from '../../types/Settings';
import { FastModeWidget } from '../FastMode';

const ITEM: WidgetItem = { id: 'fast-mode', type: 'fast-mode' };

function makeContext(fastMode?: boolean | null, overrides: Partial<RenderContext> = {}): RenderContext {
    return { data: fastMode === undefined ? {} : { fast_mode: fastMode }, ...overrides };
}

function render(item: WidgetItem, context: RenderContext): string | null {
    return new FastModeWidget().render(item, context, DEFAULT_SETTINGS);
}

describe('FastModeWidget', () => {
    describe('metadata', () => {
        it('has correct display name', () => {
            expect(new FastModeWidget().getDisplayName()).toBe('Fast Mode');
        });

        it('has correct description', () => {
            expect(new FastModeWidget().getDescription()).toBe('Shows whether Codex fast mode is on');
        });

        it('has correct category', () => {
            expect(new FastModeWidget().getCategory()).toBe('Core');
        });

        it('has yellow default color', () => {
            expect(new FastModeWidget().getDefaultColor()).toBe('yellow');
        });

        it('supports raw value', () => {
            expect(new FastModeWidget().supportsRawValue()).toBe(true);
        });

        it('supports colors', () => {
            expect(new FastModeWidget().supportsColors(ITEM)).toBe(true);
        });

        it('can hide while fast mode is off, not by default', () => {
            expect(new FastModeWidget().getHideableStates()).toEqual([
                { key: 'off', label: 'when fast mode is off' }
            ]);
        });
    });

    describe('editor configuration', () => {
        it('exposes the format keybind', () => {
            expect(new FastModeWidget().getCustomKeybinds()).toEqual([
                { key: 'f', label: '(f)ormat', action: 'cycle-format' }
            ]);
        });

        it('defaults to icon-text in the editor display', () => {
            expect(new FastModeWidget().getEditorDisplay(ITEM)).toEqual({
                displayText: 'Fast Mode',
                modifierText: '(icon-text)'
            });
        });

        it('shows the configured format for a legacy Nerd Font layout', () => {
            expect(new FastModeWidget().getEditorDisplay({
                ...ITEM,
                metadata: { format: 'icon', nerdFont: 'true' }
            })).toEqual({
                displayText: 'Fast Mode',
                modifierText: '(icon)'
            });
        });

        it('cycles icon-text -> icon -> text -> word -> icon-text', () => {
            const widget = new FastModeWidget();
            const icon = widget.handleEditorAction('cycle-format', ITEM);
            const text = widget.handleEditorAction('cycle-format', icon ?? ITEM);
            const word = widget.handleEditorAction('cycle-format', text ?? ITEM);
            const back = widget.handleEditorAction('cycle-format', word ?? ITEM);

            expect(icon?.metadata?.format).toBe('icon');
            expect(text?.metadata?.format).toBe('text');
            expect(word?.metadata?.format).toBe('word');
            expect(back?.metadata?.format).toBeUndefined();
        });

        it('clears the old icon flag when changing format', () => {
            const widget = new FastModeWidget();
            const item: WidgetItem = { ...ITEM, metadata: { nerdFont: 'true', hide: 'off' } };
            const icon = widget.handleEditorAction('cycle-format', item);
            const text = widget.handleEditorAction('cycle-format', icon ?? ITEM);

            expect(icon?.metadata).toEqual({ format: 'icon', hide: 'off' });
            expect(text?.metadata).toEqual({ format: 'text', hide: 'off' });
        });

        it('returns null for unknown editor actions', () => {
            expect(new FastModeWidget().handleEditorAction('unknown', ITEM)).toBeNull();
        });
    });

    describe('render() - format icon-text (default)', () => {
        const NERD_ITEM: WidgetItem = { ...ITEM, metadata: { nerdFont: 'true' } };

        it('renders ⚡ off when OFF', () => {
            expect(render(ITEM, makeContext(false))).toBe('⚡ off');
        });

        it('renders ⚡ on when ON', () => {
            expect(render(ITEM, makeContext(true))).toBe('⚡ on');
        });

        it('renders the standard lightning bolt when a legacy layout is off', () => {
            expect(render(NERD_ITEM, makeContext(false))).toBe('⚡ off');
        });

        it('renders the standard lightning bolt when a legacy layout is on', () => {
            expect(render(NERD_ITEM, makeContext(true))).toBe('⚡ on');
        });
    });

    describe('render() - format icon', () => {
        const FORMAT_ITEM: WidgetItem = { ...ITEM, metadata: { format: 'icon' } };
        const FORMAT_NERD_ITEM: WidgetItem = { ...ITEM, metadata: { format: 'icon', nerdFont: 'true' } };

        it('renders ⚡ ○ when OFF', () => {
            expect(render(FORMAT_ITEM, makeContext(false))).toBe('⚡ ○');
        });

        it('renders ⚡ ◉ when ON', () => {
            expect(render(FORMAT_ITEM, makeContext(true))).toBe('⚡ ◉');
        });

        it('shows the standard icon and off indicator for a legacy layout', () => {
            expect(render(FORMAT_NERD_ITEM, makeContext(false))).toBe('⚡ ○');
        });

        it('shows the standard icon and on indicator for a legacy layout', () => {
            expect(render(FORMAT_NERD_ITEM, makeContext(true))).toBe('⚡ ◉');
        });
    });

    describe('render() - format text', () => {
        const FORMAT_ITEM: WidgetItem = { ...ITEM, metadata: { format: 'text' } };

        it('renders "off" when OFF', () => {
            expect(render(FORMAT_ITEM, makeContext(false))).toBe('off');
        });

        it('renders "on" when ON', () => {
            expect(render(FORMAT_ITEM, makeContext(true))).toBe('on');
        });
    });

    describe('render() - format word', () => {
        const FORMAT_ITEM: WidgetItem = { ...ITEM, metadata: { format: 'word' } };

        it('renders "fast off" when OFF', () => {
            expect(render(FORMAT_ITEM, makeContext(false))).toBe('fast off');
        });

        it('renders "fast on" when ON', () => {
            expect(render(FORMAT_ITEM, makeContext(true))).toBe('fast on');
        });
    });

    describe('render() - hide when off', () => {
        const HIDE_ITEM: WidgetItem = { ...ITEM, metadata: { hide: 'off' } };

        it('renders nothing while fast mode is off', () => {
            expect(render(HIDE_ITEM, makeContext(false))).toBeNull();
        });

        it('still renders while fast mode is on', () => {
            expect(render(HIDE_ITEM, makeContext(true))).toBe('⚡ on');
        });

        it('shows the off state without the option', () => {
            expect(render(ITEM, makeContext(false))).toBe('⚡ off');
        });
    });

    describe('render() - preview mode', () => {
        it('renders the ON state for the default format', () => {
            expect(render(ITEM, makeContext(false, { isPreview: true }))).toBe('⚡ on');
        });

        it('renders the ON state even with hide-when-off set', () => {
            expect(render({ ...ITEM, metadata: { hide: 'off' } }, makeContext(undefined, { isPreview: true }))).toBe('⚡ on');
        });

        it('renders the ON state for word format', () => {
            expect(render({ ...ITEM, metadata: { format: 'word' } }, makeContext(undefined, { isPreview: true }))).toBe('fast on');
        });
    });

    describe('render() - missing data', () => {
        it('returns null when the payload has no fast_mode', () => {
            expect(render(ITEM, makeContext())).toBeNull();
        });

        it('returns null when fast_mode is null', () => {
            expect(render(ITEM, makeContext(null))).toBeNull();
        });

        it('returns null without any payload', () => {
            expect(render(ITEM, {})).toBeNull();
        });
    });

    describe('render() - raw value', () => {
        const RAW_ITEM: WidgetItem = { ...ITEM, rawValue: true };
        const cases: { name: string; item: WidgetItem; off: string; on: string }[] = [
            { name: 'icon-text', item: RAW_ITEM, off: 'off', on: 'on' },
            {
                name: 'icon-text with legacy metadata',
                item: { ...RAW_ITEM, metadata: { nerdFont: 'true' } },
                off: 'off',
                on: 'on'
            },
            { name: 'icon', item: { ...RAW_ITEM, metadata: { format: 'icon' } }, off: '○', on: '◉' },
            {
                name: 'icon with legacy metadata',
                item: { ...RAW_ITEM, metadata: { format: 'icon', nerdFont: 'true' } },
                off: '○',
                on: '◉'
            },
            { name: 'text', item: { ...RAW_ITEM, metadata: { format: 'text' } }, off: 'off', on: 'on' },
            { name: 'word', item: { ...RAW_ITEM, metadata: { format: 'word' } }, off: 'off', on: 'on' }
        ];

        it.each(cases)('removes only the label from $name format', ({ item, off, on }) => {
            expect(render(item, makeContext(false))).toBe(off);
            expect(render(item, makeContext(true))).toBe(on);
        });
    });
});
