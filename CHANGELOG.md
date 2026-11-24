# Changelog

## 1.0.4

- Add a **Reserve space** option for widgets. It keeps their cells in place
  when data is missing, such as before a chat reports context usage.
- Update Author’s Favorite with the Minimal theme, a working-directory row,
  and four aligned columns. Show Git Ahead/Behind when both counts are zero.
- Refresh Git Ahead/Behind when the local branch or its upstream moves, even
  when the Git cache is set to never expire.
- Fix the Fast Mode lightning symbol and its alignment in Windows terminals.
- Document how to install a checkout on Windows for local testing.

## 1.0.3

- Add the Empty widget to leave a gap that shows the terminal background
  without changing Powerline alignment. Use it in the Author’s Favorite preset.
- Match the Permissions widget to Codex’s standard modes: Ask for approval,
  Approve for me, Full Access, and Read Only.
- Document the Codex skill that creates and previews a Powerline layout from
  a plain-language request without opening the interactive editor.

## 1.0.2

- Add the optional Chat Status widget (`chat-status`) for the active chat in
  `codex-powerline run`. It shows when Codex is running, waiting for approval or
  input, or has finished a turn.

- Add Git Account (`git-account`) to show the active project’s configured Git
  email, falling back to its user name. Respects repository overrides and
  conditional includes; this identity can differ from push authentication.
- Add the Author’s Favorite preset with four aligned columns.

## 1.0.1

- Bundle MesloLGS Nerd Font Mono and its licenses. macOS npm installation
  installs the font offline and selects it for the calling Apple Terminal
  profile, with a first-launch retry when install scripts were skipped.
- Fix macOS startup failures when node-pty's terminal helper is installed
  without execute permission. Repair the permission before starting Codex.

- Added `bun run release` and `bun run release:dry-run` to validate, build, and
  publish the npm package, including checks of the built Node entry point.
- Refreshes the footer when Codex changes the model, reasoning effort, speed, or
  working directory, without waiting for a new turn.

## 1.0.0 (staged)

- Prepared the first production release for npm.
- Added an optional widget that shows the selected ChatGPT workspace in `run` mode.
- Removed the `native` and `mcp` commands. If you set up the former provider
  manually, remove its `mcp_servers.codex_powerline` table and the
  `tui.status_line_provider` entry that points to it. `run` needs neither setting.
- Added an optional Permissions widget for the active Codex permission profile
  or sandbox mode and approval policy.

## 0.1.0

- Adapted the editor, renderer, and layout format from the MIT-licensed
  [ccstatusline `0c94df7`](https://github.com/sirmalloc/ccstatusline/tree/0c94df755665ed7794f082863821fd5f428cdf60).
- Added native MCP and multiline launch modes, Codex metrics, and separate
  settings for Codex Powerline.
