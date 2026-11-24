export const KNOWN_THINKING_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
const KNOWN_THINKING_EFFORTS_SET: ReadonlySet<string> = new Set(KNOWN_THINKING_EFFORTS);
export type ThinkingEffortLevel = typeof KNOWN_THINKING_EFFORTS[number];

export interface ResolvedThinkingEffort {
    value: string;
    known: boolean;
}

const UNKNOWN_EFFORT_PATTERN = /^(?=.*[a-z0-9])[a-z0-9-]{2,20}$/;

export function normalizeThinkingEffort(value: string | undefined): ResolvedThinkingEffort | undefined {
    if (!value) {
        return undefined;
    }

    const normalized = value.toLowerCase();
    if (KNOWN_THINKING_EFFORTS_SET.has(normalized)) {
        return { value: normalized, known: true };
    }

    if (UNKNOWN_EFFORT_PATTERN.test(normalized)) {
        return { value: normalized, known: false };
    }

    return undefined;
}
