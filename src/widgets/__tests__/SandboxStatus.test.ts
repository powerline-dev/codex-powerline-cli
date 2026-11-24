import { DEFAULT_SETTINGS } from '@powerline-dev/codex-powerline-core';
import {
    describe,
    expect,
    it
} from 'vitest';

import type {
    RenderContext,
    WidgetItem
} from '../../types';
import { SandboxStatusWidget } from '../SandboxStatus';

const ITEM: WidgetItem = { id: 'sandbox-status', type: 'sandbox-status' };

const LOCK = '🔒';
const UNLOCK = '🔓';

function makeContext(overrides: Partial<RenderContext> = {}): RenderContext {
    return { ...overrides };
}

describe('SandboxStatusWidget', () => {
    describe('metadata', () => {
        it('has correct display name', () => {
            expect(new SandboxStatusWidget().getDisplayName()).toBe('Sandbox Status');
        });

        it('has correct description', () => {
            expect(new SandboxStatusWidget().getDescription()).toBe('Shows whether Codex is using a sandbox policy');
        });

        it('has correct category', () => {
            expect(new SandboxStatusWidget().getCategory()).toBe('Core');
        });

        it('has green default color', () => {
            expect(new SandboxStatusWidget().getDefaultColor()).toBe('green');
        });

        it('supports raw value', () => {
            expect(new SandboxStatusWidget().supportsRawValue()).toBe(true);
        });

        it('supports colors', () => {
            expect(new SandboxStatusWidget().supportsColors(ITEM)).toBe(true);
        });
    });

    describe('editor configuration', () => {
        it('exposes the format keybind', () => {
            expect(new SandboxStatusWidget().getCustomKeybinds()).toEqual([
                { key: 'f', label: '(f)ormat', action: 'cycle-format' }
            ]);
        });

        it('defaults to glyph in the editor display', () => {
            expect(new SandboxStatusWidget().getEditorDisplay(ITEM)).toEqual({
                displayText: 'Sandbox Status',
                modifierText: '(glyph)'
            });
        });

        it('shows the glyph format for a legacy Nerd Font layout', () => {
            expect(new SandboxStatusWidget().getEditorDisplay({
                ...ITEM,
                metadata: { nerdFont: 'true' }
            })).toEqual({
                displayText: 'Sandbox Status',
                modifierText: '(glyph)'
            });
        });

        it('hides stale Nerd Font metadata in text-only editor displays', () => {
            expect(new SandboxStatusWidget().getEditorDisplay({
                ...ITEM,
                metadata: { format: 'word', nerdFont: 'true' }
            })).toEqual({
                displayText: 'Sandbox Status',
                modifierText: '(word)'
            });
        });

        it('cycles glyph -> text -> word -> glyph', () => {
            const widget = new SandboxStatusWidget();
            const text = widget.handleEditorAction('cycle-format', ITEM);
            const word = widget.handleEditorAction('cycle-format', text ?? ITEM);
            const back = widget.handleEditorAction('cycle-format', word ?? ITEM);

            expect(text?.metadata?.format).toBe('text');
            expect(word?.metadata?.format).toBe('word');
            expect(back?.metadata?.format).toBeUndefined();
        });

        it('clears Nerd Font metadata when cycling to text format', () => {
            const item: WidgetItem = { ...ITEM, metadata: { nerdFont: 'true' } };
            const text = new SandboxStatusWidget().handleEditorAction('cycle-format', item);

            expect(text?.metadata).toEqual({ format: 'text' });
        });

        it('returns null for unknown editor actions', () => {
            expect(new SandboxStatusWidget().handleEditorAction('unknown', ITEM)).toBeNull();
        });
    });

    describe('render() - format glyph (default), standard glyphs', () => {
        it('renders SB: 🔓 when OFF', () => {
            expect(new SandboxStatusWidget().render(ITEM, makeContext({ data: { codex: { sandbox: 'dangerFullAccess' } } }), DEFAULT_SETTINGS)).toBe('SB: 🔓');
        });

        it('renders SB: 🔒 when ON', () => {
            expect(new SandboxStatusWidget().render(ITEM, makeContext({ data: { codex: { sandbox: 'workspaceWrite' } } }), DEFAULT_SETTINGS)).toBe('SB: 🔒');
        });
    });

    describe('render() - format glyph with legacy metadata', () => {
        const NERD_ITEM: WidgetItem = { ...ITEM, metadata: { nerdFont: 'true' } };

        it('renders the unlock glyph when OFF', () => {
            expect(new SandboxStatusWidget().render(NERD_ITEM, makeContext({ data: { codex: { sandbox: 'dangerFullAccess' } } }), DEFAULT_SETTINGS)).toBe(`SB: ${UNLOCK}`);
        });

        it('renders the lock glyph when ON', () => {
            expect(new SandboxStatusWidget().render(NERD_ITEM, makeContext({ data: { codex: { sandbox: 'workspaceWrite' } } }), DEFAULT_SETTINGS)).toBe(`SB: ${LOCK}`);
        });
    });

    describe('render() - format text', () => {
        const FORMAT_ITEM: WidgetItem = { ...ITEM, metadata: { format: 'text' } };

        it('renders SB: OFF when OFF', () => {
            expect(new SandboxStatusWidget().render(FORMAT_ITEM, makeContext({ data: { codex: { sandbox: 'dangerFullAccess' } } }), DEFAULT_SETTINGS)).toBe('SB: OFF');
        });

        it('renders SB: ON when ON', () => {
            expect(new SandboxStatusWidget().render(FORMAT_ITEM, makeContext({ data: { codex: { sandbox: 'workspaceWrite' } } }), DEFAULT_SETTINGS)).toBe('SB: ON');
        });
    });

    describe('render() - format word', () => {
        const FORMAT_ITEM: WidgetItem = { ...ITEM, metadata: { format: 'word' } };

        it('renders Sandbox: OFF when OFF', () => {
            expect(new SandboxStatusWidget().render(FORMAT_ITEM, makeContext({ data: { codex: { sandbox: 'dangerFullAccess' } } }), DEFAULT_SETTINGS)).toBe('Sandbox: OFF');
        });

        it('renders Sandbox: ON when ON', () => {
            expect(new SandboxStatusWidget().render(FORMAT_ITEM, makeContext({ data: { codex: { sandbox: 'workspaceWrite' } } }), DEFAULT_SETTINGS)).toBe('Sandbox: ON');
        });
    });

    describe('render() - preview mode', () => {
        it('renders the ON state for the default format', () => {
            expect(new SandboxStatusWidget().render(ITEM, makeContext({ isPreview: true }), DEFAULT_SETTINGS)).toBe('SB: 🔒');
        });
    });

    describe('render() - missing config', () => {
        it('returns null when there is no reported policy', () => {
            expect(new SandboxStatusWidget().render(ITEM, makeContext(), DEFAULT_SETTINGS)).toBeNull();
        });
    });

    describe('render() - raw value', () => {
        const RAW_ITEM: WidgetItem = { ...ITEM, rawValue: true };
        const cases: { name: string; item: WidgetItem; off: string; on: string }[] = [
            { name: 'glyph', item: RAW_ITEM, off: UNLOCK, on: LOCK },
            {
                name: 'glyph with legacy metadata',
                item: { ...RAW_ITEM, metadata: { nerdFont: 'true' } },
                off: UNLOCK,
                on: LOCK
            },
            {
                name: 'text',
                item: { ...RAW_ITEM, metadata: { format: 'text' } },
                off: 'OFF',
                on: 'ON'
            },
            {
                name: 'word',
                item: { ...RAW_ITEM, metadata: { format: 'word' } },
                off: 'OFF',
                on: 'ON'
            }
        ];

        it.each(cases)('removes only the label from $name format', ({ item, off, on }) => {
            expect(new SandboxStatusWidget().render(item, makeContext({ data: { codex: { sandbox: 'dangerFullAccess' } } }), DEFAULT_SETTINGS)).toBe(off);

            expect(new SandboxStatusWidget().render(item, makeContext({ data: { codex: { sandbox: 'workspaceWrite' } } }), DEFAULT_SETTINGS)).toBe(on);
        });

        it('preserves the default glyph format in preview mode', () => {
            expect(new SandboxStatusWidget().render(RAW_ITEM, makeContext({ isPreview: true }), DEFAULT_SETTINGS)).toBe(LOCK);
        });

        it('returns null when config is null', () => {
            expect(new SandboxStatusWidget().render(RAW_ITEM, makeContext(), DEFAULT_SETTINGS)).toBeNull();
        });
    });
});
