import type { UsageData } from '../utils/usage-types.js';

import type { BlockMetrics } from './BlockMetrics.js';
import type { StatusJSON } from './StatusJSON.js';
import type { TokenMetrics } from './TokenMetrics.js';

export type RenderUsageData = UsageData;

export interface CompactionData {
    count: number;
    byTrigger: { auto: number; manual: number; unknown: number };
    tokensReclaimed: number;
}

export interface RenderContext {
    data?: StatusJSON;
    // The input JSON as it arrived, for Custom Command's stdin. The
    // validated `data` drops nested fields the schema doesn't list and turns
    // number strings into numbers.
    rawData?: Record<string, unknown>;
    tokenMetrics?: TokenMetrics | null;
    usageData?: RenderUsageData | null;
    sessionDuration?: string | null;
    blockMetrics?: BlockMetrics | null;
    compactionData?: CompactionData | null;
    terminalWidth?: number | null;
    isPreview?: boolean;
    minimalist?: boolean;
    gitCacheTtlSeconds?: number;
    customCommandCacheTtlSeconds?: number;
    gitReviewNeedsChecks?: boolean;
    lineIndex?: number;  // Index of the current line being rendered (for theme cycling)
    globalSeparatorIndex?: number;  // Global separator index that continues across lines

    // For git widget thresholds
    gitData?: {
        changedFiles?: number;
        insertions?: number;
        deletions?: number;
    };
    globalPowerlineThemeIndex?: number;  // Global powerline theme index that continues across lines
    globalPowerlineStartCapIndex?: number;  // Global start cap index across powerline flex segments and lines
}
