import {
    isNerdFontEnabled,
    type RenderContext,
    type Settings
} from '@powerline-dev/codex-powerline-core';

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

const DOT_ON = '●';
const DOT_OFF = '○';
const LOCK_NERD_FONT = '';
const UNLOCK_NERD_FONT = '';

const FORMATS = ['glyph', 'text', 'word'] as const;
type SandboxFormat = typeof FORMATS[number];

const DEFAULT_FORMAT: SandboxFormat = 'glyph';

function canUseNerdFont(item: WidgetItem): boolean {
    return getFormat(item, FORMAT_OPTIONS) === 'glyph';
}

const FORMAT_OPTIONS: FormatOptions<SandboxFormat> = {
    formats: FORMATS,
    defaultFormat: DEFAULT_FORMAT,
    canUseNerdFont
};

function formatStatus(enabled: boolean, format: SandboxFormat, nerdFont: boolean, rawValue: boolean): string {
    const stateText = enabled ? 'ON' : 'OFF';
    const glyph = nerdFont
        ? (enabled ? LOCK_NERD_FONT : UNLOCK_NERD_FONT)
        : (enabled ? DOT_ON : DOT_OFF);

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
        const nerdFont = isNerdFontEnabled(item, FORMAT_OPTIONS);

        if (context.isPreview) {
            return formatStatus(true, format, nerdFont, item.rawValue ?? false);
        }

        const sandbox = context.data?.codex?.sandbox;
        if (!sandbox) {
            return null;
        }

        return formatStatus(sandbox !== 'dangerFullAccess', format, nerdFont, item.rawValue ?? false);
    }

    getCustomKeybinds(item?: WidgetItem): CustomKeybind[] {
        return getFormatKeybinds(item, FORMAT_OPTIONS);
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(_item: WidgetItem): boolean { return true; }
}
