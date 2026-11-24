import type { Settings } from '../types/Settings.js';

export function cloneSettings(settings: Settings): Settings {
    const cloneFn = globalThis.structuredClone;
    if (typeof cloneFn === 'function') {
        return cloneFn(settings);
    }

    return JSON.parse(JSON.stringify(settings)) as Settings;
}
