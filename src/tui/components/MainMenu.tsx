import {
    Box,
    Text
} from 'ink';
import React from 'react';

import { List } from './List';

export type MainMenuOption = 'lines'
    | 'colors'
    | 'powerline'
    | 'terminalConfig'
    | 'globalOverrides'
    | 'runHelp'
    | 'configureStatusLine'
    | 'exportConfig'
    | 'importConfig'
    | 'save'
    | 'exit';

export interface MainMenuProps {
    onSelect: (value: MainMenuOption, index: number) => void;
    hasChanges: boolean;
    initialSelection?: number;
    onSelectionChange?: (index: number) => void;
}

interface MainMenuItem {
    label: string;
    sublabel?: string;
    disabled?: boolean;
    value: MainMenuOption;
    description: string;
}

export type MainMenuEntry = MainMenuItem | '-';

export function buildMainMenuItems(hasChanges: boolean): MainMenuEntry[] {
    const menuItems: MainMenuEntry[] = [
        {
            label: '📝 Edit Lines',
            value: 'lines',
            description:
                'Configure any number of status lines with various widgets like model info, git status, and token usage'
        },
        {
            label: '🎨 Edit Colors',
            value: 'colors',
            description:
                'Customize colors for each widget including foreground, background, and bold styling'
        },
        {
            label: '⚡ Powerline Setup',
            value: 'powerline',
            description:
                'Set up the bundled font and configure Powerline separators, caps, and themes'
        },
        '-',
        {
            label: '💻 Terminal Options',
            value: 'terminalConfig',
            description: 'Configure terminal-specific settings for optimal display'
        },
        {
            label: '🌐 Global Overrides',
            value: 'globalOverrides',
            description:
                'Set global padding, separators, and color overrides that apply to all widgets'
        },
        {
            label: '🔧 Configure Status Line',
            value: 'configureStatusLine',
            description: 'Set the refresh interval and cache TTLs'
        },
        '-',
        {
            label: '📤 Export Config',
            value: 'exportConfig',
            description: 'Save your current configuration to a JSON file for backup or sharing'
        },
        {
            label: '📥 Import Config',
            value: 'importConfig',
            description: 'Load configuration from a previously exported JSON file'
        },
        '-',
        { label: 'Run with Codex', value: 'runHelp', description: 'Show the command that launches Codex with this status line' }
    ];

    if (hasChanges) {
        menuItems.push(
            '-',
            {
                label: '💾 Save & Exit',
                value: 'save',
                description: 'Save all changes and exit the configuration tool'
            },
            {
                label: '❌ Exit without saving',
                value: 'exit',
                description: 'Exit without saving your changes'
            }
        );
    } else {
        menuItems.push(
            '-',
            {
                label: '🚪 Exit',
                value: 'exit',
                description: 'Exit the configuration tool'
            }
        );
    }

    return menuItems;
}

export function getMainMenuSelectionIndex(items: MainMenuEntry[], option: MainMenuOption): number {
    let selectionIndex = 0;

    for (const item of items) {
        if (item === '-') {
            continue;
        }

        if (item.value === option) {
            return selectionIndex;
        }

        if (!item.disabled) {
            selectionIndex += 1;
        }
    }

    return 0;
}

export const MainMenu: React.FC<MainMenuProps> = ({
    onSelect,
    hasChanges,
    initialSelection = 0,
    onSelectionChange
}) => {
    const menuItems = buildMainMenuItems(hasChanges);

    return (
        <Box flexDirection='column'>
            <Text bold>Main Menu</Text>

            {/* initialSelection is the highlighted row's index. Saving swaps Save &
                Exit and Exit without saving for Exit, which moves the entries
                below, and the highlight must stay on its entry, not its row. */}
            <List
                items={menuItems}
                marginTop={1}
                onSelect={(value, index) => {
                    if (value === 'back') {
                        return;
                    }

                    onSelect(value, index);
                }}
                initialSelection={initialSelection}
                onSelectionChange={(_, index) => onSelectionChange?.(index)}
                keepHighlightOnItemsChange={true}
            />
        </Box>
    );
};
