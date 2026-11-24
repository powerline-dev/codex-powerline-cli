---
name: codex-powerline-configure
description: Create or update a user's Codex Powerline layout from a plain-language request without using the interactive editor. Use for settings files, presets, and layout previews, not for adding widgets or changing Codex's own configuration.
---

# Configure Codex Powerline

Use the user's installed Powerline CLI. A source checkout and Bun are not
needed. For a global npm install, the package files are in the
`codex-powerline-cli` folder under the path from `npm root -g`. Check that its
version matches `codex-powerline --version` before using its files. Use the
source CLI only when the user wants to configure a checkout.

1. Turn the request into widget choices, row order, and a plain or Powerline
   style. Infer routine details from the current layout or the closest
   shipped preset in `configTemplates/`. Ask only when a missing choice
   changes the result in a way that matters to the user.
2. Reuse widget IDs and settings from the shipped presets. For widgets or
   options outside those presets, get the release commit with
   `npm view codex-powerline-cli@<version> gitHead`. Read the relevant files
   from [powerline-dev/codex-powerline-cli](https://github.com/powerline-dev/codex-powerline-cli)
   at that commit without cloning it. The catalog is in
   `src/utils/widget-manifest.ts`, and widget-specific options are in `src/widgets/`. Follow shared imports to
   [Core](https://github.com/powerline-dev/codex-powerline-core) at the CLI release’s Core version. Use unique item IDs.
   If you cannot check that the installed version supports a widget or
   option, tell the user instead of guessing or using the latest source.
3. Create a named JSON layout, such as `powerline.local.json`, unless the user
   asks to update a specific file or set the default. Without `--config`,
   Powerline uses `~/.config/codex-powerline/settings.json` on all supported
   platforms. For an update, read the target, preserve unrelated settings,
   and keep a backup before replacing it. Do not change Codex's
   `config.toml` or add executable widgets unless the user requests them.
4. Validate a temporary draft with the installed CLI. Pipe the package's
   `scripts/payload.example.json` into
   `codex-powerline --config "<draft-path>" render`. Treat warnings that the
   renderer used defaults as a failed check. Check that the requested rows
   and widgets render: unknown IDs pass schema validation but do not render.
   Add synthetic fields to a copy of the payload if the example lacks data
   for a requested widget. Omit any `custom-command` items from the temporary
   render copy so the preview does not execute them. Keep them in the saved
   layout if they were already there or the user asked for them.
5. Save the checked config and show the file path and the preview. For a
   named layout, give the command
   `codex-powerline --config "<saved-path>" run`. For the default layout,
   `codex-powerline run` is enough. Do not start an interactive session to
   check settings.

## Share a repository preset

For a shared preset such as Author’s Favorite, follow the branch and pull
request workflow in `AGENTS.md`: fetch `origin/main`, start a new branch
from it, and open a pull request into `main` after checking the preset.
Keep local-only config edits out of Git. When using a personal layout as
the source, copy its portable widgets and styling, not machine-specific
paths, credentials, or installation settings. Use the checkout CLI to
check options added on `main` but not yet in the npm package.
