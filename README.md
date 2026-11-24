<div align="center">

# ![Codex Powerline](assets/header.svg)

**A customizable Powerline status bar for the OpenAI Codex CLI.**

[ccstatusline](https://github.com/sirmalloc/ccstatusline), rewritten for Codex.
See your model, context, usage limits, and Git state in your terminal, with
flexible layouts, themes, and a live configuration preview.

Give a ⭐ if this project helped you!

[![GitHub stars](https://img.shields.io/github/stars/powerline-dev/codex-powerline-cli?style=social)](https://github.com/powerline-dev/codex-powerline-cli)
[![GitHub forks](https://img.shields.io/github/forks/powerline-dev/codex-powerline-cli?style=social)](https://github.com/powerline-dev/codex-powerline-cli/forks)
[![GitHub watchers](https://img.shields.io/github/watchers/powerline-dev/codex-powerline-cli?style=social)](https://github.com/powerline-dev/codex-powerline-cli)

[![npm version](https://img.shields.io/npm/v/@powerline-dev/codex-powerline-cli?logo=npm)](https://www.npmjs.com/package/@powerline-dev/codex-powerline-cli)
[![Monthly npm downloads](https://img.shields.io/npm/dm/@powerline-dev/codex-powerline-cli?logo=npm)](https://www.npmjs.com/package/@powerline-dev/codex-powerline-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Made with Bun](https://img.shields.io/badge/Made%20with-Bun-000000?logo=bun)](https://bun.sh/)
[![Node.js: 22.12+](https://img.shields.io/badge/Node.js-22.12%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

[![GitHub issues](https://img.shields.io/github/issues/powerline-dev/codex-powerline-cli)](https://github.com/powerline-dev/codex-powerline-cli/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/powerline-dev/codex-powerline-cli)](https://github.com/powerline-dev/codex-powerline-cli/pulls)
[![GitHub contributors](https://img.shields.io/github/contributors/powerline-dev/codex-powerline-cli)](https://github.com/powerline-dev/codex-powerline-cli/graphs/contributors)

![Two Powerline rows with the model, reasoning effort, Git branch, context usage, working directory, and usage limits](docs/powerline-preview.png)

</div>

## Contents

- [Install](#-install)
  - [Windows](#-windows)
  - [macOS](#-macos)
  - [Linux](#-linux)
- [Configure with Codex](#configure-with-codex)
- [Features](#-features)
- [Contributing](#-contributing)
- [Changelog](CHANGELOG.md)
- [Development](#development)
- [Author and Acknowledgments](#author-and-acknowledgments)
- [License](#license)

## Configure with Codex

The [Configure Powerline skill](.agents/skills/codex-powerline-configure/)
turns a description of your status bar into a saved layout and a preview.
It works with the npm install on Windows, macOS, and Linux. No repository
checkout, interactive Powerline editor, or MCP server is needed.

1. [Install Powerline](#-install) if needed. Skip `codex-powerline configure`.
2. In Codex, download the skill by asking:

   > Use `$skill-installer` to install the skill from
   > https://github.com/powerline-dev/codex-powerline-cli/tree/main/.agents/skills/codex-powerline-configure

3. In your next Codex message, describe your layout:

   > Use `$codex-powerline-configure` to make a two-row layout with my model,
   > reasoning effort, Git branch, and usage limits.

Codex saves the layout separately and gives you the launch command. Add
“make it my default” if you want `codex-powerline run` to use it automatically.

## 🚀 Install

The commands below apply after `@powerline-dev/codex-powerline-cli` is released on npm.
For now, use the [development setup](#development). The executable name and
settings path are unchanged.

Both npm packages install a command named `codex-powerline`. If you want to
keep both packages installed, use separate npm prefixes.

### 🪟 Windows

Install [Node.js 22.12 or newer](https://nodejs.org/en/download) if needed.
Open PowerShell and paste this block. Sign in, then save and exit the editor.

```powershell
npm install --global @openai/codex @powerline-dev/codex-powerline-cli
codex login
codex-powerline configure
codex-powerline run
```

**Update Powerline**

```powershell
npm install --global @powerline-dev/codex-powerline-cli@latest
```

**Uninstall Powerline**

```powershell
npm uninstall --global @powerline-dev/codex-powerline-cli
```

If PowerShell blocks scripts, paste the same commands into Command Prompt.
If the separators look like boxes, try a Nerd Font in Windows Terminal.

### 🍎 macOS

Install [Node.js 22.12 or newer](https://nodejs.org/en/download) if needed.
Open Terminal and paste this block. Sign in, then save and exit the editor.

The package includes a Nerd Font and installs it automatically. In Apple
Terminal, setup selects it for your current profile; allow Terminal automation
if macOS asks. Other terminal apps may require selecting the font in settings.

```sh
npm install --global @openai/codex @powerline-dev/codex-powerline-cli
codex login
codex-powerline configure
codex-powerline run
```

**Update Powerline**

```sh
npm install --global @powerline-dev/codex-powerline-cli@latest
```

**Uninstall Powerline**

```sh
npm uninstall --global @powerline-dev/codex-powerline-cli
```

### 🐧 Linux

Install [Node.js 22.12 or newer](https://nodejs.org/en/download) if needed.
Open a terminal and paste this block. Sign in, then save and exit the editor.

```sh
npm install --global @openai/codex @powerline-dev/codex-powerline-cli
codex login
codex-powerline configure
codex-powerline run
```

**Update Powerline**

```sh
npm install --global @powerline-dev/codex-powerline-cli@latest
```

**Uninstall Powerline**

```sh
npm uninstall --global @powerline-dev/codex-powerline-cli
```

Uninstalling Powerline keeps Codex CLI, your saved layout, and installed fonts.

## ✨ Features

- 🎨 **Make it yours.** Stack rows, pick a theme, and tweak colors and separators with a live preview.
- ⏱️ **Know what’s left.** See context usage and your 5-hour and weekly limits at a glance.
- 🧠 **See what Codex is using.** Show the active model, reasoning effort, token counts, and cache stats.
- 🌿 **Stay oriented.** Show your working folder, Git or Jujutsu status, and Codex workspace and permissions.
- 📦 **Take your layout with you.** Export your setup as JSON and import it on another machine.

Import [Author’s Favorite](https://github.com/powerline-dev/codex-powerline-core/blob/main/configTemplates/authors-favorite.json) for a Minimal theme layout with a working-folder row and four aligned columns. Widgets reserve space when data is missing.

## Development

Install Bun and clone [Core](https://github.com/powerline-dev/codex-powerline-core) and this repository side by side. From this repository, run:

```sh
cd ../codex-powerline-core
bun install --frozen-lockfile
bun run build
cd ../codex-powerline-cli
bun install --frozen-lockfile
bun run start configure
bun test
bun run lint
bun run build
node dist/codex-powerline.js --config ./configTemplates/powerline.json run
```

The Bun resolution links to the sibling Core checkout. Rebuild Core after shared changes.
The published npm package uses a versioned Core dependency.

See [AGENTS.md](AGENTS.md) for the project map and reusable development workflows.
See the [release skill](.agents/skills/codex-powerline-release/SKILL.md) to
prepare and test both packages without uploading them.

## 🤝 Contributing

Contributions are welcome. Open an issue to report a bug or discuss a larger
change. For a code change, fork the repository, create a focused branch, add
tests when they fit, and open a pull request.

Before you open a pull request, run:

```sh
bun test
bun run lint
bun run build
```

## Author and Acknowledgments

**Martin Hájek** is the author and maintainer of Codex Powerline.

Based on [ccstatusline](https://github.com/sirmalloc/ccstatusline), created
by Matthew Breedlove, and rewritten for the OpenAI Codex CLI. See
[NOTICE](NOTICE) for the upstream attribution and [CHANGELOG.md](CHANGELOG.md)
for release history.

## License

MIT. See [LICENSE](LICENSE) for the terms and copyright notices.
