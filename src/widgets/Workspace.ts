import type { RenderContext } from '../types/RenderContext.js';
import type { Settings } from '../types/Settings.js';
import type {
    WidgetDefinition,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/WidgetDefinition.js';

import { formatRawOrLabeledValue } from './shared/raw-or-labeled.js';

const LABEL = 'Workspace: ';

export class WorkspaceWidget implements WidgetDefinition {
    getDefaultColor(): string { return 'cyan'; }
    getDescription(): string { return 'Shows the selected ChatGPT workspace name reported by Codex in run mode'; }
    getDisplayName(): string { return 'ChatGPT Workspace'; }
    getCategory(): string { return 'Session'; }
    getLabelPrefix(): string { return LABEL; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const name = context.isPreview ? 'Example Company' : context.data?.codex?.account_workspace_name?.trim();
        return name ? formatRawOrLabeledValue(item, this.getLabelPrefix(), name) : null;
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}
