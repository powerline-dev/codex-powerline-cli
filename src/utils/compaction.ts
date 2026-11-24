import type { CompactionData } from '../types/RenderContext';

/** Shared zeroed stats for missing/unreadable transcripts and as a render fallback. Treat as read-only. */
export const ZERO_COMPACTION_STATS: CompactionData = Object.freeze({
    count: 0,
    byTrigger: Object.freeze({ auto: 0, manual: 0, unknown: 0 }),
    tokensReclaimed: 0
});
