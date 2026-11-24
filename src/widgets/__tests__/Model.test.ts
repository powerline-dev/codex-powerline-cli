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
import { ModelWidget } from '../Model';

const ITEM: WidgetItem = { id: 'model', type: 'model' };
const RAW_ITEM: WidgetItem = { id: 'model', type: 'model', rawValue: true };

function makeContext(overrides: Partial<RenderContext> = {}): RenderContext {
    return { ...overrides };
}

describe('ModelWidget', () => {
    describe('render()', () => {
        it('strips parenthetical suffix from display_name', () => {
            const ctx = makeContext({ data: { model: { id: 'example-large-model[1m]', display_name: 'Example Large (1M context)' } } });
            expect(new ModelWidget().render(RAW_ITEM, ctx, DEFAULT_SETTINGS)).toBe('Example Large');
        });

        it('strips parenthetical from the model display_name', () => {
            const ctx = makeContext({ data: { model: { id: 'example-small-model', display_name: 'Example Small (200K context)' } } });
            expect(new ModelWidget().render(RAW_ITEM, ctx, DEFAULT_SETTINGS)).toBe('Example Small');
        });

        it('leaves name unchanged when no parenthetical', () => {
            const ctx = makeContext({ data: { model: { id: 'example-small-model', display_name: 'Example Small' } } });
            expect(new ModelWidget().render(RAW_ITEM, ctx, DEFAULT_SETTINGS)).toBe('Example Small');
        });

        it('handles model as string (legacy)', () => {
            const ctx = makeContext({ data: { model: 'Example Large (1M context)' } });
            expect(new ModelWidget().render(RAW_ITEM, ctx, DEFAULT_SETTINGS)).toBe('Example Large');
        });

        it('includes Model: prefix when rawValue is false', () => {
            const ctx = makeContext({ data: { model: { id: 'example-large-model[1m]', display_name: 'Example Large (1M context)' } } });
            expect(new ModelWidget().render(ITEM, ctx, DEFAULT_SETTINGS)).toBe('Model: Example Large');
        });

        it('returns null when model is absent', () => {
            const ctx = makeContext({ data: {} });
            expect(new ModelWidget().render(ITEM, ctx, DEFAULT_SETTINGS)).toBeNull();
        });

        it('returns null when context.data is absent', () => {
            const ctx = makeContext();
            expect(new ModelWidget().render(ITEM, ctx, DEFAULT_SETTINGS)).toBeNull();
        });

        it('returns preview text in preview mode', () => {
            const ctx = makeContext({ isPreview: true });
            expect(new ModelWidget().render(ITEM, ctx, DEFAULT_SETTINGS)).toBe('Model: gpt-6.2-sol');
            expect(new ModelWidget().render(RAW_ITEM, ctx, DEFAULT_SETTINGS)).toBe('gpt-6.2-sol');
        });

        it('uses the label override in place of the default label', () => {
            const ctx = makeContext({ data: { model: { id: 'example-large-model', display_name: 'Example Large' } } });
            expect(new ModelWidget().render({ ...ITEM, metadata: { label: 'M ' } }, ctx, DEFAULT_SETTINGS)).toBe('M Example Large');
        });

        it('falls back to model id when display_name is absent', () => {
            const ctx = makeContext({ data: { model: { id: 'example-large-model[1m]' } } });
            expect(new ModelWidget().render(RAW_ITEM, ctx, DEFAULT_SETTINGS)).toBe('example-large-model[1m]');
        });
    });
});
