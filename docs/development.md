# Development

Install [Bun](https://bun.sh/) and clone this repository. It contains the CLI,
settings schemas, migrations, themes, widgets, tests, and layout presets.

```sh
git clone https://github.com/powerline-dev/codex-powerline-cli.git
cd codex-powerline-cli
bun install --frozen-lockfile
bun run start configure
bun test
bun run lint
bun run build
node dist/codex-powerline.js --config ./configTemplates/powerline.json run
```

Settings contracts live in `src/types/`, migrations and themes in `src/utils/`,
widgets in `src/widgets/`, and shipped presets in `configTemplates/`.
Existing layouts, widget IDs, and settings paths remain compatible.

See [AGENTS.md](../AGENTS.md) for the project map and development workflows.
The [VS Code extension](https://github.com/powerline-dev/codex-powerline-vscode)
launches the installed CLI and uses the same settings and widgets.

## Release preparation

Update `package.json` and [CHANGELOG.md](../CHANGELOG.md), then run:

```sh
bun run release:dry-run
```

This checks lint, tests, the build, and the packed CLI installed in a temporary
npm prefix. The CLI is the only npm package to release; no sibling checkout
or separate core package is needed. See the
[release skill](../.agents/skills/codex-powerline-release/SKILL.md) for details.
When ready, `bun run release` validates and publishes the CLI package.

## Automatic npm releases

GitHub Actions validates each push to `main` and publishes the CLI only if
`package.json` has a stable version newer than every stable version on npm.
Ordinary commits that keep the published version run the checks without publishing.

Set up [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) once:

1. In GitHub, create the `npm-release` environment. Under **Deployment branches
   and tags**, allow only the `main` branch. Do not add required reviewers if
   you want publishes to run without manual approval.
2. In the npm package settings for `@powerline-dev/codex-powerline-cli`, add a
   GitHub Actions trusted publisher. Use organization `powerline-dev`, repository
   `codex-powerline-cli`, workflow `publish-npm.yml`, and environment `npm-release`.
   Allow `npm publish`. No npm token or GitHub Actions secret is needed.
3. Push the version and changelog commit to `main`. To retry after setup, run
   **Publish CLI to npm** from the Actions tab with `main` selected.

## Contribution checks

Contributions are welcome. Open an issue to report a bug or discuss a larger
change. For a code change, fork the repository, create a focused branch, add
tests when they fit, and open a pull request.

Before you open a pull request, run:

```sh
bun test
bun run lint
bun run build
```

[Back to the project README](../README.md)
