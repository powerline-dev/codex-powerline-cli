import {
    describe,
    expect,
    it
} from 'vitest';

import type { WidgetItem } from '../../../types/Widget';
import {
    CYCLE_FORMAT_ACTION,
    getFormat,
    getFormatKeybinds,
    getFormatModifierText,
    handleFormatAction,
    type FormatOptions
} from '../format-options';

type TestFormat = 'icon' | 'text' | 'word';
const options: FormatOptions<TestFormat> = {
    formats: ['icon', 'text', 'word'],
    defaultFormat: 'icon'
};
const item = (metadata?: Record<string, string>): WidgetItem => ({ id: 'w', type: 'voice-status', metadata });

describe('format options', () => {
    it('reads the format, falling back to the default', () => {
        expect(getFormat(item(), options)).toBe('icon');
        expect(getFormat(item({ format: 'word' }), options)).toBe('word');
        expect(getFormat(item({ format: 'bogus' }), options)).toBe('icon');
    });

    it('cycles the format with (f), wrapping around', () => {
        const cycled = [item()];
        for (let press = 0; press < 3; press++) {
            const next = handleFormatAction(CYCLE_FORMAT_ACTION, cycled.at(-1) ?? item(), options);
            if (next) {
                cycled.push(next);
            }
        }
        expect(cycled.map(state => getFormat(state, options))).toEqual(['icon', 'text', 'word', 'icon']);
    });

    it('removes the old icon flag while preserving unrelated metadata', () => {
        const legacy = item({ nerdFont: 'true', label: 'example' });
        expect(getFormatModifierText(legacy, options)).toBe('(icon)');
        const next = handleFormatAction(CYCLE_FORMAT_ACTION, legacy, options);
        expect(next?.metadata).toEqual({ format: 'text', label: 'example' });
    });

    it('ignores other actions', () => {
        expect(handleFormatAction('toggle-something-else', item(), options)).toBeNull();
    });

    it('offers the format keybind', () => {
        expect(getFormatKeybinds().map(keybind => keybind.key)).toEqual(['f']);
    });
});
