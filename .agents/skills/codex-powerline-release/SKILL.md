---
name: codex-powerline-release
description: Prepare and validate Codex Powerline releases, including version bumps, release notes, and package dry runs. Use for maintainer release preparation, not npm authentication, publishing, or installation.
---

# Codex Powerline releases

Run commands from the repository root. Keep release notes in `CHANGELOG.md`.
This workflow ends once the package is ready for the maintainer. Do not sign
in to npm or upload a package.

## Prepare and validate

Release Core separately before a CLI release that needs a new Core version.
Pin the exact published Core version in the CLI's `package.json` and run
`bun install` to update the lockfile. Keep the matching release checkout in
`../codex-powerline-core` for the local Bun resolution.

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

This builds the sibling Core checkout, then runs CLI lint and tests, checks the
built Node entry point with `--version` and `--help`, and packs the CLI without
uploading anything. Use `npm pack --dry-run`
after the build to inspect a package's file list. Check that the CLI package
includes `dist/codex-powerline.js`, its chunks, `LICENSE`, and `NOTICE`, and
that the built version matches the manifest.

Pack Core and the CLI with `npm pack`. Install both tarballs in one command
into a temporary npm prefix, then run the installed executable with the sample
payload and a shipped preset. This checks the dependency without publishing
Core. The maintainer's `bun run release` command installs the CLI tarball with
its pinned Core from npm before publishing only the CLI. Do not run it during
release preparation.

For installer or font changes, also install the packed tarball with a temporary
`HOME`, `CODEX_HOME`, and npm global prefix. Check that `assets/fonts/` and its
licenses are packed, that macOS postinstall copies the bundled family, and that
first launch repairs an installation made with `--ignore-scripts`. Use a
throwaway Terminal profile for live font-selection checks.

## Check the version

Use the public npm version list to check whether the planned version is
already published:

```sh
npm view @powerline-dev/codex-powerline-core versions --json
npm view @powerline-dev/codex-powerline-cli versions --json
```

Report any published version conflict. The public version list and dry run
do not establish whether an unpublished version is already staged.
