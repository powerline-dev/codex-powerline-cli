import {
    removeMetadataKeys,
    setWidgetFormat
} from '@powerline-dev/codex-powerline-core';

import type {
    CustomKeybind,
    WidgetItem
} from '../../types/Widget';

export const CYCLE_FORMAT_ACTION = 'cycle-format';

export interface FormatOptions<TFormat extends string> {
    formats: readonly TFormat[];
    defaultFormat: TFormat;
}

export function getFormat<TFormat extends string>(item: WidgetItem, options: FormatOptions<TFormat>): TFormat {
    const format = item.metadata?.format;
    return (options.formats as readonly string[]).includes(format ?? '') ? (format as TFormat) : options.defaultFormat;
}

export function getFormatModifierText<TFormat extends string>(item: WidgetItem, options: FormatOptions<TFormat>): string {
    return `(${getFormat(item, options)})`;
}

export function handleFormatAction<TFormat extends string>(action: string, item: WidgetItem, options: FormatOptions<TFormat>): WidgetItem | null {
    if (action === CYCLE_FORMAT_ACTION) {
        const currentFormat = getFormat(item, options);
        const nextFormat = options.formats[(options.formats.indexOf(currentFormat) + 1) % options.formats.length] ?? options.defaultFormat;
        return setWidgetFormat(removeMetadataKeys(item, ['nerdFont']), nextFormat, options.defaultFormat);
    }

    return null;
}

export function getFormatKeybinds(): CustomKeybind[] {
    return [
        { key: 'f', label: '(f)ormat', action: CYCLE_FORMAT_ACTION }
    ];
}
