import { z } from 'zod';

const CoercedNumberSchema = z.preprocess((value) => {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return value;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
}, z.number());

const RateLimitPeriodSchema = z.object({
    used_percentage: CoercedNumberSchema.nullable().optional(),
    resets_at: CoercedNumberSchema.nullable().optional() // Unix epoch seconds
});

export type RateLimitPeriod = z.infer<typeof RateLimitPeriodSchema>;

// Optional fields with unknown shapes are dropped,
// so the rest of the payload (and the status line) still renders.
function tolerant<T extends z.ZodType>(schema: T) {
    return schema.nullable().optional().catch(undefined);
}

export const StatusJSONSchema = z.looseObject({
    codex: tolerant(z.object({
        total_tokens: CoercedNumberSchema.optional(),
        input_tokens: CoercedNumberSchema.optional(),
        output_tokens: CoercedNumberSchema.optional(),
        cached_input_tokens: CoercedNumberSchema.optional(),
        cache_write_input_tokens: CoercedNumberSchema.optional(),
        last_input_tokens: CoercedNumberSchema.optional(),
        last_cached_input_tokens: CoercedNumberSchema.optional(),
        last_cache_write_input_tokens: CoercedNumberSchema.optional(),
        account_email: z.string().optional(),
        account_workspace_name: z.string().optional(),
        sandbox: z.string().optional(),
        permission_profile: z.string().optional(),
        permission_display_name: z.string().optional(),
        approval_policy: z.string().optional(),
        approvals_reviewer: z.string().optional().catch(undefined),
        compactions: CoercedNumberSchema.optional(),
        session_name: z.string().optional()
    })),
    session_id: z.string().optional(),
    chat_status: tolerant(z.enum(['idle', 'running', 'waiting_for_approval', 'waiting_for_input', 'completed', 'interrupted', 'failed'])),
    cwd: z.string().optional(),
    model: z.union([
        z.string(),
        z.object({
            id: z.string().optional(),
            display_name: z.string().optional()
        })
    ]).optional(),
    workspace: z.object({
        current_dir: z.string().optional(),
        project_dir: z.string().optional()
    }).nullable().optional(),
    version: z.string().nullable().optional(),
    effort: z.object({ level: z.string().nullable().optional() }).nullable().optional(),
    cost: z.object({
        total_cost_usd: CoercedNumberSchema.optional(),
        total_duration_ms: CoercedNumberSchema.optional(),
        total_api_duration_ms: CoercedNumberSchema.optional(),
        total_lines_added: CoercedNumberSchema.optional(),
        total_lines_removed: CoercedNumberSchema.optional()
    }).nullable().optional(),
    context_window: z.object({
        context_window_size: CoercedNumberSchema.nullable().optional(),
        total_input_tokens: CoercedNumberSchema.nullable().optional(),
        total_output_tokens: CoercedNumberSchema.nullable().optional(),
        current_usage: z.union([
            CoercedNumberSchema,
            z.object({
                input_tokens: CoercedNumberSchema.optional(),
                output_tokens: CoercedNumberSchema.optional(),
                cache_creation_input_tokens: CoercedNumberSchema.optional(),
                cache_read_input_tokens: CoercedNumberSchema.optional()
            })
        ]).nullable().optional(),
        used_percentage: CoercedNumberSchema.nullable().optional(),
        remaining_percentage: CoercedNumberSchema.nullable().optional()
    }).nullable().optional(),
    // Only the Fast Mode widget reads it, so a malformed value is dropped
    // rather than failing the whole payload
    fast_mode: z.boolean().nullable().optional().catch(undefined),
    rate_limits: z.object({
        five_hour: RateLimitPeriodSchema.optional(),
        seven_day: RateLimitPeriodSchema.optional()
    }).nullable().optional()
});

export type StatusJSON = z.infer<typeof StatusJSONSchema>;
