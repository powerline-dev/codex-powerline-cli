import type {
    Widget,
    WidgetEditorDisplay
} from '../types/Widget';

export class EmptyWidget implements Widget {
    getDefaultColor(): string { return 'white'; }
    getDescription(): string { return 'Leaves a blank cell with the terminal background, even in a Powerline theme'; }
    getDisplayName(): string { return 'Empty'; }
    getCategory(): string { return 'Layout'; }
    getEditorDisplay(): WidgetEditorDisplay { return { displayText: this.getDisplayName() }; }

    render(): string { return ' '; }

    supportsRawValue(): boolean { return false; }
    supportsColors(): boolean { return false; }
}
