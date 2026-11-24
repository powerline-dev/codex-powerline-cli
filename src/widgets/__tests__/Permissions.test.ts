import {
    describe,
    expect,
    it
} from 'vitest';

import { DEFAULT_SETTINGS } from '../../types/Settings';
import { StatusJSONSchema } from '../../types/StatusJSON';
import type { WidgetItem } from '../../types/Widget';
import { PermissionsWidget } from '../Permissions';

const ITEM: WidgetItem = { id: 'permissions', type: 'permissions' };
const widget = new PermissionsWidget();

describe('PermissionsWidget', () => {
    it.each([
        [':workspace', 'workspaceWrite', 'on-request', 'user', 'Ask for approval'],
        [':workspace', 'workspaceWrite', 'on-request', 'auto_review', 'Approve for me'],
        [undefined, 'workspaceWrite', 'on-request', 'guardian_subagent', 'Approve for me'],
        [undefined, 'workspaceWrite', 'on-request', undefined, 'Ask for approval'],
        [':danger-full-access', 'dangerFullAccess', 'never', 'user', 'Full Access'],
        [undefined, 'dangerFullAccess', 'never', undefined, 'Full Access'],
        [':read-only', 'readOnly', 'on-request', 'user', 'Read Only'],
        [undefined, 'readOnly', 'on-request', undefined, 'Read Only']
    ])('renders %s / %s with approval policy %s and reviewer %s as %s', (profile, sandbox, policy, reviewer, label) => {
        const codex = { permission_profile: profile, sandbox, approval_policy: policy, approvals_reviewer: reviewer };
        const data = StatusJSONSchema.parse({ codex });
        expect(widget.render(ITEM, { data }, DEFAULT_SETTINGS)).toBe(`Permissions: ${label}`);
        expect(widget.render({ ...ITEM, rawValue: true }, { data }, DEFAULT_SETTINGS)).toBe(label);
    });

    it('preserves custom profiles and nonpreset approval policies', () => {
        const customProfile = { permission_profile: 'restricted', permission_display_name: 'Restricted', sandbox: 'workspaceWrite' };
        const customPolicy = { sandbox: 'workspaceWrite', approval_policy: 'never' };
        expect(widget.render(ITEM, { data: { codex: customProfile } }, DEFAULT_SETTINGS)).toBe('Permissions: Restricted');
        expect(widget.render(ITEM, { data: { codex: customPolicy } }, DEFAULT_SETTINGS)).toBe('Permissions: Workspace Write (approval: never)');
    });

    it('shows a standard mode in preview and hides missing data in live output', () => {
        expect(widget.render(ITEM, { isPreview: true }, DEFAULT_SETTINGS)).toBe('Permissions: Ask for approval');
        expect(widget.render(ITEM, {}, DEFAULT_SETTINGS)).toBeNull();
    });
});
