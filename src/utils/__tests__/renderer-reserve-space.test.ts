import {
    SettingsSchema,
    type StatusJSON
} from '@powerline-dev/codex-powerline-core';
import {
    describe,
    expect,
    it
} from 'vitest';

import {
    getVisibleText,
    getVisibleWidth
} from '../ansi';
import { renderCodexStatus } from '../status-render';

const chat: StatusJSON = { context_window: { current_usage: 34000, context_window_size: 200000 } };

describe('reserve widget space', () => {
    it.each([false, true])('keeps the Context Bar column with Powerline enabled: %s', (powerline) => {
        const settings = SettingsSchema.parse({
            colorLevel: 3,
            defaultPadding: ' ',
            lines: [
                [
                    { id: 'bar', type: 'context-bar', reserveSpace: true, merge: 'no-padding' },
                    { id: 'space', type: 'custom-text', customText: ' ' },
                    { id: 'tail', type: 'custom-text', customText: 'following' }
                ],
                [
                    { id: 'window', type: 'context-window' },
                    { id: 'tail-2', type: 'custom-text', customText: 'following' }
                ]
            ],
            powerline: { enabled: powerline, autoAlign: true, theme: 'catppuccin' }
        });
        const render = (data: StatusJSON) => renderCodexStatus(data, settings, 160).map(getVisibleText);
        const followingColumn = (line: string) => getVisibleWidth(line.slice(0, line.indexOf('following')));

        const [emptyBar = '', emptyWindow = ''] = render({});
        const [liveBar = '', liveWindow = ''] = render(chat);
        expect(emptyBar).toContain('following');
        expect(emptyBar).not.toMatch(/Context:|%|50k/);
        expect(liveBar).toContain('34k/200k');
        expect(followingColumn(emptyBar)).toBe(followingColumn(liveBar));
        if (powerline) {
            expect(followingColumn(emptyBar)).toBe(followingColumn(emptyWindow));
            expect(followingColumn(liveBar)).toBe(followingColumn(liveWindow));
        }

        const withoutReservation = {
            ...settings,
            lines: settings.lines.map(line => line.map(item => ({ ...item, reserveSpace: false })))
        };
        const [unreserved = ''] = renderCodexStatus({}, withoutReservation, 160).map(getVisibleText);
        expect(followingColumn(unreserved)).toBeLessThan(followingColumn(emptyBar));
    });

    it('keeps the row when its only widget reserves space and has no data', () => {
        const settings = SettingsSchema.parse({
            lines: [
                [{ id: 'bar', type: 'context-bar', reserveSpace: true }],
                [{ id: 'tail', type: 'custom-text', customText: 'following row' }]
            ]
        });
        const rows = renderCodexStatus({}, settings, 160).map(getVisibleText);

        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatch(/^ +$/);
        expect(rows[1]).toContain('following row');
    });
});
