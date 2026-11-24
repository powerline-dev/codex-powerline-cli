import { type RenderContext } from '../types/RenderContext';
import { type Settings } from '../types/Settings';
import type {
    CustomKeybind,
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
import { WIDGET_SYMBOLS } from './shared/symbols';

const FORMATS = ['glyph', 'text', 'word'] as const;
type SandboxFormat = typeof FORMATS[number];

const DEFAULT_FORMAT: SandboxFormat = 'glyph';

const FORMAT_OPTIONS: FormatOptions<SandboxFormat> = {
    formats: FORMATS,
    defaultFormat: DEFAULT_FORMAT
};

function formatStatus(enabled: boolean, format: SandboxFormat, rawValue: boolean): string {
    const stateText = enabled ? 'ON' : 'OFF';
    const glyph = enabled ? WIDGET_SYMBOLS.sandboxLocked : WIDGET_SYMBOLS.sandboxUnlocked;

    switch (format) {
        case 'glyph':
            return rawValue ? glyph : `SB: ${glyph}`;
        case 'text':
            return rawValue ? stateText : `SB: ${stateText}`;
        case 'word':
            return rawValue ? stateText : `Sandbox: ${stateText}`;
    }
}

export class SandboxStatusWidget implements Widget {
    getDefaultColor(): string { return 'green'; }
    getDescription(): string { return 'Shows whether Codex is using a sandbox policy'; }

    getDisplayName(): string { return 'Sandbox Status'; }
    getCategory(): string { return 'Core'; }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return {
            displayText: this.getDisplayName(),
            modifierText: getFormatModifierText(item, FORMAT_OPTIONS)
        };
    }

    handleEditorAction(action: string, item: WidgetItem): WidgetItem | null {
        return handleFormatAction(action, item, FORMAT_OPTIONS);
    }

    render(item: WidgetItem, context: RenderContext, _settings: Settings): string | null {
        const format = getFormat(item, FORMAT_OPTIONS);
        if (context.isPreview) {
            return formatStatus(true, format, item.rawValue ?? false);
        }

        const sandbox = context.data?.codex?.sandbox;
        if (!sandbox) {
            return null;
        }

        return formatStatus(sandbox !== 'dangerFullAccess', format, item.rawValue ?? false);
    }

    getCustomKeybinds(): CustomKeybind[] {
        return getFormatKeybinds();
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(_item: WidgetItem): boolean { return true; }
}
