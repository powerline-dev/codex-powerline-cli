import xterm from '@xterm/headless';
import {
    describe,
    expect,
    it
} from 'vitest';

import { DEFAULT_SETTINGS } from '../../types/Settings';
import type { WidgetItem } from '../../types/Widget';
import { renderCodexStatus } from '../status-render';

const text = (id: string, customText: string): WidgetItem => ({ id, type: 'custom-text', customText });
const empty: WidgetItem = { id: 'blank', type: 'empty', backgroundColor: 'bgRed' };

describe('Empty widget rendering', () => {
    it.each([
        { name: 'plain', powerline: false, invertSeparator: false },
        { name: 'Powerline', powerline: true, invertSeparator: false },
        { name: 'Powerline with left-pointing separators', powerline: true, invertSeparator: true }
    ])('uses the terminal background in $name', async ({ powerline, invertSeparator }) => {
        const lines = [
            [text('left', 'left'), text('middle', 'middle'), text('right', 'right')],
            [text('left', 'left'), empty, text('right', 'right')]
        ];
        const rows = renderCodexStatus({}, {
            ...DEFAULT_SETTINGS,
            lines,
            colorLevel: 3,
            defaultPadding: ' ',
            overrideBackgroundColor: 'bgBlue',
            powerline: {
                ...DEFAULT_SETTINGS.powerline,
                enabled: powerline,
                autoAlign: true,
                theme: 'catppuccin',
                separators: [invertSeparator ? '\uE0B2' : '\uE0B0'],
                separatorInvertBackground: [invertSeparator]
            }
        }, 80);
        const terminal = new xterm.Terminal({ cols: 80, rows: 4, allowProposedApi: true });
        try {
            await new Promise<void>((resolve) => {
                terminal.write(rows.join('\r\n'), resolve);
            });
            const filledLine = terminal.buffer.active.getLine(0);
            const emptyLine = terminal.buffer.active.getLine(1);
            const filledText = filledLine?.translateToString() ?? '';
            const emptyText = emptyLine?.translateToString() ?? '';
            const gapStart = filledText.indexOf('middle') - 1;
            const gapWidth = powerline ? ' middle '.length : '   '.length;
            expect(emptyText.slice(gapStart, gapStart + gapWidth)).toBe(' '.repeat(gapWidth));
            for (let i = gapStart; i < gapStart + gapWidth; i++) {
                expect(emptyLine?.getCell(i)?.isBgDefault()).toBe(true);
                expect(filledLine?.getCell(i)?.isBgDefault()).toBe(false);
            }
            expect(emptyLine?.getCell(emptyText.indexOf('right'))?.isBgDefault()).toBe(false);
            if (powerline) {
                expect(emptyText.indexOf('right')).toBe(filledText.indexOf('right'));
                expect(emptyLine?.getCell(emptyText.indexOf('right'))?.getBgColor())
                    .toBe(filledLine?.getCell(filledText.indexOf('right'))?.getBgColor());

                const separator = emptyLine?.getCell(invertSeparator ? gapStart - 1 : gapStart + gapWidth);
                const neighbor = emptyLine?.getCell(emptyText.indexOf(invertSeparator ? 'left' : 'right'));
                expect(separator?.getChars()).toBe(invertSeparator ? '\uE0B2' : '\uE0B0');
                expect(separator?.isInverse()).toBeTruthy();
                expect(separator?.isBgDefault()).toBe(true);
                expect(separator?.getFgColor()).toBe(neighbor?.getBgColor());
                expect(neighbor?.isInverse()).toBeFalsy();
                expect(emptyLine?.getCell(emptyText.indexOf('right'))?.isInverse()).toBeFalsy();
            }
        } finally {
            terminal.dispose();
        }
    });
});
