import type { RenderContext } from '@powerline-dev/codex-powerline-core';

import { TokenCountWidget } from './shared/token-count-widget';

export class TokensCachedWidget extends TokenCountWidget {
    protected readonly label = 'Cached: ';
    protected readonly previewTokens = 12000;

    getDefaultColor(): string { return 'cyan'; }
    getDescription(): string { return 'Shows cached token count for the current session'; }
    getDisplayName(): string { return 'Tokens Cached'; }

    protected getTokenCount(context: RenderContext): number | null {
        return context.tokenMetrics?.cachedTokens ?? null;
    }
}
