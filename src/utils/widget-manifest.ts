import type {
    Widget,
    WidgetItemType
} from '../types/Widget';
import * as widgets from '../widgets';

export interface WidgetManifestEntry {
    type: WidgetItemType;
    create: () => Widget;
}

export interface LayoutWidgetManifestEntry {
    type: WidgetItemType;
    displayName: string;
    description: string;
    category: string;
}

export const WIDGET_MANIFEST: WidgetManifestEntry[] = [
    { type: 'model', create: () => new widgets.ModelWidget() },
    { type: 'git-account', create: () => new widgets.GitAccountWidget() },
    { type: 'git-branch', create: () => new widgets.GitBranchWidget() },
    { type: 'git-changes', create: () => new widgets.GitChangesWidget() },
    { type: 'git-insertions', create: () => new widgets.GitInsertionsWidget() },
    { type: 'git-deletions', create: () => new widgets.GitDeletionsWidget() },
    { type: 'git-staged-files', create: () => new widgets.GitStagedFilesWidget() },
    { type: 'git-unstaged-files', create: () => new widgets.GitUnstagedFilesWidget() },
    { type: 'git-untracked-files', create: () => new widgets.GitUntrackedFilesWidget() },
    { type: 'git-clean-status', create: () => new widgets.GitCleanStatusWidget() },
    { type: 'git-root-dir', create: () => new widgets.GitRootDirWidget() },
    { type: 'git-review', create: () => new widgets.GitPrWidget() },
    { type: 'git-ci-status', create: () => new widgets.GitCiStatusWidget() },
    { type: 'git-worktree', create: () => new widgets.GitWorktreeWidget() },
    { type: 'git-status', create: () => new widgets.GitStatusWidget() },
    { type: 'git-staged', create: () => new widgets.GitStagedWidget() },
    { type: 'git-unstaged', create: () => new widgets.GitUnstagedWidget() },
    { type: 'git-untracked', create: () => new widgets.GitUntrackedWidget() },
    { type: 'git-ahead-behind', create: () => new widgets.GitAheadBehindWidget() },
    { type: 'git-conflicts', create: () => new widgets.GitConflictsWidget() },
    { type: 'git-sha', create: () => new widgets.GitShaWidget() },
    { type: 'git-origin-owner', create: () => new widgets.GitOriginOwnerWidget() },
    { type: 'git-origin-repo', create: () => new widgets.GitOriginRepoWidget() },
    { type: 'git-origin-owner-repo', create: () => new widgets.GitOriginOwnerRepoWidget() },
    { type: 'git-upstream-owner', create: () => new widgets.GitUpstreamOwnerWidget() },
    { type: 'git-upstream-repo', create: () => new widgets.GitUpstreamRepoWidget() },
    { type: 'git-upstream-owner-repo', create: () => new widgets.GitUpstreamOwnerRepoWidget() },
    { type: 'git-is-fork', create: () => new widgets.GitIsForkWidget() },
    { type: 'jj-bookmarks', create: () => new widgets.JjBookmarksWidget() },
    { type: 'jj-workspace', create: () => new widgets.JjWorkspaceWidget() },
    { type: 'jj-root-dir', create: () => new widgets.JjRootDirWidget() },
    { type: 'jj-changes', create: () => new widgets.JjChangesWidget() },
    { type: 'jj-insertions', create: () => new widgets.JjInsertionsWidget() },
    { type: 'jj-deletions', create: () => new widgets.JjDeletionsWidget() },
    { type: 'jj-description', create: () => new widgets.JjDescriptionWidget() },
    { type: 'jj-revision', create: () => new widgets.JjRevisionWidget() },
    { type: 'current-working-dir', create: () => new widgets.CurrentWorkingDirWidget() },
    { type: 'workspace', create: () => new widgets.WorkspaceWidget() },
    { type: 'tokens-input', create: () => new widgets.TokensInputWidget() },
    { type: 'tokens-output', create: () => new widgets.TokensOutputWidget() },
    { type: 'tokens-cached', create: () => new widgets.TokensCachedWidget() },
    { type: 'tokens-total', create: () => new widgets.TokensTotalWidget() },
    { type: 'cache-hit-rate', create: () => new widgets.CacheHitRateWidget() },
    { type: 'cache-read', create: () => new widgets.CacheReadWidget() },
    { type: 'cache-write', create: () => new widgets.CacheWriteWidget() },
    { type: 'context-length', create: () => new widgets.ContextLengthWidget() },
    { type: 'context-window', create: () => new widgets.ContextWindowWidget() },
    { type: 'context-percentage', create: () => new widgets.ContextPercentageWidget() },
    { type: 'session-clock', create: () => new widgets.SessionClockWidget() },
    { type: 'session-cost', create: () => new widgets.SessionCostWidget() },
    { type: 'terminal-width', create: () => new widgets.TerminalWidthWidget() },
    { type: 'version', create: () => new widgets.VersionWidget() },
    { type: 'custom-text', create: () => new widgets.CustomTextWidget() },
    { type: 'empty', create: () => new widgets.EmptyWidget() },
    { type: 'custom-symbol', create: () => new widgets.CustomSymbolWidget() },
    { type: 'custom-command', create: () => new widgets.CustomCommandWidget() },
    { type: 'link', create: () => new widgets.LinkWidget() },
    { type: 'codex-thread-id', create: () => new widgets.CodexThreadIdWidget() },
    { type: 'codex-account-email', create: () => new widgets.CodexAccountEmailWidget() },
    { type: 'sandbox-status', create: () => new widgets.SandboxStatusWidget() },
    { type: 'permissions', create: () => new widgets.PermissionsWidget() },
    { type: 'session-name', create: () => new widgets.SessionNameWidget() },
    { type: 'chat-status', create: () => new widgets.ChatStatusWidget() },
    { type: 'free-memory', create: () => new widgets.FreeMemoryWidget() },
    { type: 'session-usage', create: () => new widgets.SessionUsageWidget() },
    { type: 'weekly-usage', create: () => new widgets.WeeklyUsageWidget() },
    { type: 'weekly-limit-timer', create: () => new widgets.WeeklyLimitTimerWidget() },
    { type: 'reset-timer', create: () => new widgets.BlockResetTimerWidget() },
    { type: 'weekly-reset-timer', create: () => new widgets.WeeklyResetTimerWidget() },
    { type: 'context-bar', create: () => new widgets.ContextBarWidget() },
    { type: 'thinking-effort', create: () => new widgets.ThinkingEffortWidget() },
    { type: 'fast-mode', create: () => new widgets.FastModeWidget() },
    { type: 'compaction-counter', create: () => new widgets.CompactionCounterWidget() }
];

export const LAYOUT_WIDGET_MANIFEST: LayoutWidgetManifestEntry[] = [
    {
        type: 'separator',
        displayName: 'Separator',
        description: 'A separator character between status line widgets',
        category: 'Layout'
    },
    {
        type: 'flex-separator',
        displayName: 'Flex Separator',
        description: 'Expands to fill available terminal width',
        category: 'Layout'
    }
];
