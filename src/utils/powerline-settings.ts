import type { Settings } from '../types/Settings.js';

import { getDefaultPowerlineTheme } from './powerline-themes.js';

// Only a first enable has no theme yet. 'custom' is chosen in the Themes menu,
// which is open only while Powerline is enabled, so it is kept.
function resolveEnabledPowerlineTheme(theme: string | undefined): string {
    if (!theme) {
        return getDefaultPowerlineTheme();
    }

    return theme;
}

export function buildEnabledPowerlineSettings(settings: Settings): Settings {
    const powerlineConfig = settings.powerline;

    return {
        ...settings,
        powerline: {
            ...powerlineConfig,
            enabled: true,
            theme: resolveEnabledPowerlineTheme(powerlineConfig.theme),
            // Separators are initialized by schema defaults, preserve existing values.
            separators: powerlineConfig.separators,
            separatorInvertBackground: powerlineConfig.separatorInvertBackground
        },
        defaultPadding: ' '
    };
}
