import {
    advanceGlobalPowerlineThemeIndex,
    advanceGlobalSeparatorIndex,
    type RenderContext,
    type RenderUsageData,
    type Settings,
    type StatusJSON
} from '@powerline-dev/codex-powerline-core';
import chalk from 'chalk';

import {
    getVisibleText,
    truncateStyledText
} from './ansi';
import { updateColorMap } from './colors';
import { getConfigLoadError } from './config';
import {
    buildConfigWarningBadge,
    calculateMaxWidthsFromPreRendered,
    countPowerlineStartCapSlots,
    preRenderAllWidgets,
    renderStatusLine
} from './renderer';
import { sanitizeTerminalText } from './terminal-sanitize';
import { getCodexLines } from './widgets';

function getUsage(data: StatusJSON): RenderUsageData {
    const primary = data.rate_limits?.five_hour;
    const weekly = data.rate_limits?.seven_day;
    const asDate = (seconds?: number | null) => typeof seconds === 'number' && Math.abs(seconds) <= 8640000000000
        ? new Date(seconds * 1000).toISOString()
        : undefined;
    return {
        sessionUsage: primary?.used_percentage ?? undefined,
        sessionResetAt: asDate(primary?.resets_at),
        weeklyUsage: weekly?.used_percentage ?? undefined,
        weeklyResetAt: asDate(weekly?.resets_at)
    };
}

export function renderCodexStatus(
    data: StatusJSON,
    settings: Settings,
    width: number | null,
    rawData: Record<string, unknown> = data
): string[] {
    chalk.level = settings.colorLevel;
    updateColorMap();
    const { codex, context_window: window } = data;
    const context: RenderContext = {
        data,
        rawData,
        tokenMetrics: codex?.total_tokens === undefined ? null : {
            inputTokens: codex.input_tokens ?? 0,
            outputTokens: codex.output_tokens ?? 0,
            cachedTokens: codex.cached_input_tokens ?? 0,
            cacheReadTokens: codex.cached_input_tokens,
            cacheCreationTokens: codex.cache_write_input_tokens,
            totalTokens: codex.total_tokens,
            contextLength: typeof window?.current_usage === 'number' ? window.current_usage : 0
        },
        usageData: getUsage(data),
        compactionData: codex?.compactions === undefined ? null : {
            count: codex.compactions,
            byTrigger: { auto: 0, manual: 0, unknown: codex.compactions },
            tokensReclaimed: 0
        },
        terminalWidth: width,
        isPreview: false,
        minimalist: settings.minimalistMode,
        gitCacheTtlSeconds: settings.gitCacheTtlSeconds,
        customCommandCacheTtlSeconds: settings.customCommandCacheTtlSeconds,
        gitReviewNeedsChecks: settings.lines.some(line => line.some(item => item.type === 'git-ci-status'))
    };
    const lines = getCodexLines(settings.lines);
    const rendered = preRenderAllWidgets(lines, settings, context);
    const maxWidths = calculateMaxWidthsFromPreRendered(rendered, settings);
    const output: string[] = [];
    let globalSeparatorIndex = 0;
    let globalPowerlineThemeIndex = 0;
    let globalPowerlineStartCapIndex = 0;

    for (const [lineIndex, items] of lines.entries()) {
        const widgets = rendered[lineIndex] ?? [];
        const line = renderStatusLine(items, settings, { ...context, lineIndex, globalSeparatorIndex, globalPowerlineThemeIndex, globalPowerlineStartCapIndex }, widgets, maxWidths);
        if (!getVisibleText(line).trim() && !widgets.some(({ widget, content }) => widget.reserveSpace && content))
            continue;
        output.push(sanitizeTerminalText(line).replaceAll('\n', ' '));
        globalSeparatorIndex = advanceGlobalSeparatorIndex(globalSeparatorIndex, items, widgets);
        if (settings.powerline.enabled) {
            globalPowerlineStartCapIndex += countPowerlineStartCapSlots(items, widgets);
            if (settings.powerline.continueThemeAcrossLines) {
                globalPowerlineThemeIndex = advanceGlobalPowerlineThemeIndex(globalPowerlineThemeIndex, widgets);
            }
        }
    }
    if (getConfigLoadError()) {
        const badge = buildConfigWarningBadge(settings.colorLevel);
        output[0] = output[0] ? `${badge} | ${output[0]}` : badge;
    }
    return width ? output.map(line => truncateStyledText(line, width)) : output;
}
