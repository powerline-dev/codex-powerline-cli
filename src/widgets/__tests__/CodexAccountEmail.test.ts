import {
    describe,
    expect,
    it
} from 'vitest';

import { DEFAULT_SETTINGS } from '../../types/Settings.js';
import { CodexAccountEmailWidget } from '../CodexAccountEmail.js';

describe('CodexAccountEmailWidget', () => {
    const widget = new CodexAccountEmailWidget();
    const item = { id: 'account', type: 'codex-account-email' };

    it('shows the active Codex account email when reported', () => {
        const context = { data: { codex: { account_email: 'user@example.com' } } };
        expect(widget.render(item, context, DEFAULT_SETTINGS)).toBe('Account: user@example.com');
        expect(widget.render({ ...item, rawValue: true }, context, DEFAULT_SETTINGS)).toBe('user@example.com');
    });

    it('shows no account email if the provider did not report one', () => {
        expect(widget.render(item, { data: { codex: {} } }, DEFAULT_SETTINGS)).toBeNull();
    });

    it('does not need account data in the editor preview', () => {
        expect(widget.render(item, { isPreview: true }, DEFAULT_SETTINGS)).toBe('Account: you@example.com');
    });
});
