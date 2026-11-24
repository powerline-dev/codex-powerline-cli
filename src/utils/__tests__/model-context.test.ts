import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it
} from 'vitest';

import {
    getContextConfig,
    getModelContextIdentifier
} from '../model-context';

describe('getContextConfig', () => {
    const originalOverride = process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE;
    const originalFallback = process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK;

    beforeEach(() => {
        delete process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE;
        delete process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK;
    });

    afterEach(() => {
        if (originalOverride === undefined) {
            delete process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE;
        } else {
            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = originalOverride;
        }
        if (originalFallback === undefined) {
            delete process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK;
        } else {
            process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK = originalFallback;
        }
    });

    describe('Status JSON context window size override', () => {
        it('should use context_window_size as max tokens when provided', () => {
            const config = getContextConfig('example-default-model', 1000000);

            expect(config.maxTokens).toBe(1000000);
        });

        it('should prioritize context_window_size over [1m] model suffix', () => {
            const config = getContextConfig('example-extended-model[1m]', 200000);

            expect(config.maxTokens).toBe(200000);
        });
    });

    describe('CODEX_POWERLINE_CONTEXT_WINDOW_SIZE env override', () => {
        it('overrides context_window_size from status JSON with a raw number', () => {
            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = '1000000';
            const config = getContextConfig('mimo-v2.5-pro', 200000);

            expect(config.maxTokens).toBe(1000000);
        });

        it('accepts a k/m suffix', () => {
            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = '1M';
            const config = getContextConfig('mimo-v2.5-pro', 200000);

            expect(config.maxTokens).toBe(1000000);
        });

        it('ignores invalid values and falls through to status JSON value', () => {
            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = 'nope';
            const config = getContextConfig('example-default-model', 200000);

            expect(config.maxTokens).toBe(200000);
        });

        it('ignores zero, negative, and empty values', () => {
            for (const bad of ['0', '-1', '', '   ']) {
                process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = bad;
                const config = getContextConfig('example-default-model', 200000);
                expect(config.maxTokens).toBe(200000);
            }
        });

        it('rejects nonsensically small windows (< 1000)', () => {
            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = '1.5';
            const config = getContextConfig('example-default-model', 200000);

            expect(config.maxTokens).toBe(200000);
        });

        it('accepts underscore and comma separators', () => {
            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = '1_000_000';
            expect(getContextConfig('m', 200000).maxTokens).toBe(1000000);

            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = '1,000,000';
            expect(getContextConfig('m', 200000).maxTokens).toBe(1000000);
        });

        it('accepts decimals with a unit', () => {
            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = '1.5M';
            expect(getContextConfig('m', 200000).maxTokens).toBe(1500000);
        });

        it('accepts whitespace-padded and lowercase unit', () => {
            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = '  200k  ';
            expect(getContextConfig('m', 1000000).maxTokens).toBe(200000);
        });

        it('overrides model-suffix parsing when no status JSON value is provided', () => {
            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = '500k';
            expect(getContextConfig('example-extended-model[1m]').maxTokens).toBe(500000);
        });

        it('takes precedence over the fallback environment setting', () => {
            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = '1M';
            process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK = '500000';

            expect(getContextConfig(undefined)).toEqual({ maxTokens: 1000000 });
        });

        it('uses the fallback setting after an override becomes invalid or is removed', () => {
            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = '1M';
            process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK = '500000';
            expect(getContextConfig(undefined).maxTokens).toBe(1000000);

            process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE = 'invalid';
            expect(getContextConfig(undefined)).toEqual({ maxTokens: 500000 });

            delete process.env.CODEX_POWERLINE_CONTEXT_WINDOW_SIZE;
            expect(getContextConfig(undefined).maxTokens).toBe(500000);
        });
    });

    describe('Models with [1m] suffix', () => {
        it('should return 1M context window for example-extended-model with [1m] suffix', () => {
            const config = getContextConfig('example-extended-model[1m]');

            expect(config.maxTokens).toBe(1000000);
        });

        it('should return 1M context window for example-large-model with [1m] suffix', () => {
            const config = getContextConfig('example-large-model[1m]');

            expect(config.maxTokens).toBe(1000000);
        });

        it('should return 1M context window for a provider-qualified ID with [1m] suffix', () => {
            const config = getContextConfig(
                'us.provider.example-model-20250929-v1:0[1m]'
            );

            expect(config.maxTokens).toBe(1000000);
        });

        it('should return 1M context window with uppercase [1M] suffix', () => {
            const config = getContextConfig('example-extended-model[1M]');

            expect(config.maxTokens).toBe(1000000);
        });

        it('should return 1M context window for model IDs with 1M context label', () => {
            const config = getContextConfig('Example Large (1M context)');

            expect(config.maxTokens).toBe(1000000);
        });

        it('should return 1M context window for model IDs with 1M token context label', () => {
            const config = getContextConfig('Example Large - 1M token context');

            expect(config.maxTokens).toBe(1000000);
        });

        it('should return 1M context window for model IDs with 1M in parentheses', () => {
            const config = getContextConfig('Example Large (1M)');

            expect(config.maxTokens).toBe(1000000);
        });

        it('should return 1M context window for model IDs with 1M in square brackets', () => {
            const config = getContextConfig('Example Large [1M]');

            expect(config.maxTokens).toBe(1000000);
        });
    });

    describe('Models without [1m] suffix', () => {
        it('should return 200k context window for example-extended-model without [1m] suffix', () => {
            const config = getContextConfig('example-extended-model');

            expect(config.maxTokens).toBe(200000);
        });

        it('should return 200k context window for a provider-qualified ID without [1m] suffix', () => {
            const config = getContextConfig(
                'us.provider.example-model-20250929-v1:0'
            );

            expect(config.maxTokens).toBe(200000);
        });
    });

    describe('Older/default models', () => {
        it('should return 200k context window for a model without a context hint model', () => {
            const config = getContextConfig('example-default-model');

            expect(config.maxTokens).toBe(200000);
        });

        it('should return 200k context window when model ID is undefined', () => {
            const config = getContextConfig(undefined);

            expect(config.maxTokens).toBe(200000);
        });

        it('should return 200k context window for unknown model ID', () => {
            const config = getContextConfig('unknown-model');

            expect(config.maxTokens).toBe(200000);
        });
    });

    describe('CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK override', () => {
        it('uses the env value as the fallback when no window size is otherwise known', () => {
            process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK = '1000000';
            const config = getContextConfig('example-extended-model');

            expect(config.maxTokens).toBe(1000000);
        });

        it('uses the env value as the fallback when the model is unknown', () => {
            process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK = '500000';
            const config = getContextConfig(undefined);

            expect(config.maxTokens).toBe(500000);
        });

        it('falls back to 200k when the env value is non-numeric', () => {
            process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK = 'not-a-number';
            const config = getContextConfig('example-default-model');

            expect(config.maxTokens).toBe(200000);
        });

        it('falls back to 200k when the env value is zero or negative', () => {
            process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK = '0';
            expect(getContextConfig(undefined).maxTokens).toBe(200000);

            process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK = '-5';
            expect(getContextConfig(undefined).maxTokens).toBe(200000);
        });

        it('does not override the live context_window_size from the status JSON', () => {
            process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK = '500000';
            const config = getContextConfig('example-default-model', 1000000);

            expect(config.maxTokens).toBe(1000000);
        });

        it('does not override a [1m] model-name hint', () => {
            process.env.CODEX_POWERLINE_CONTEXT_SIZE_FALLBACK = '500000';
            const config = getContextConfig('example-extended-model[1m]');

            expect(config.maxTokens).toBe(1000000);
        });
    });
});

describe('getModelContextIdentifier', () => {
    it('returns string model identifier unchanged', () => {
        expect(getModelContextIdentifier('example-extended-model[1m]')).toBe('example-extended-model[1m]');
    });

    it('prefers both id and display name when available', () => {
        expect(getModelContextIdentifier({
            id: 'example-large-model',
            display_name: 'Example Large (1M context)'
        })).toBe('example-large-model Example Large (1M context)');
    });

    it('returns display name when id is missing', () => {
        expect(getModelContextIdentifier({ display_name: 'Example Large (1M context)' })).toBe('Example Large (1M context)');
    });

    it('returns undefined when no model value exists', () => {
        expect(getModelContextIdentifier(undefined)).toBeUndefined();
        expect(getModelContextIdentifier({})).toBeUndefined();
    });
});
