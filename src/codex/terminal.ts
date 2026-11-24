import type {
    IBufferCell,
    Terminal
} from '@xterm/headless';

const ESC = '\x1b';
const RESET = ESC + '[0m';

function style(cell: IBufferCell): string {
    if (cell.isAttributeDefault())
        return RESET;

    const codes: (string | number)[] = [0];
    if (cell.isBold())
        codes.push(1);
    if (cell.isDim())
        codes.push(2);
    if (cell.isItalic())
        codes.push(3);
    if (cell.isUnderline())
        codes.push(4);
    if (cell.isBlink())
        codes.push(5);
    if (cell.isInverse())
        codes.push(7);
    if (cell.isInvisible())
        codes.push(8);
    if (cell.isStrikethrough())
        codes.push(9);
    const fg = cell.getFgColor();
    const bg = cell.getBgColor();
    const rgb = (color: number) => [color >> 16 & 255, color >> 8 & 255, color & 255];
    if (cell.isFgPalette())
        codes.push(38, 5, fg);
    if (cell.isBgPalette())
        codes.push(48, 5, bg);
    if (cell.isFgRGB())
        codes.push(38, 2, ...rgb(fg));
    if (cell.isBgRGB())
        codes.push(48, 2, ...rgb(bg));
    return ESC + '[' + codes.join(';') + 'm';
}

const move = (row: number, column = 1) => ESC + '[' + String(row) + ';' + String(column) + 'H';

export function paintTerminal(
    screen: Terminal,
    footer: string[],
    rows: number,
    cursorVisible: boolean,
    lastFrame: string[]
): string {
    const lines = screen.buffer.active;
    let draw = ESC + '[?25l';
    for (let row = 0; row < rows; row++) {
        let rendered = '';
        if (row < screen.rows) {
            const line = lines.getLine(lines.viewportY + row);
            let previousStyle = RESET;
            for (let column = 0; line && column < screen.cols; column++) {
                const cell = line.getCell(column);
                if (!cell || cell.getWidth() === 0)
                    continue;
                const cellStyle = style(cell);
                if (cellStyle !== previousStyle) {
                    rendered += cellStyle;
                    previousStyle = cellStyle;
                }
                rendered += cell.getChars() || ' ';
            }
            if (previousStyle === RESET)
                rendered = rendered.trimEnd();
        } else {
            rendered = footer[row - screen.rows] ?? '';
        }
        if (lastFrame[row] !== rendered) {
            draw += move(row + 1) + RESET + ESC + '[2K' + rendered + RESET;
            lastFrame[row] = rendered;
        }
    }
    if (lines.viewportY === lines.baseY) {
        draw += move(lines.cursorY + 1, Math.min(screen.cols, lines.cursorX + 1));
        if (cursorVisible)
            draw += ESC + '[?25h';
    }
    return draw;
}
