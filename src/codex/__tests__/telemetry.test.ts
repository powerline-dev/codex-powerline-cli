import {
    describe,
    expect,
    it
} from 'vitest';

import { CodexTelemetry } from '../telemetry';

describe('Codex telemetry', () => {
    it('follows live chat status, ignoring background threads and older turns', () => {
        const telemetry = new CodexTelemetry('/project');
        const notify = (method: string, params: Record<string, unknown>) => {
            telemetry.response(JSON.stringify({ method, params: { threadId: 'visible', ...params } }));
        };
        const status = (type: string, activeFlags: string[] = [], threadId = 'visible') => {
            notify('thread/status/changed', { threadId, status: { type, activeFlags } });
        };
        const turn = (method: string, id: string, status: string) => {
            notify(method, { turn: { id, status } });
        };
        const chat = () => telemetry.snapshot().chat_status;

        expect(chat()).toBeUndefined();
        telemetry.request(JSON.stringify({ id: 1, method: 'thread/start' }));
        telemetry.response(JSON.stringify({ id: 1, result: { thread: { id: 'visible', status: { type: 'idle' } } } }));
        expect(chat()).toBe('idle');

        turn('turn/started', 'first', 'inProgress');
        expect(chat()).toBe('running');
        status('active', ['waitingOnUserInput'], 'background');
        expect(chat()).toBe('running');
        status('active', ['waitingOnApproval']);
        expect(chat()).toBe('waiting_for_approval');
        status('active', ['waitingOnUserInput']);
        expect(chat()).toBe('waiting_for_input');
        status('active');
        expect(chat()).toBe('running');
        status('idle');
        turn('turn/completed', 'first', 'completed');
        expect(chat()).toBe('completed');

        turn('turn/started', 'second', 'inProgress');
        turn('turn/completed', 'first', 'completed');
        expect(chat()).toBe('running');
        turn('turn/completed', 'second', 'interrupted');
        status('idle');
        expect(chat()).toBe('interrupted');
        turn('turn/started', 'third', 'inProgress');
        turn('turn/completed', 'third', 'failed');
        expect(chat()).toBe('failed');
        status('notLoaded');
        expect(chat()).toBeUndefined();
    });

    it('uses the resumed chat status and keeps active flags ahead of turn history', () => {
        const telemetry = new CodexTelemetry('/project');
        const resume = (id: number, threadId: string, status: Record<string, unknown>) => {
            telemetry.request(JSON.stringify({ id, method: 'thread/resume', params: { threadId } }));
            telemetry.response(JSON.stringify({
                id,
                result: { thread: { id: threadId, status, turns: [{ id: 'last', status: 'completed' }] } }
            }));
        };

        resume(1, 'finished', { type: 'idle' });
        expect(telemetry.snapshot().chat_status).toBe('completed');
        resume(2, 'active', { type: 'active', activeFlags: ['waitingOnApproval'] });
        expect(telemetry.snapshot().chat_status).toBe('waiting_for_approval');
    });

    it('tracks the active TUI thread and keeps counters from other threads separate', () => {
        const telemetry = new CodexTelemetry('/default');
        telemetry.request(JSON.stringify({ id: 1, method: 'thread/start' }));
        telemetry.request(JSON.stringify({ id: 2, method: 'thread/resume', params: { threadId: 'visible' } }));
        telemetry.response(JSON.stringify({ id: 2, result: { thread: { id: 'visible', cwd: '/project' }, model: 'gpt' } }));
        telemetry.response(JSON.stringify({ id: 1, result: { thread: { id: 'background', cwd: '/other' }, model: 'other' } }));
        const usage = (threadId: string, totalTokens: number) => JSON.stringify({
            method: 'thread/tokenUsage/updated',
            params: { threadId, tokenUsage: { total: { totalTokens }, last: { totalTokens: 25 }, modelContextWindow: 100 } }
        });
        telemetry.response(usage('visible', 400));
        telemetry.response(usage('background', 900));

        expect(telemetry.snapshot()).toMatchObject({
            session_id: 'visible', model: 'gpt', cwd: '/project',
            codex: { total_tokens: 400 },
            context_window: { current_usage: 25, used_percentage: 25, remaining_percentage: 75 }
        });
    });

    it('does not use a model-specific quota or a different time window as the Codex account quota', () => {
        const telemetry = new CodexTelemetry('/project');
        const update = (limitId: string, usedPercent: number, windowDurationMins: number) => JSON.stringify({
            method: 'account/rateLimits/updated',
            params: { rateLimits: { limitId, primary: { usedPercent, windowDurationMins } } }
        });
        telemetry.response(update('codex', 18, 300));
        telemetry.response(update('other', 99, 300));
        expect(telemetry.snapshot().rate_limits).toEqual({ five_hour: { used_percentage: 18, resets_at: undefined } });

        telemetry.response(update('codex', 50, 60));
        expect(telemetry.snapshot().rate_limits).toEqual({});
    });

    it('tracks the selected ChatGPT workspace and ignores an account reply from before a switch', () => {
        const telemetry = new CodexTelemetry('/project');
        const read = (id: number) => {
            telemetry.request(JSON.stringify({ id, method: 'account/read' }));
        };
        const reply = (id: number, workspaceName: string | null) => {
            telemetry.response(JSON.stringify({ id, result: { account: { type: 'chatgpt', planType: 'business', workspaceName } } }));
        };
        const workspace = () => telemetry.snapshot().codex?.account_workspace_name;

        read(1);
        reply(1, 'Example Company');
        expect(workspace()).toBe('Example Company');

        read(2);
        telemetry.response(JSON.stringify({ method: 'account/updated', params: { authMode: 'chatgpt', reason: 'workspaceRoutingReady' } }));
        expect(workspace()).toBe('Example Company');

        telemetry.response(JSON.stringify({ method: 'account/updated', params: { authMode: 'chatgpt' } }));
        reply(2, 'Example Company');
        expect(workspace()).toBeUndefined();

        read(3);
        reply(3, 'Another Company');
        expect(workspace()).toBe('Another Company');

        read(4);
        reply(4, null);
        expect(workspace()).toBeUndefined();
    });

    it('updates the active thread model, effort, speed, and directory without a new turn', () => {
        const telemetry = new CodexTelemetry('/project');
        telemetry.request(JSON.stringify({ id: 1, method: 'thread/start' }));
        telemetry.response(JSON.stringify({
            id: 1,
            result: { thread: { id: 'visible' }, model: 'gpt-6.2-sol', reasoningEffort: 'medium', cwd: '/project' }
        }));
        const update = (threadId: string, threadSettings: Record<string, unknown>) => {
            telemetry.response(JSON.stringify({
                method: 'thread/settings/updated',
                params: { threadId, threadSettings }
            }));
        };

        const changed = { model: 'gpt-6.2-astra', effort: 'low', serviceTier: 'priority', cwd: '/other' };
        update('background', changed);
        expect(telemetry.snapshot()).toMatchObject({
            model: 'gpt-6.2-sol',
            effort: { level: 'medium' },
            cwd: '/project'
        });

        update('visible', changed);
        expect(telemetry.snapshot()).toMatchObject({
            model: 'gpt-6.2-astra',
            effort: { level: 'low' },
            cwd: '/other',
            fast_mode: true
        });

        update('visible', { model: 'gpt-6.2-sol', effort: null, serviceTier: null, cwd: '/project' });
        expect(telemetry.snapshot()).toMatchObject({
            model: 'gpt-6.2-sol',
            effort: { level: undefined },
            cwd: '/project',
            fast_mode: false
        });
    });

    it('tracks confirmed permissions per thread and clears the old profile when the sandbox changes', () => {
        const telemetry = new CodexTelemetry('/project');
        telemetry.request(JSON.stringify({ id: 1, method: 'thread/start' }));
        telemetry.response(JSON.stringify({
            id: 1,
            result: {
                thread: { id: 'visible' }, sandbox: { type: 'workspaceWrite' },
                activePermissionProfile: { id: ':workspace' }, approvalPolicy: 'on-request', approvalsReviewer: 'auto_review'
            }
        }));
        const update = (threadId: string) => {
            telemetry.response(JSON.stringify({
                method: 'thread/settings/updated',
                params: {
                    threadId,
                    threadSettings: {
                        sandboxPolicy: { type: 'readOnly' }, activePermissionProfile: null,
                        approvalPolicy: { granular: {} }, approvalsReviewer: 'user'
                    }
                }
            }));
        };

        update('background');
        expect(telemetry.snapshot().codex).toMatchObject({
            sandbox: 'workspaceWrite',
            permission_profile: ':workspace',
            approval_policy: 'on-request',
            approvals_reviewer: 'auto_review'
        });
        update('visible');
        expect(telemetry.snapshot().codex).toMatchObject({
            sandbox: 'readOnly',
            permission_profile: undefined,
            approval_policy: 'granular',
            approvals_reviewer: 'user'
        });
    });

    it('tracks a turn approval reviewer only after the server accepts the turn', () => {
        const telemetry = new CodexTelemetry('/project');
        telemetry.request(JSON.stringify({ id: 1, method: 'thread/start' }));
        telemetry.response(JSON.stringify({ id: 1, result: { thread: { id: 'visible' }, approvalsReviewer: 'user' } }));

        telemetry.request(JSON.stringify({ id: 2, method: 'turn/start', params: { threadId: 'visible', approvalsReviewer: 'auto_review' } }));
        telemetry.response(JSON.stringify({ id: 2, error: { code: -32602, message: 'Invalid params' } }));
        expect(telemetry.snapshot().codex?.approvals_reviewer).toBe('user');

        telemetry.request(JSON.stringify({ id: 3, method: 'turn/start', params: { threadId: 'visible', approvalsReviewer: 'auto_review' } }));
        telemetry.response(JSON.stringify({ id: 3, result: { turn: { id: 'new-turn' } } }));
        expect(telemetry.snapshot().codex?.approvals_reviewer).toBe('auto_review');
    });
});
