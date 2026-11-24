import { existsSync } from 'node:fs';
import {
    join,
    resolve
} from 'node:path';

import { resolveExecutable } from '../utils/executable-path';

export interface CodexCommand { file: string; args: string[] }

export function codexCommand(): CodexCommand {
    if (process.env.CODEX_POWERLINE_CODEX) {
        return { file: resolve(process.env.CODEX_POWERLINE_CODEX), args: [] };
    }
    try {
        return { file: resolveExecutable('codex'), args: [] };
    } catch (error) {
        // npm's Windows launcher is a .cmd file. Start its JavaScript entry
        // directly so shell parsing cannot reinterpret the caller's arguments.
        const path = Object.entries(process.env).find(([key]) => key.toLowerCase() === 'path')?.[1];
        for (const directory of path?.split(';') ?? []) {
            if (!directory)
                continue;
            const script = join(directory.replace(/^"(.*)"$/, '$1'), 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
            if (existsSync(script))
                return { file: process.execPath, args: [script] };
        }
        throw error;
    }
}
