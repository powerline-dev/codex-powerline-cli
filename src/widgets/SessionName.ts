import type { RenderContext } from '../types/RenderContext.js';
import type { Settings } from '../types/Settings.js';
import type {
    WidgetDefinition,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/WidgetDefinition.js';

import { formatRawOrLabeledValue } from './shared/raw-or-labeled.js';

const LABEL = 'Session: ';

export class SessionNameWidget implements WidgetDefinition {
    getDefaultColor(): string { return 'cyan'; }
    getDescription(): string { return 'Shows the session name reported by Codex'; }
    getDisplayName(): string { return 'Session Name'; }
    getCategory(): string { return 'Session'; }
    getLabelPrefix(): string { return LABEL; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        if (context.isPreview) {
            return formatRawOrLabeledValue(item, this.getLabelPrefix(), 'my-session');
        }

        const sessionName = context.data?.codex?.session_name;
        if (!sessionName) {
            return null;
        }

        return formatRawOrLabeledValue(item, this.getLabelPrefix(), sessionName);
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}
