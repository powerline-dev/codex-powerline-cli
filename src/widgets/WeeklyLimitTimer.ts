import {
    getWeeklyLimitInMs,
    type RenderContext
} from '@powerline-dev/codex-powerline-core';

import { LimitTimerWidget } from './shared/limit-timer-widget';

export class WeeklyLimitTimerWidget extends LimitTimerWidget {
    protected readonly label = 'Weekly limit in: ';
    protected readonly previewLimitInMs = 37 * 60 * 60 * 1000;

    getDescription(): string { return 'Time until the 7-day limit at this week\'s average pace; shown only when that comes before the reset'; }
    getDisplayName(): string { return 'Weekly Limit Timer'; }

    protected getLimitInMs(context: RenderContext): number | null {
        const { weeklyUsage, weeklyResetAt } = context.usageData ?? {};
        if (weeklyUsage === undefined || weeklyResetAt === undefined) {
            return null;
        }

        return getWeeklyLimitInMs({ percent: weeklyUsage, nowMs: Date.now(), resetAtMs: Date.parse(weeklyResetAt) });
    }
}
