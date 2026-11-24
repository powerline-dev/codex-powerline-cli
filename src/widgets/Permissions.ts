import type { RenderContext } from '../types/RenderContext.js';
import type { Settings } from '../types/Settings.js';
import type {
    WidgetDefinition,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/WidgetDefinition.js';

import { formatRawOrLabeledValue } from './shared/raw-or-labeled.js';

const LABEL = 'Permissions: ';
const ASK_FOR_APPROVAL = 'Ask for approval';
const APPROVE_FOR_ME = 'Approve for me';
const PROFILE_LABELS = new Map([
    [':read-only', 'Read Only'],
    [':workspace', 'Workspace Write'],
    [':danger-full-access', 'Full Access']
]);
const SANDBOX_LABELS = new Map([
    ['readOnly', 'Read Only'],
    ['workspaceWrite', 'Workspace Write'],
    ['dangerFullAccess', 'Full Access'],
    ['managed', 'Managed Sandbox'],
    ['external', 'External Sandbox'],
    ['externalSandbox', 'External Sandbox']
]);
const SANDBOX_PROFILES = new Map([
    ['readOnly', ':read-only'],
    ['workspaceWrite', ':workspace'],
    ['dangerFullAccess', ':danger-full-access']
]);

function presetLabel(profile?: string, approval?: string, reviewer?: string): string | undefined {
    if (profile === ':danger-full-access' && (!approval || approval === 'never'))
        return 'Full Access';
    if (approval && approval !== 'on-request')
        return undefined;
    if (profile === ':read-only')
        return 'Read Only';
    if (profile !== ':workspace')
        return undefined;
    if (reviewer === 'auto_review' || reviewer === 'guardian_subagent')
        return APPROVE_FOR_ME;
    return !reviewer || reviewer === 'user' ? ASK_FOR_APPROVAL : undefined;
}

export class PermissionsWidget implements WidgetDefinition {
    getDefaultColor(): string { return 'green'; }
    getDescription(): string { return 'Shows the active Codex permission preset or custom profile'; }
    getDisplayName(): string { return 'Permissions'; }
    getCategory(): string { return 'Core'; }
    getLabelPrefix(): string { return LABEL; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        if (context.isPreview) {
            return formatRawOrLabeledValue(item, this.getLabelPrefix(), ASK_FOR_APPROVAL);
        }

        const codex = context.data?.codex;
        const profile = codex?.permission_profile?.trim();
        const displayName = codex?.permission_display_name?.trim();
        const sandbox = codex?.sandbox?.trim();
        const approval = codex?.approval_policy?.trim();
        const activeProfile = profile?.length ? profile : SANDBOX_PROFILES.get(sandbox ?? '');
        const preset = presetLabel(activeProfile, approval, codex?.approvals_reviewer?.trim());
        if (preset)
            return formatRawOrLabeledValue(item, this.getLabelPrefix(), preset);

        const profileName = profile ? PROFILE_LABELS.get(profile) ?? profile : undefined;
        const sandboxName = sandbox ? SANDBOX_LABELS.get(sandbox) ?? sandbox : undefined;
        const mode = [displayName, profileName, sandboxName].find(Boolean);
        const approvalText = approval ? `approval: ${approval}` : '';
        const value = mode && approvalText ? `${mode} (${approvalText})` : mode ?? approvalText;
        return value ? formatRawOrLabeledValue(item, this.getLabelPrefix(), value) : null;
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}
