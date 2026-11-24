import type { RenderContext } from '../types/RenderContext.js';
import type { Settings } from '../types/Settings.js';
import type {
    WidgetDefinition,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/WidgetDefinition.js';

import { formatRawOrLabeledValue } from './shared/raw-or-labeled.js';

const LABEL = 'Model: ';

export class ModelWidget implements WidgetDefinition {
    getDefaultColor(): string { return 'cyan'; }
    getDescription(): string { return 'Displays the current Codex model'; }
    getDisplayName(): string { return 'Model'; }
    getCategory(): string { return 'Core'; }
    getLabelPrefix(): string { return LABEL; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        if (context.isPreview) {
            return formatRawOrLabeledValue(item, this.getLabelPrefix(), 'gpt-6.2-sol');
        }

        const model = context.data?.model;
        const modelDisplayName = typeof model === 'string'
            ? model
            : (model?.display_name ?? model?.id);

        if (modelDisplayName) {
            const shortName = modelDisplayName.replace(/\s*\(.*\)$/, '');
            return formatRawOrLabeledValue(item, this.getLabelPrefix(), shortName);
        }
        return null;
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}
