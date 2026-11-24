---
name: codex-powerline-release
description: Prepare and validate Codex Powerline releases, including version bumps, release notes, and package dry runs. Use for maintainer release preparation, not npm authentication, publishing, or installation.
---

# Codex Powerline releases

Run commands from the repository root. Keep release notes in `CHANGELOG.md`.
This workflow ends once the package is ready for the maintainer. Do not sign
in to npm or upload a package.

## Prepare and validate

The CLI repository contains all source and presets. No sibling checkout or
separate package release is required.

Check `package.json`, the changelog, and the working tree. For a new release,
bump the version only if it has not already been prepared:

```sh
npm version patch --no-git-tag-version
```

Choose `minor` or `major` when appropriate. This updates the local version
without creating a Git commit or tag. Move the relevant unreleased notes into
the matching version section in `CHANGELOG.md`.

```sh
bun run release:dry-run
```

This installs dependencies, runs lint and all tests, builds the CLI, and checks
the built Node entry point with `--version` and `--help`. It then packs the CLI,
installs that tarball in a temporary npm prefix, and checks the installed Node
entry point. Nothing is uploaded. Use `npm pack --dry-run` after the build to
inspect the file list. Check that it includes `dist/codex-powerline.js`, its
chunks, `configTemplates/`, `LICENSE`, and `NOTICE`, and that the built version
matches the manifest.

Render `scripts/payload.example.json` with each shipped preset using the
installed executable. The maintainer's `bun run release` command performs the
same validation and publishes the CLI tarball. Do not run it during release
preparation.

For installer or font changes, also install the packed tarball with a temporary
`HOME`, `CODEX_HOME`, and npm global prefix. Check that `assets/fonts/` and its
licenses are packed, that macOS postinstall copies the bundled family, and that
first launch repairs an installation made with `--ignore-scripts`. Use a
throwaway Terminal profile for live font-selection checks.

## Check the version

Use the public npm version list to check whether the planned version is
already published:

```sh
npm view @powerline-dev/codex-powerline-cli versions --json
```

Report any published version conflict. The public version list and dry run
do not establish whether an unpublished version is already staged.
