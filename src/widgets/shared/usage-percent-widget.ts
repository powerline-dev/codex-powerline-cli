import {
    formatPercent,
    formatRawOrLabeledValue,
    isHidden,
    resolveNumberFormat,
    type NumberFormat,
    type RenderContext,
    type RenderUsageData,
    type Settings,
    type UsageWindowMetrics
} from 'codex-powerline-core';

import type {
    CustomKeybind,
    HideableState,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../../types/Widget';
import {
    getUsageErrorMessage,
    resolveUsageWindowWithFallback,
    resolveWeeklyUsageWindow
} from '../../utils/usage';

import {
    USAGE_NO_DATA_HIDEABLE_STATE,
    cycleUsageDisplayMode,
    formatUsageBar,
    getUsageDisplayModifierText,
    getUsagePercentCustomKeybinds,
    isUsageCursorEnabled,
    isUsageInverted,
    toggleUsageCursor,
    toggleUsageInverted
} from './usage-display';

export type UsagePercentWidgetKind = 'session' | 'weekly';

type UsagePercentField = 'sessionUsage' | 'weeklyUsage';

interface UsageCursorOptions { cursorPercent: number }

interface UsagePercentWidgetKindConfig {
    label: string;
    displayName: string;
    description: string;
    previewPercent: number;
    usageField: UsagePercentField;
}

const USAGE_PERCENT_WIDGET_CONFIG: Record<UsagePercentWidgetKind, UsagePercentWidgetKindConfig> = {
    session: {
        label: '5h: ',
        displayName: 'Block Usage',
        description: 'Shows the current 5-hour block\'s usage percentage',
        previewPercent: 20,
        usageField: 'sessionUsage'
    },
    weekly: {
        label: 'Weekly: ',
        displayName: 'Weekly Usage',
        description: 'Shows weekly API usage percentage',
        previewPercent: 12,
        usageField: 'weeklyUsage'
    }
};

// The session window also consults block metrics, so the resolvers take different
// arguments and are picked per call rather than stored alongside the config.
function resolveUsageWindow(kind: UsagePercentWidgetKind, data: RenderUsageData, context: RenderContext): UsageWindowMetrics | null {
    return kind === 'session'
        ? resolveUsageWindowWithFallback(data, context.blockMetrics)
        : resolveWeeklyUsageWindow(data);
}

function renderUsageDisplay(
    item: WidgetItem,
    label: string,
    percent: number,
    format: NumberFormat,
    getCursorOptions: () => UsageCursorOptions | undefined
): string {
    const bar = formatUsageBar(item, percent, format, getCursorOptions);
    return formatRawOrLabeledValue(item, label, bar ?? formatPercent(percent, format));
}

export function getUsagePercentWidgetDisplayName(kind: UsagePercentWidgetKind): string {
    return USAGE_PERCENT_WIDGET_CONFIG[kind].displayName;
}

export function getUsagePercentWidgetLabel(kind: UsagePercentWidgetKind): string {
    return USAGE_PERCENT_WIDGET_CONFIG[kind].label;
}

export function getUsagePercentWidgetDescription(kind: UsagePercentWidgetKind): string {
    return USAGE_PERCENT_WIDGET_CONFIG[kind].description;
}

export function getUsagePercentWidgetEditorDisplay(kind: UsagePercentWidgetKind, item: WidgetItem): WidgetEditorDisplay {
    return {
        displayText: getUsagePercentWidgetDisplayName(kind),
        modifierText: getUsageDisplayModifierText(item, { showUsageDirection: true, includeCursor: true })
    };
}

export function handleUsagePercentWidgetEditorAction(action: string, item: WidgetItem): WidgetItem | null {
    if (action === 'toggle-progress') {
        return cycleUsageDisplayMode(item, [], true, true);
    }

    if (action === 'toggle-invert') {
        return toggleUsageInverted(item);
    }

    if (action === 'toggle-cursor') {
        return toggleUsageCursor(item);
    }

    return null;
}

export function renderUsagePercentWidgetValue(
    kind: UsagePercentWidgetKind,
    item: WidgetItem,
    context: RenderContext,
    settings: Settings
): string | null {
    const config = USAGE_PERCENT_WIDGET_CONFIG[kind];
    const inverted = isUsageInverted(item);
    const showCursor = isUsageCursorEnabled(item);
    const format = resolveNumberFormat('percent', item, settings);

    if (context.isPreview) {
        const renderedPercent = inverted ? 100 - config.previewPercent : config.previewPercent;
        return renderUsageDisplay(item, config.label, renderedPercent, format, () => showCursor ? { cursorPercent: 50 } : undefined);
    }

    const data: RenderUsageData = context.usageData ?? {};
    const usagePercent = data[config.usageField];
    if (usagePercent === undefined) {
        if (data.error) {
            return isHidden(item, USAGE_NO_DATA_HIDEABLE_STATE.key)
                ? null
                : getUsageErrorMessage(data.error);
        }
        return null;
    }

    const percent = Math.max(0, Math.min(100, usagePercent));
    const renderedPercent = inverted ? 100 - percent : percent;

    return renderUsageDisplay(item, config.label, renderedPercent, format, () => {
        if (!showCursor) {
            return undefined;
        }

        // A remaining-percent bar shrinks as the window runs out, so its cursor
        // marks the time left, keeping the cursor and the fill on one scale.
        const window = resolveUsageWindow(kind, data, context);
        if (!window) {
            return undefined;
        }
        return { cursorPercent: inverted ? window.remainingPercent : window.elapsedPercent };
    });
}

export class UsagePercentWidget implements Widget {
    private readonly kind: UsagePercentWidgetKind;

    constructor(kind: UsagePercentWidgetKind) {
        this.kind = kind;
    }

    getDefaultColor(): string { return 'brightBlue'; }
    getDescription(): string { return getUsagePercentWidgetDescription(this.kind); }
    getDisplayName(): string { return getUsagePercentWidgetDisplayName(this.kind); }
    getCategory(): string { return 'Usage'; }
    getLabelPrefix(): string { return getUsagePercentWidgetLabel(this.kind); }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return getUsagePercentWidgetEditorDisplay(this.kind, item);
    }

    getHideableStates(): HideableState[] {
        return [USAGE_NO_DATA_HIDEABLE_STATE];
    }

    handleEditorAction(action: string, item: WidgetItem): WidgetItem | null {
        return handleUsagePercentWidgetEditorAction(action, item);
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        return renderUsagePercentWidgetValue(this.kind, item, context, settings);
    }

    getCustomKeybinds(item?: WidgetItem): CustomKeybind[] {
        return getUsagePercentCustomKeybinds(item, true);
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
    supportsNumberFormat(): boolean { return true; }
}
