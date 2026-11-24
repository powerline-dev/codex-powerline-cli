import { type RenderContext } from '../types/RenderContext';
import { type Settings } from '../types/Settings';
import type {
    CustomKeybind,
    HideableState,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

import {
    getFormat,
    getFormatKeybinds,
    getFormatModifierText,
    handleFormatAction,
    type FormatOptions
} from './shared/format-options';
import { isHidden } from './shared/hideable';
import { WIDGET_SYMBOLS } from './shared/symbols';

const STATE_DOT_OFF = '○';
const STATE_DOT_ON = '◉';

const FORMATS = ['icon-text', 'icon', 'text', 'word'] as const;
type FastModeFormat = typeof FORMATS[number];

const DEFAULT_FORMAT: FastModeFormat = 'icon-text';

const OFF_HIDEABLE_STATE: HideableState = { key: 'off', label: 'when fast mode is off' };

const FORMAT_OPTIONS: FormatOptions<FastModeFormat> = {
    formats: FORMATS,
    defaultFormat: DEFAULT_FORMAT
};

function formatStatus(enabled: boolean, format: FastModeFormat, rawValue: boolean): string {
    const stateText = enabled ? 'on' : 'off';
    const stateDot = enabled ? STATE_DOT_ON : STATE_DOT_OFF;
    const icon = WIDGET_SYMBOLS.fastMode;

    switch (format) {
        case 'icon-text':
            return rawValue ? stateText : `${icon} ${stateText}`;
        case 'icon':
            return rawValue ? stateDot : `${icon} ${stateDot}`;
        case 'text':
            return stateText;
        case 'word':
            return rawValue ? stateText : `fast ${stateText}`;
    }
}

export class FastModeWidget implements Widget {
    getDefaultColor(): string { return 'yellow'; }
    getDescription(): string { return 'Shows whether Codex fast mode is on'; }
    getDisplayName(): string { return 'Fast Mode'; }
    getCategory(): string { return 'Core'; }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return {
            displayText: this.getDisplayName(),
            modifierText: getFormatModifierText(item, FORMAT_OPTIONS)
        };
    }

    getHideableStates(): HideableState[] {
        return [OFF_HIDEABLE_STATE];
    }

    handleEditorAction(action: string, item: WidgetItem): WidgetItem | null {
        return handleFormatAction(action, item, FORMAT_OPTIONS);
    }

    render(item: WidgetItem, context: RenderContext, _settings: Settings): string | null {
        const format = getFormat(item, FORMAT_OPTIONS);
        if (context.isPreview) {
            return formatStatus(true, format, item.rawValue ?? false);
        }

        // Absent before Codex reported it
        const enabled = context.data?.fast_mode;
        if (typeof enabled !== 'boolean') {
            return null;
        }
        if (!enabled && isHidden(item, OFF_HIDEABLE_STATE.key)) {
            return null;
        }

        return formatStatus(enabled, format, item.rawValue ?? false);
    }

    getCustomKeybinds(): CustomKeybind[] {
        return getFormatKeybinds();
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(_item: WidgetItem): boolean { return true; }
}
