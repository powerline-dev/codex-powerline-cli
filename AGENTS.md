# Codex Powerline

Codex Powerline is a TypeScript terminal status bar for the OpenAI Codex CLI.
It is an independent project maintained by Martin Hájek. Keep the upstream
MIT attribution in `LICENSE` and `NOTICE`. Do not add dependencies on another
assistant's runtime, config files, credentials, or transcript format.

## Development

- Clone and build Core in `../codex-powerline-core` before installing the CLI.
  The Bun resolution is for local development, not an npm dependency path.

- Install dependencies with `bun install --frozen-lockfile`.
- Run the editor from source with `bun run start configure`.
- Use `bun test <path>` for a focused check and `bun test` for the full suite.
- Keep release notes in `CHANGELOG.md`, not in the README.
- Use the release skill to prepare and validate npm packages without publishing.
- Keep the README short. Give each supported platform one self-contained section
  with copy-paste commands for install, first launch, update, and uninstall.
  Link to prerequisite installers instead of duplicating their instructions.
- Run `bun run lint` and `bun run build` before completing runtime changes.
- Test the built Node entry point as well as source when you change a launch
  path. The published package runs on Node.js, while Bun builds it.
- When the user asks to keep their development install current, refresh
  it after runtime changes using the local-install skill.
- Use isolated settings and `CODEX_HOME` for integration checks. Do not write
  to the developer's Codex config just to smoke-test the provider.

## Branches and pull requests

Start each new repository change on its own branch from the latest
`origin/main`. Fetch first, fast-forward local `main` when possible, and
avoid carrying changes from another task branch. After validation, commit
and push the task branch and open a pull request into `main`. Do not merge
it unless asked. Skip Git changes for local settings work or when the user
asks to keep the work local.

## Project map

| Area | Location |
| --- | --- |
| CLI and terminal renderer | `src/codex-powerline.ts`, `src/utils/status-render.ts`, `src/utils/renderer.ts` |
| Multiline CLI and App Server bridge | `src/codex/` |
| Ink editor and preview | `src/tui/` |
| Widgets and registry | `src/widgets/`, `src/utils/widget-manifest.ts` |
| Settings files and backups | `src/utils/config.ts` |

Schemas, migrations, themes, shared widgets, and presets are in Core.
Preserve older layout imports. Unknown widget IDs stay in saved settings and
do not render. Do not register a widget that has no Codex data or other
supported local source. Keep README examples usable from an unpublished checkout.

## Project skills

- [codex-powerline-configure](.agents/skills/codex-powerline-configure/SKILL.md):
  create and preview a user's Powerline settings without the interactive editor.
- [codex-powerline-widgets](.agents/skills/codex-powerline-widgets/SKILL.md):
  add or change widgets, editor previews, themes, and renderer behavior.
- [codex-powerline-cli](.agents/skills/codex-powerline-cli/SKILL.md):
  change or test the multiline launcher, App Server bridge, or telemetry adapter.
- [codex-powerline-local-install](.agents/skills/codex-powerline-local-install/SKILL.md):
  build, install, and verify the current checkout on Windows or macOS.
- [codex-powerline-release](.agents/skills/codex-powerline-release/SKILL.md):
  prepare versions and release notes, and validate packages without publishing.
