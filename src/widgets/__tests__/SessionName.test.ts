import {
    describe,
    expect,
    it
} from 'vitest';

import { DEFAULT_SETTINGS } from '../../types/Settings.js';
import { SessionNameWidget } from '../SessionName.js';

describe('SessionNameWidget', () => {
    const widget = new SessionNameWidget();
    const item = { id: 'session-name', type: 'session-name' };

    it('shows the title reported by Codex', () => {
        const context = { data: { codex: { session_name: 'My Project' } } };
        expect(widget.render(item, context, DEFAULT_SETTINGS)).toBe('Session: My Project');
        expect(widget.render({ ...item, rawValue: true }, context, DEFAULT_SETTINGS)).toBe('My Project');
    });

    it('hides the widget if Codex has not reported a title', () => {
        expect(widget.render(item, { data: { codex: {} } }, DEFAULT_SETTINGS)).toBeNull();
    });

    it('provides a preview without a live thread', () => {
        expect(widget.render(item, { isPreview: true }, DEFAULT_SETTINGS)).toBe('Session: my-session');
    });
});
