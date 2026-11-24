import type { RenderContext } from '../types/RenderContext.js';
import type { Settings } from '../types/Settings.js';
import type {
    WidgetDefinition,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/WidgetDefinition.js';
import { getContextWindowContextLengthTokens } from '../utils/context-window.js';
import { formatTokens } from '../utils/format-tokens.js';
import { resolveNumberFormat } from '../utils/number-format.js';

import { formatRawOrLabeledValue } from './shared/raw-or-labeled.js';

const LABEL = 'Ctx: ';

export class ContextLengthWidget implements WidgetDefinition {
    getDefaultColor(): string { return 'brightBlack'; }
    getDescription(): string { return 'Shows the current context window size in tokens'; }
    getDisplayName(): string { return 'Context Length'; }
    getCategory(): string { return 'Context'; }
    getLabelPrefix(): string { return LABEL; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const format = resolveNumberFormat('token', item, settings);
        if (context.isPreview) {
            const value = formatTokens(18600, format);
            return formatRawOrLabeledValue(item, this.getLabelPrefix(), value);
        }

        const contextLengthTokens = getContextWindowContextLengthTokens(context.data);
        if (contextLengthTokens !== null) {
            return formatRawOrLabeledValue(item, this.getLabelPrefix(), formatTokens(contextLengthTokens, format));
        }

        if (context.tokenMetrics) {
            return formatRawOrLabeledValue(item, this.getLabelPrefix(), formatTokens(context.tokenMetrics.contextLength, format));
        }
        return null;
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
    supportsNumberFormat(): boolean { return true; }
}
