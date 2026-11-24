import {
    formatRawOrLabeledValue,
    type RenderContext
} from '@powerline-dev/codex-powerline-core';

import type { WidgetItem } from '../types/Widget';
import { runGitArgs } from '../utils/git';

import { GitStatusWidgetBase } from './shared/git-status-widget';

export class GitAccountWidget extends GitStatusWidgetBase {
    getDefaultColor(): string { return 'blue'; }
    getDescription(): string {
        return 'Shows this project’s configured Git identity (email or name); push authentication may differ';
    }

    getDisplayName(): string { return 'Git Account'; }
    getLabelPrefix(): string { return 'Git: '; }
    supportsRawValue(): boolean { return true; }

    protected renderPreview(item: WidgetItem): string {
        return formatRawOrLabeledValue(item, this.getLabelPrefix(), 'you@work.com');
    }

    protected renderInWorkTree(item: WidgetItem, context: RenderContext): string | null {
        // Let Git resolve system, global, conditional include, local and
        // worktree settings in the active project, rather than reading a
        // particular config file or assuming the remote owner is the user.
        const email = runGitArgs(['config', '--get', 'user.email'], context)?.trim() ?? '';
        const identity = email.length > 0 ? email : runGitArgs(['config', '--get', 'user.name'], context)?.trim();
        return identity ? formatRawOrLabeledValue(item, this.getLabelPrefix(), identity) : null;
    }
}
