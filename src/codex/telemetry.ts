import type { StatusJSON } from '../types/StatusJSON';

type Json = Record<string, unknown>;
type RequestId = number | string;
type ChatStatus = NonNullable<StatusJSON['chat_status']>;

const THREAD_OPEN = new Set(['thread/start', 'thread/resume', 'thread/fork']);
const OBSERVED = new Set([...THREAD_OPEN, 'initialize', 'account/read', 'account/rateLimits/read', 'turn/start']);

function object(value: unknown): Json {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {};
}

function string(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function approvalPolicy(value: unknown): string | undefined {
    return string(value) ?? ('granular' in object(value) ? 'granular' : undefined);
}

function turnOutcome(status: unknown): ChatStatus | undefined {
    if (status === 'completed' || status === 'interrupted' || status === 'failed')
        return status;
    return undefined;
}

function threadStatus(value: unknown, previous: StatusJSON['chat_status']): ChatStatus | undefined {
    const { type, activeFlags } = object(value);
    switch (type) {
        case 'active': {
            const flags = Array.isArray(activeFlags) ? activeFlags : [];
            if (flags.includes('waitingOnApproval'))
                return 'waiting_for_approval';
            if (flags.includes('waitingOnUserInput'))
                return 'waiting_for_input';
            return 'running';
        }
        case 'idle':
            return turnOutcome(previous) ?? 'idle';
        case 'systemError':
            return 'failed';
        case 'notLoaded':
            return undefined;
        default:
            return previous ?? undefined;
    }
}

function fastMode(tier: unknown): boolean | undefined {
    if (tier === null)
        return false;
    return typeof tier === 'string' ? tier === 'fast' || tier === 'priority' : undefined;
}

function number(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function decode(line: string): Json {
    try {
        return object(JSON.parse(line));
    } catch {
        return {};
    }
}

function rateLimits(input: unknown): NonNullable<StatusJSON['rate_limits']> {
    const limits = object(input);
    const result: NonNullable<StatusJSON['rate_limits']> = {};
    for (const value of [limits.primary, limits.secondary]) {
        const window = object(value);
        const period = window.windowDurationMins === 300 ? 'five_hour'
            : window.windowDurationMins === 10080 ? 'seven_day' : undefined;
        if (period)
            result[period] = { used_percentage: number(window.usedPercent), resets_at: number(window.resetsAt) };
    }
    return result;
}

export class CodexTelemetry {
    private readonly pending = new Map<RequestId, { method: string; switchIndex: number; values: Json }>();
    private readonly sessions = new Map<string, StatusJSON>();
    private readonly latestTurnIds = new Map<string, string>();
    private active?: string;
    private readonly startedAt = new Map<string, number>();
    private switchIndex = 0;
    private accountEmail?: string;
    private accountWorkspaceName?: string;
    private limits?: StatusJSON['rate_limits'];
    private version?: string;

    constructor(private readonly cwd: string) {}

    private session(id: string): StatusJSON {
        let existing = this.sessions.get(id);
        if (!existing) {
            existing = { session_id: id, codex: {} };
            this.sessions.set(id, existing);
        }
        return existing;
    }

    request(line: string): void {
        const { id, method, params } = decode(line);
        if ((typeof id !== 'number' && typeof id !== 'string') || typeof method !== 'string' || !OBSERVED.has(method))
            return;
        if (THREAD_OPEN.has(method))
            this.switchIndex++;
        const { cwd, threadId, model, effort, sandboxPolicy, approvalPolicy, approvalsReviewer, serviceTier, serviceTierForTurn, collaborationMode } = object(params);
        this.pending.set(id, {
            method,
            switchIndex: this.switchIndex,
            values: { cwd, threadId, model, effort, sandboxPolicy, approvalPolicy, approvalsReviewer, serviceTier, serviceTierForTurn, collaborationMode }
        });
    }

    response(line: string): void {
        const { id, method, result, params } = decode(line);
        if (typeof method === 'string') {
            this.notification(method, object(params));
            return;
        }
        if (typeof id !== 'number' && typeof id !== 'string')
            return;
        const request = this.pending.get(id);
        this.pending.delete(id);
        if (!request || result === undefined)
            return;
        const data = object(result);
        if (request.method === 'initialize') {
            // The TUI uses the same Codex executable as the app server.
            this.version = string(data.userAgent)?.match(/\/([\d][\w.+-]*)/)?.[1];
        } else if (request.method === 'account/read') {
            const account = object(data.account);
            this.accountEmail = string(account.email);
            this.accountWorkspaceName = account.type === 'chatgpt' ? string(account.workspaceName) : undefined;
        } else if (request.method === 'account/rateLimits/read') {
            this.limits = rateLimits(object(data.rateLimitsByLimitId).codex ?? data.rateLimits);
        } else if (THREAD_OPEN.has(request.method)) {
            const thread = object(data.thread);
            const threadId = string(thread.id);
            if (!threadId)
                return;
            const session = this.session(threadId);
            const lastTurn = Array.isArray(thread.turns) ? object(thread.turns.at(-1)) : {};
            session.chat_status = threadStatus(thread.status, turnOutcome(lastTurn.status) ?? session.chat_status);
            if (lastTurn.status === 'inProgress' && typeof lastTurn.id === 'string')
                this.latestTurnIds.set(threadId, lastTurn.id);
            session.model = string(data.model);
            session.effort = { level: string(data.reasoningEffort) };
            session.cwd = string(data.cwd) ?? string(thread.cwd);
            session.fast_mode = fastMode(data.serviceTier);
            if (typeof thread.createdAt === 'number')
                this.startedAt.set(threadId, thread.createdAt * 1000);
            session.codex = {
                ...session.codex,
                session_name: string(thread.name),
                sandbox: string(object(data.sandbox).type),
                permission_profile: string(object(data.activePermissionProfile).id),
                approval_policy: approvalPolicy(data.approvalPolicy),
                approvals_reviewer: string(data.approvalsReviewer)
            };
            if (this.switchIndex === request.switchIndex)
                this.active = threadId;
        } else if (request.method === 'turn/start') {
            const values = request.values;
            const threadId = string(values.threadId);
            if (!threadId)
                return;
            const session = this.session(threadId);
            const mode = object(object(values.collaborationMode).settings);
            session.model = string(mode.model) ?? string(values.model) ?? session.model;
            session.effort = { level: string(mode.reasoning_effort) ?? string(values.effort) ?? session.effort?.level };
            session.cwd = string(values.cwd) ?? session.cwd;
            const sandbox = string(object(values.sandboxPolicy).type);
            if (sandbox)
                session.codex = { ...session.codex, sandbox, permission_profile: undefined };
            const approval = approvalPolicy(values.approvalPolicy);
            if (approval)
                session.codex = { ...session.codex, approval_policy: approval };
            const reviewer = string(values.approvalsReviewer);
            if (reviewer)
                session.codex = { ...session.codex, approvals_reviewer: reviewer };
            session.fast_mode = fastMode(string(values.serviceTierForTurn) ?? values.serviceTier) ?? session.fast_mode;
        }
    }

    private notification(method: string, data: Json): void {
        if (method === 'account/updated') {
            if (data.reason !== 'workspaceRoutingReady') {
                this.accountWorkspaceName = undefined;
                for (const [id, request] of this.pending) {
                    if (request.method === 'account/read')
                        this.pending.delete(id);
                }
            }
            return;
        }
        if (method === 'account/rateLimits/updated') {
            const limits = object(data.rateLimits);
            if (!limits.limitId || limits.limitId === 'codex')
                this.limits = rateLimits(limits);
            return;
        }
        const threadId = string(data.threadId);
        if (!threadId)
            return;
        const session = this.session(threadId);
        if (method === 'thread/status/changed') {
            session.chat_status = threadStatus(data.status, session.chat_status);
            if (object(data.status).type === 'notLoaded')
                this.latestTurnIds.delete(threadId);
        } else if (method === 'turn/started') {
            const turnId = string(object(data.turn).id);
            if (turnId) {
                this.latestTurnIds.set(threadId, turnId);
                if (session.chat_status !== 'waiting_for_approval' && session.chat_status !== 'waiting_for_input')
                    session.chat_status = 'running';
            }
        } else if (method === 'turn/completed') {
            const turn = object(data.turn);
            const turnId = string(turn.id);
            const latestTurnId = this.latestTurnIds.get(threadId);
            const outcome = turnOutcome(turn.status);
            if (turnId && outcome && (!latestTurnId || latestTurnId === turnId)) {
                this.latestTurnIds.set(threadId, turnId);
                session.chat_status = outcome;
            }
        } else if (method === 'thread/settings/updated') {
            const settings = object(data.threadSettings);
            session.model = string(settings.model) ?? session.model;
            if (typeof settings.effort === 'string' || settings.effort === null)
                session.effort = { level: string(settings.effort) };
            session.cwd = string(settings.cwd) ?? session.cwd;
            session.fast_mode = fastMode(settings.serviceTier) ?? session.fast_mode;
            session.codex = {
                ...session.codex,
                sandbox: string(object(settings.sandboxPolicy).type),
                permission_profile: string(object(settings.activePermissionProfile).id),
                approval_policy: approvalPolicy(settings.approvalPolicy),
                approvals_reviewer: string(settings.approvalsReviewer)
            };
        } else if (method === 'thread/tokenUsage/updated') {
            const usage = object(data.tokenUsage);
            const total = object(usage.total);
            const last = object(usage.last);
            const current = number(last.totalTokens);
            const window = number(usage.modelContextWindow);
            const percent = current !== undefined && window && window > 0
                ? Math.min(100, Math.max(0, current / window * 100)) : undefined;
            session.codex = {
                ...session.codex,
                total_tokens: number(total.totalTokens),
                input_tokens: number(total.inputTokens),
                output_tokens: number(total.outputTokens),
                cached_input_tokens: number(total.cachedInputTokens),
                cache_write_input_tokens: number(total.cacheWriteInputTokens),
                last_input_tokens: number(last.inputTokens),
                last_cached_input_tokens: number(last.cachedInputTokens),
                last_cache_write_input_tokens: number(last.cacheWriteInputTokens)
            };
            session.context_window = {
                context_window_size: window,
                current_usage: current,
                total_input_tokens: number(total.inputTokens),
                total_output_tokens: number(total.outputTokens),
                used_percentage: percent,
                remaining_percentage: percent === undefined ? undefined : 100 - percent
            };
        } else if (method === 'model/rerouted') {
            session.model = string(data.toModel) ?? session.model;
        } else if (method === 'thread/name/updated') {
            session.codex = { ...session.codex, session_name: string(data.threadName) };
        } else if (method === 'item/completed' && object(data.item).type === 'contextCompaction') {
            session.codex = { ...session.codex, compactions: (session.codex?.compactions ?? 0) + 1 };
        }
    }

    snapshot(): StatusJSON {
        const active = this.active ? this.sessions.get(this.active) : undefined;
        const start = this.active ? this.startedAt.get(this.active) : undefined;
        return {
            ...active,
            cost: start === undefined ? undefined : { total_duration_ms: Math.max(0, Date.now() - start) },
            cwd: active?.cwd ?? this.cwd,
            version: this.version,
            rate_limits: this.limits,
            codex: {
                ...active?.codex,
                account_email: this.accountEmail,
                account_workspace_name: this.accountWorkspaceName
            }
        };
    }
}
