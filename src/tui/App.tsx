import chalk from 'chalk';
import {
    cloneSettings,
    type Settings
} from 'codex-powerline-core';
import {
    Box,
    Text,
    render,
    useApp,
    useInput
} from 'ink';
import Gradient from 'ink-gradient';
import React, {
    useCallback,
    useEffect,
    useState
} from 'react';

import type { WidgetItem } from '../types/Widget';
import { updateColorMap } from '../utils/colors';
import {
    applyImport,
    exportConfig,
    getConfigLoadError,
    getConfigLoadNotice,
    getConfigPath,
    isCustomConfigPath,
    loadSettings,
    saveSettings,
    validateImportFile,
    type ImportValidationResult
} from '../utils/config';
import {
    DEV_RELOAD_EXIT_CODE,
    discardDevReloadSnapshot,
    getDevReloadStateFile,
    isDevReloadRequested,
    readDevReloadSnapshot,
    requestDevReload,
    writeDevReloadSnapshot
} from '../utils/dev-reload';
import {
    checkPowerlineFonts,
    checkPowerlineFontsAsync,
    installPowerlineFonts,
    type PowerlineFontStatus
} from '../utils/powerline';
import { getPackageVersion } from '../utils/terminal';

import {
    ColorMenu,
    ConfirmDialog,
    ExportConfigDialog,
    GlobalOverridesMenu,
    ImportConfigDialog,
    ImportPreviewDialog,
    ItemsEditor,
    LineSelector,
    MainMenu,
    PowerlineSetup,
    RefreshIntervalMenu,
    StatusLinePreview,
    TerminalOptionsMenu,
    type MainMenuOption
} from './components';
import {
    List,
    type ListEntry
} from './components/List';

interface FlashMessage {
    text: string;
    color: 'green' | 'red' | 'yellow';
}

type AppScreen = 'main'
    | 'lines'
    | 'items'
    | 'colorLines'
    | 'colors'
    | 'terminalConfig'
    | 'globalOverrides'
    | 'confirm'
    | 'powerline'
    | 'flowNotice'
    | 'runHelp'
    | 'refreshInterval'
    | 'exportConfig'
    | 'importConfig'
    | 'importPreview';

export interface ConfirmDialogState {
    message: string;
    action: () => Promise<void>;
    cancelScreen?: Exclude<AppScreen, 'confirm'>;
}

interface FlowNoticeState {
    title: string;
    message: string;
    color: 'green' | 'red' | 'yellow';
    // 'exit' closes the TUI, for a notice shown by Save & Exit
    continueScreen: Exclude<AppScreen, 'confirm' | 'flowNotice'> | 'exit';
}

// Where Continue leads is App's to handle (onContinue), so the notice itself
// takes only what it draws
type FlowNoticeProps = Omit<FlowNoticeState, 'continueScreen'> & { onContinue: () => void };

const NOTICE_ITEMS: ListEntry<string>[] = [
    {
        label: 'Continue',
        value: 'continue'
    }
];

const FlowNotice: React.FC<FlowNoticeProps> = ({
    title,
    message,
    color,
    onContinue
}) => {
    useInput((_, key) => {
        if (key.escape) {
            onContinue();
        }
    });

    return (
        <Box flexDirection='column'>
            <Text bold>{title}</Text>
            <Box marginTop={1}>
                <Text color={color} wrap='wrap'>{message}</Text>
            </Box>
            <List
                marginTop={1}
                items={NOTICE_ITEMS}
                onSelect={() => { onContinue(); }}
                color='cyan'
            />
        </Box>
    );
};

export function getConfirmCancelScreen(confirmDialog: ConfirmDialogState | null): Exclude<AppScreen, 'confirm'> {
    return confirmDialog?.cancelScreen ?? 'main';
}

export function applyTuiImport(
    current: Settings,
    imported: Settings,
    mode: 'replace' | 'merge',
    presentKeys: readonly (keyof Settings)[]
): Settings {
    const nextSettings = applyImport(current, imported, mode, presentKeys);
    chalk.level = nextSettings.colorLevel;
    updateColorMap();
    return nextSettings;
}

export function buildConfigLoadWarning(configLoadError: string | null): string | null {
    if (!configLoadError) {
        return null;
    }

    return `⚠ ${configLoadError} — showing defaults; saving here overwrites the file.`;
}

export function buildConfigLoadNotice(configLoadNotice: string | null): string | null {
    if (!configLoadNotice) {
        return null;
    }

    return `⚠ ${configLoadNotice} — showing the migrated settings; saving here backs up the file first.`;
}

export function buildInvalidConfigSaveConfirm(
    configLoadError: string | null,
    onConfirm: () => void,
    returnScreen: Exclude<AppScreen, 'confirm'> = 'main'
): ConfirmDialogState | null {
    if (!configLoadError) {
        return null;
    }

    return {
        message: `${configLoadError} and is preserved on disk. Saving replaces it with the current configuration. Continue?`,
        action: () => {
            onConfirm();
            return Promise.resolve();
        },
        cancelScreen: returnScreen
    };
}

export const App: React.FC = () => {
    const { exit } = useApp();
    // Only set when running under the CODEX_POWERLINE_DEV_RELOAD supervisor; the
    // snapshot (if any) is where ctrl+r left off before the restart
    const [devReloadStateFile] = useState(() => getDevReloadStateFile(process.env));
    const [restored] = useState(() => (devReloadStateFile ? readDevReloadSnapshot(devReloadStateFile) : null));
    const [settings, setSettings] = useState<Settings | null>(null);
    const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [configLoadError, setConfigLoadError] = useState<string | null>(null);
    const [configLoadNotice, setConfigLoadNotice] = useState<string | null>(null);
    const [screen, setScreen] = useState<AppScreen>(restored?.screen ?? 'main');
    const [selectedLine, setSelectedLine] = useState(restored?.selectedLine ?? 0);
    const [previewWidgets, setPreviewWidgets] = useState<WidgetItem[] | null>(null);
    const [menuSelections, setMenuSelections] = useState<Record<string, number>>(restored?.menuSelections ?? {});
    const handleLineSelectionChange = useCallback((index: number) => {
        setMenuSelections(prev => ({ ...prev, lines: index }));
    }, []);
    const [itemsCursor, setItemsCursor] = useState(restored?.itemsCursor ?? 0);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
    const [terminalWidth, setTerminalWidth] = useState(process.stdout.columns || 80);
    const [powerlineFontStatus, setPowerlineFontStatus] = useState<PowerlineFontStatus>({ installed: false });
    const [installingFonts, setInstallingFonts] = useState(false);
    const [fontInstallMessage, setFontInstallMessage] = useState<string | null>(null);
    const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
    const [flowNotice, setFlowNotice] = useState<FlowNoticeState | null>(null);
    const [importValidation, setImportValidation] = useState<ImportValidationResult | null>(null);

    useEffect(() => {
        void loadSettings().then((loadedSettings) => {
            // A dev reload resumes the unsaved settings instead of the file's
            const initialSettings = restored?.settings ?? loadedSettings;
            // Set global chalk level based on settings (default to 256 colors for compatibility)
            chalk.level = initialSettings.colorLevel;
            // The color codes were built at the level chalk detected for this
            // terminal, which can be lower than the configured one
            updateColorMap();
            setSettings(initialSettings);
            setOriginalSettings(cloneSettings(restored?.originalSettings ?? loadedSettings));
            // Capture why settings.json was rejected (if at all) so the TUI can warn and
            // guard saves, and whether its migration is held unsaved. Read them here, in the
            // load callback: the module-scoped signals are reset by any later
            // loadSettings call.
            setConfigLoadError(getConfigLoadError());
            setConfigLoadNotice(getConfigLoadNotice());
        });
        // Check for Powerline fonts on startup (use sync version that doesn't call execSync)
        const fontStatus = checkPowerlineFonts();
        setPowerlineFontStatus(fontStatus);

        // Optionally do the async check later (but not blocking React)
        void checkPowerlineFontsAsync().then((asyncStatus) => {
            setPowerlineFontStatus(asyncStatus);
        });

        const handleResize = () => {
            setTerminalWidth(process.stdout.columns || 80);
        };

        process.stdout.on('resize', handleResize);
        return () => {
            process.stdout.off('resize', handleResize);
        };
    }, [restored]);

    // Check for changes whenever settings update
    useEffect(() => {
        if (originalSettings) {
            const hasAnyChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
            setHasChanges(hasAnyChanges);
        }
    }, [settings, originalSettings]);

    // Clear header message after 2 seconds
    useEffect(() => {
        if (flashMessage) {
            const timer = setTimeout(() => {
                setFlashMessage(null);
            }, 2000);
            return () => { clearTimeout(timer); };
        }
    }, [flashMessage]);

    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            exit();
        }
        if (devReloadStateFile && key.ctrl && input === 'r' && settings && originalSettings) {
            writeDevReloadSnapshot(devReloadStateFile, { settings, originalSettings, screen, selectedLine, menuSelections, itemsCursor });
            requestDevReload();
            exit();
            return;
        }
        if (key.ctrl && input === 's' && settings && screen !== 'confirm') {
            requestSave(settings, false);
        }
    });

    const requestSave = (nextSettings: Settings, close: boolean) => {
        const save = async () => {
            try {
                await saveSettings(nextSettings);
                if (devReloadStateFile)
                    discardDevReloadSnapshot(devReloadStateFile);
                setOriginalSettings(cloneSettings(nextSettings));
                setConfigLoadError(null);
                setConfigLoadNotice(null);
                if (close)
                    exit();
                else
                    setFlashMessage({ text: 'Configuration saved', color: 'green' });
            } catch {
                setFlashMessage({ text: 'Could not save configuration', color: 'red' });
            }
        };
        const guard = buildInvalidConfigSaveConfirm(configLoadError, () => {
            setConfirmDialog(null);
            setScreen(screen);
            void save();
        }, screen === 'confirm' ? 'main' : screen);
        if (guard) {
            setConfirmDialog(guard);
            setScreen('confirm');
        } else {
            void save();
        }
    };

    const handleExportConfig = useCallback(async (filePath: string) => {
        try {
            if (!settings) {
                return;
            }
            await exportConfig(settings, filePath);
            setFlashMessage({ text: `Config exported to ${filePath}`, color: 'green' });
        } catch (err) {
            setFlowNotice({
                title: 'Export Failed',
                message: err instanceof Error ? err.message : String(err),
                color: 'red',
                continueScreen: 'main'
            });
            setScreen('flowNotice');
            return;
        }
        setScreen('main');
    }, [settings]);

    const handleImportFileChosen = useCallback(async (filePath: string) => {
        const result = await validateImportFile(filePath);
        if (result.status === 'invalid') {
            setFlowNotice({
                title: 'Import Failed',
                message: result.reason,
                color: 'red',
                continueScreen: 'main'
            });
            setScreen('flowNotice');
        } else {
            setImportValidation(result);
            setScreen('importPreview');
        }
    }, []);

    const handleImportApply = useCallback((mode: 'replace' | 'merge') => {
        if (!settings || importValidation?.status !== 'valid') {
            return;
        }
        const importedSettings = applyTuiImport(
            settings,
            importValidation.data,
            mode,
            importValidation.presentKeys
        );
        setSettings(importedSettings);
        setHasChanges(true);
        setImportValidation(null);
        setFlashMessage({ text: 'Config imported — review and save', color: 'green' });
        setScreen('main');
    }, [importValidation, settings]);

    if (!settings)
        return <Text>Loading configuration...</Text>;
    const runningVersion = getPackageVersion();

    const handleMainMenuSelect = (value: MainMenuOption) => {
        switch (value) {
            case 'runHelp':
                setScreen('runHelp');
                break;
            case 'lines':
                setScreen('lines');
                break;
            case 'colors':
                setScreen('colorLines');
                break;
            case 'terminalConfig':
                setScreen('terminalConfig');
                break;
            case 'globalOverrides':
                setScreen('globalOverrides');
                break;
            case 'powerline':
                setScreen('powerline');
                break;
            case 'configureStatusLine':
                setScreen('refreshInterval');
                break;
            case 'exportConfig':
                setScreen('exportConfig');
                break;
            case 'importConfig':
                setScreen('importConfig');
                break;
            case 'save':
                requestSave(settings, true);
                break;
            case 'exit':
                exit();
                break;
        }
    };

    const updateLine = (lineIndex: number, widgets: WidgetItem[]) => {
        const newLines = [...settings.lines];
        newLines[lineIndex] = widgets;
        setSettings({ ...settings, lines: newLines });
    };

    const updateLines = (newLines: WidgetItem[][]) => {
        setSettings({ ...settings, lines: newLines });
    };

    const handleLineSelect = (lineIndex: number) => {
        setSelectedLine(lineIndex);
        setItemsCursor(0);
        setScreen('items');
    };

    const configWarning = buildConfigLoadWarning(configLoadError);
    const configNotice = buildConfigLoadNotice(configLoadNotice);
    // Label drafts and the picker's highlighted widget affect only the preview until Enter accepts them.
    const previewLines = screen === 'items' && previewWidgets
        ? settings.lines.map((line, index) => index === selectedLine ? previewWidgets : line)
        : settings.lines;

    return (
        <Box flexDirection='column'>
            <Box marginBottom={1}>
                <Text bold>
                    <Gradient name='retro'>
                        Codex Powerline
                    </Gradient>
                </Text>
                <Text bold>
                    {` | ${runningVersion && `v${runningVersion}`}`}
                </Text>
                {devReloadStateFile && <Text dimColor>  dev reload: ctrl+r</Text>}
                {flashMessage && (
                    <Text color={flashMessage.color} bold>
                        {`  ${flashMessage.text}`}
                    </Text>
                )}
            </Box>
            {configWarning && (
                <Text color='red' wrap='wrap'>{configWarning}</Text>
            )}
            {configNotice && (
                <Text color='yellow' wrap='wrap'>{configNotice}</Text>
            )}
            {isCustomConfigPath() && (
                <Text dimColor>{`Config: ${getConfigPath()}`}</Text>
            )}

            <StatusLinePreview
                lines={previewLines}
                terminalWidth={terminalWidth}
                settings={settings}
            />

            <Box marginTop={1}>
                {screen === 'main' && (
                    <MainMenu
                        onSelect={(value, index) => {
                            // Only persist menu selection if not exiting
                            if (value !== 'save' && value !== 'exit') {
                                setMenuSelections(prev => ({ ...prev, main: index }));
                            }

                            handleMainMenuSelect(value);
                        }}
                        hasChanges={hasChanges}
                        initialSelection={menuSelections.main}
                        onSelectionChange={(index) => { setMenuSelections(prev => ({ ...prev, main: index })); }}
                    />
                )}
                {screen === 'runHelp' && (
                    <Box flexDirection='column'>
                        <Text>Launch Codex with: codex-powerline run</Text>
                        <Text dimColor>Use codex-powerline run for multiple rows or older Codex releases.</Text>
                        <Text dimColor>The launcher does not change your Codex configuration.</Text>
                        <List items={NOTICE_ITEMS} onSelect={() => { setScreen('main'); }} />
                    </Box>
                )}
                {screen === 'lines' && (
                    <LineSelector
                        lines={settings.lines}
                        onSelect={(line) => {
                            setMenuSelections(prev => ({ ...prev, lines: line }));
                            handleLineSelect(line);
                        }}
                        onLinesUpdate={updateLines}
                        onBack={() => {
                            // Save that we came from 'lines' menu (index 0)
                            // Clear the line selection so it resets next time we enter
                            setMenuSelections(prev => ({ ...prev, main: 0 }));
                            setScreen('main');
                        }}
                        initialSelection={menuSelections.lines}
                        onSelectionChange={handleLineSelectionChange}
                        title='Select Line to Edit Items'
                        allowEditing={true}
                    />
                )}
                {screen === 'items' && (
                    <ItemsEditor
                        widgets={settings.lines[selectedLine] ?? []}
                        onUpdate={(widgets) => { updateLine(selectedLine, widgets); }}
                        onPreviewChange={setPreviewWidgets}
                        initialSelectedIndex={itemsCursor}
                        onSelectedIndexChange={setItemsCursor}
                        onBack={() => {
                            // When going back to lines menu, preserve which line was selected
                            setMenuSelections(prev => ({ ...prev, lines: selectedLine }));
                            setScreen('lines');
                        }}
                        lineNumber={selectedLine + 1}
                        settings={settings}
                    />
                )}
                {screen === 'colorLines' && (
                    <LineSelector
                        lines={settings.lines}
                        onLinesUpdate={updateLines}
                        onSelect={(line) => {
                            setMenuSelections(prev => ({ ...prev, lines: line }));
                            setSelectedLine(line);
                            setScreen('colors');
                        }}
                        onBack={() => {
                            // Save that we came from 'colors' menu (index 1)
                            setMenuSelections(prev => ({ ...prev, main: 1 }));
                            setScreen('main');
                        }}
                        initialSelection={menuSelections.lines}
                        onSelectionChange={handleLineSelectionChange}
                        title='Select Line to Edit Colors'
                        blockIfPowerlineActive={true}
                        settings={settings}
                        allowEditing={false}
                    />
                )}
                {screen === 'colors' && (
                    <ColorMenu
                        widgets={settings.lines[selectedLine] ?? []}
                        lineIndex={selectedLine}
                        settings={settings}
                        onUpdate={(updatedWidgets) => {
                            // Update only the selected line
                            const newLines = [...settings.lines];
                            newLines[selectedLine] = updatedWidgets;
                            setSettings({ ...settings, lines: newLines });
                        }}
                        onBack={() => {
                            // Go back to line selection for colors
                            setScreen('colorLines');
                        }}
                    />
                )}
                {screen === 'terminalConfig' && (
                    <TerminalOptionsMenu
                        settings={settings}
                        onUpdate={(updatedSettings) => {
                            setSettings(updatedSettings);
                        }}
                        onBack={() => {
                            // Save that we came from 'terminalConfig' menu (index 3)
                            setMenuSelections(prev => ({ ...prev, main: 3 }));
                            setScreen('main');
                        }}
                    />
                )}
                {screen === 'globalOverrides' && (
                    <GlobalOverridesMenu
                        settings={settings}
                        onUpdate={(updatedSettings) => {
                            setSettings(updatedSettings);
                        }}
                        onBack={() => {
                            // Save that we came from 'globalOverrides' menu (index 4)
                            setMenuSelections(prev => ({ ...prev, main: 4 }));
                            setScreen('main');
                        }}
                    />
                )}
                {screen === 'confirm' && confirmDialog && (
                    <ConfirmDialog
                        message={confirmDialog.message}
                        onConfirm={() => {
                            void confirmDialog.action();
                        }}
                        onCancel={() => {
                            setScreen(getConfirmCancelScreen(confirmDialog));
                            setConfirmDialog(null);
                        }}
                    />
                )}
                {screen === 'flowNotice' && flowNotice && (
                    <FlowNotice
                        {...flowNotice}
                        onContinue={() => {
                            if (flowNotice.continueScreen === 'exit') {
                                exit();
                                return;
                            }
                            setScreen(flowNotice.continueScreen);
                            setFlowNotice(null);
                        }}
                    />
                )}
                {screen === 'refreshInterval' && (
                    <RefreshIntervalMenu
                        currentInterval={settings.refreshIntervalSeconds}
                        gitCacheTtlSeconds={settings.gitCacheTtlSeconds}
                        terminalWidthCacheTtlSeconds={settings.terminalWidthCacheTtlSeconds}
                        customCommandCacheTtlSeconds={settings.customCommandCacheTtlSeconds}
                        onUpdate={(interval) => {
                            setSettings({ ...settings, refreshIntervalSeconds: interval ?? 2 });
                        }}
                        onGitCacheTtlUpdate={(ttlSeconds) => {
                            setSettings({
                                ...settings,
                                gitCacheTtlSeconds: ttlSeconds
                            });
                            setFlashMessage({
                                text: '✓ Git cache TTL updated',
                                color: 'green'
                            });
                            setScreen('main');
                        }}
                        onTerminalWidthCacheTtlUpdate={(ttlSeconds) => {
                            setSettings({
                                ...settings,
                                terminalWidthCacheTtlSeconds: ttlSeconds
                            });
                            setFlashMessage({
                                text: '✓ Terminal Width cache TTL updated',
                                color: 'green'
                            });
                            setScreen('main');
                        }}
                        onCustomCommandCacheTtlUpdate={(ttlSeconds) => {
                            setSettings({
                                ...settings,
                                customCommandCacheTtlSeconds: ttlSeconds
                            });
                            setFlashMessage({
                                text: '✓ Custom command cache TTL updated',
                                color: 'green'
                            });
                            setScreen('main');
                        }}
                        onBack={() => {
                            setScreen('main');
                        }}
                    />
                )}
                {screen === 'powerline' && (
                    <PowerlineSetup
                        settings={settings}
                        powerlineFontStatus={powerlineFontStatus}
                        onUpdate={(updatedSettings) => {
                            setSettings(updatedSettings);
                        }}
                        onBack={() => {
                            setScreen('main');
                        }}
                        onInstallFonts={() => {
                            setInstallingFonts(true);
                            // Add a small delay to allow React to render the "Installing..." message
                            // before font copying and terminal setup
                            setTimeout(() => {
                                void installPowerlineFonts().then((result) => {
                                    setInstallingFonts(false);
                                    setFontInstallMessage(result.message);
                                    // Refresh font status
                                    void checkPowerlineFontsAsync().then((asyncStatus) => {
                                        setPowerlineFontStatus(asyncStatus);
                                    });
                                });
                            }, 50);
                        }}
                        installingFonts={installingFonts}
                        fontInstallMessage={fontInstallMessage}
                        onClearMessage={() => { setFontInstallMessage(null); }}
                    />
                )}

                {screen === 'exportConfig' && (
                    <ExportConfigDialog
                        onExport={(filePath) => { void handleExportConfig(filePath); }}
                        onCancel={() => { setScreen('main'); }}
                    />
                )}

                {screen === 'importConfig' && (
                    <ImportConfigDialog
                        onFileChosen={(filePath) => { void handleImportFileChosen(filePath); }}
                        onCancel={() => { setScreen('main'); }}
                    />
                )}

                {screen === 'importPreview' && importValidation?.status === 'valid' && (
                    <ImportPreviewDialog
                        validation={importValidation}
                        currentSettings={settings}
                        onApply={(mode) => { handleImportApply(mode); }}
                        onCancel={() => {
                            setImportValidation(null);
                            setScreen('main');
                        }}
                    />
                )}
            </Box>
        </Box>
    );
};

export function runTUI() {
    // Clear the terminal before starting the TUI
    process.stdout.write('\x1b[2J\x1b[H');
    const instance = render(<App />);
    // ctrl+r under the dev reload supervisor: exit with the code that tells
    // it to start a fresh process, once Ink has restored the terminal
    void instance.waitUntilExit().finally(() => {
        if (isDevReloadRequested()) {
            process.exit(DEV_RELOAD_EXIT_CODE);
        }
    });
}
