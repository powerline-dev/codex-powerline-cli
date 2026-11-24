import type { RenderContext } from '../types/RenderContext.js';
import type { Settings } from '../types/Settings.js';
import type {
    WidgetDefinition,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/WidgetDefinition.js';

import { formatRawOrLabeledValue } from './shared/raw-or-labeled.js';

const LABEL = 'Session ID: ';

export class CodexThreadIdWidget implements WidgetDefinition {
    getDefaultColor(): string { return 'cyan'; }
    getDescription(): string { return 'Shows the current Codex thread ID reported in status JSON'; }
    getDisplayName(): string { return 'Codex Thread ID'; }
    getCategory(): string { return 'Core'; }
    getLabelPrefix(): string { return LABEL; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        if (context.isPreview) {
            return formatRawOrLabeledValue(item, this.getLabelPrefix(), 'preview-session-id');
        } else {
            const sessionId = context.data?.session_id;
            if (!sessionId) {
                return null;
            }
            return formatRawOrLabeledValue(item, this.getLabelPrefix(), sessionId);
        }
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}
