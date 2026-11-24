import type { Settings } from './Settings';
import type {
    WidgetDefinition,
    WidgetItem
} from './WidgetDefinition';

export type { CustomKeybind, HideableState, WidgetEditorDisplay, WidgetItem, WidgetItemType } from './WidgetDefinition';

export interface Widget extends WidgetDefinition { renderEditor?(props: WidgetEditorProps): React.ReactElement | null }

export interface WidgetEditorProps {
    widget: WidgetItem;
    onComplete: (updatedWidget: WidgetItem) => void;
    onCancel: () => void;
    action?: string;
    /** The settings being edited, for editors that depend on them (e.g. the color level). */
    settings?: Settings;
}
