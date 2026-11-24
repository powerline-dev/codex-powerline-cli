import {
    DEFAULT_SETTINGS,
    V4_HIDE_FLAG_RULES,
    migrateConfig
} from '@powerline-dev/codex-powerline-core';
import {
    describe,
    expect,
    it
} from 'vitest';

import {
    getAllWidgetTypes,
    getWidget
} from '../widgets';

describe('settings migrations with the CLI widget registry', () => {
    function migrateItem(item: Record<string, unknown>): Record<string, unknown> | undefined {
        const migrated = migrateConfig({
            version: 3,
            lines: [[item]]
        }, 4) as { lines?: Record<string, unknown>[][] };

        return migrated.lines?.[0]?.[0];
    }

    describe('every registered widget is covered by the hide table', () => {
        // States a v3 flag could reach. 'zero', 'no-data' and 'default-value'
        // are excluded: this PR introduces them as opt-in, so most widgets
        // declaring them have no legacy flag to convert.
        // One state can come from different flags depending on the widget:
        // Ahead/Behind reached 'no-upstream' through hideNoGit, while the
        // upstream remote widgets reached it through hideNoRemote. Any one
        // candidate converting is enough.
        const LEGACY_FLAGS_FOR_STATE: Record<string, string[]> = {
            'no-git': ['hideNoGit'],
            'no-jj': ['hideNoJj'],
            'no-remote': ['hideNoRemote'],
            'no-upstream': ['hideNoRemote', 'hideNoGit'],
            'not-fork': ['hideWhenNotFork'],
            'empty': ['hideWhenEmpty'],
            'disabled': ['hideIfDisabled']
        };

        const hideListOf = (item: Record<string, unknown> | undefined): string[] => {
            const metadata = item?.metadata as { hide?: string } | undefined;
            return (metadata?.hide ?? '').split(',').filter(state => state.length > 0);
        };

        const declaredStatesOf = (type: string): string[] => (getWidget(type)?.getHideableStates?.() ?? []).map(state => state.key);

        // Only widgets the table owns take part in the conversion. The rest
        // (whose states this PR introduces, with no v3 flag behind them) are
        // returned untouched by design, so there is nothing to convert.
        const registered = getAllWidgetTypes(DEFAULT_SETTINGS)
            .filter(type => type in V4_HIDE_FLAG_RULES)
            .map(type => ({ type, states: declaredStatesOf(type) }))
            .filter(entry => entry.states.length > 0);

        it('covers a non-trivial number of widgets', () => {
            expect(registered.length).toBeGreaterThan(20);
        });

        // The behavioural probe below can only speak for types the table lists,
        // so assert the table's shape directly too: a rule whose state order
        // disagrees with its widget silently drops the missing states, and the table
        // also keeps older IDs for configurations that still contain them.
        it.each(Object.keys(V4_HIDE_FLAG_RULES).filter(type => getWidget(type)))('%s has a rule matching its widget', (type) => {
            const rule = V4_HIDE_FLAG_RULES[type];
            const declared = declaredStatesOf(type);

            expect(declared.length).toBeGreaterThan(0);
            expect([...(rule?.stateOrder ?? [])].sort()).toEqual([...declared].sort());
            for (const state of rule?.defaultEnabled ?? []) {
                expect(rule?.stateOrder).toContain(state);
            }
            for (const states of Object.values(rule?.legacy ?? {})) {
                for (const state of states) {
                    expect(rule?.stateOrder).toContain(state);
                }
            }
        });

        it.each(registered.map(entry => [entry.type, entry.states] as const))(
            '%s converts its legacy flags and keeps its declared states',
            (type, stateKeys) => {
                for (const stateKey of stateKeys) {
                    const candidates = LEGACY_FLAGS_FOR_STATE[stateKey] ?? [];
                    if (candidates.length === 0) {
                        continue;
                    }

                    const reached = candidates.some((legacyFlag) => {
                        const migrated = migrateItem({ id: '1', type, metadata: { [legacyFlag]: 'true' } });
                        return hideListOf(migrated).includes(stateKey);
                    });
                    expect(`${type}:${stateKey} reached by ${reached ? 'a legacy flag' : 'nothing'}`)
                        .toBe(`${type}:${stateKey} reached by a legacy flag`);
                }

                // A hand-written list is authoritative, so every state the widget
                // declares has to survive the conversion rather than being
                // filtered out by a stale state order. The disabled flag is what
                // puts the item on the conversion path at all, since an item
                // carrying no legacy key is returned untouched; 'false' keeps the
                // flag from contributing states of its own, so the assertion
                // isolates the state-order filter.
                const probe = migrateItem({
                    id: '1',
                    type,
                    metadata: { hide: stateKeys.join(','), hideNoGit: 'false' }
                });
                // The trigger flag is consumed by the conversion, so its absence
                // is proof the probe reached the filter. Without this the
                // assertion below passes vacuously for an item returned
                // untouched, which is how the original version of this test
                // missed three stale state orders.
                expect(Object.keys((probe?.metadata ?? {}) as Record<string, unknown>)).not.toContain('hideNoGit');
                expect(hideListOf(probe).sort()).toEqual([...stateKeys].sort());
            }
        );
    });
});
