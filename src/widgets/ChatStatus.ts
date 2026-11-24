import type { RenderContext } from '../types/RenderContext.js';
import type { StatusJSON } from '../types/StatusJSON.js';
import type {
    WidgetDefinition,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/WidgetDefinition.js';

import { formatRawOrLabeledValue } from './shared/raw-or-labeled.js';

const STATUS_LABELS: Record<NonNullable<StatusJSON['chat_status']>, string> = {
    idle: 'Idle',
    running: 'Running',
    waiting_for_approval: 'Waiting for approval',
    waiting_for_input: 'Waiting for input',
    completed: 'Completed',
    interrupted: 'Interrupted',
    failed: 'Failed'
};

export class ChatStatusWidget implements WidgetDefinition {
    getDefaultColor(): string { return 'cyan'; }
    getDescription(): string { return 'Shows whether the active Codex chat is running, waiting, or finished'; }
    getDisplayName(): string { return 'Chat Status'; }
    getCategory(): string { return 'Session'; }
    getLabelPrefix(): string { return 'Chat: '; }
    getEditorDisplay(): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext): string | null {
        const status = context.isPreview ? 'running' : context.data?.chat_status;
        return status ? formatRawOrLabeledValue(item, this.getLabelPrefix(), STATUS_LABELS[status]) : null;
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(): boolean { return true; }
}
