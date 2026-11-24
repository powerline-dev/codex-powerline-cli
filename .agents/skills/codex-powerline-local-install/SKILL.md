---
name: codex-powerline-local-install
description: Install or refresh the current Powerline checkout as the user's codex-powerline command on Windows or macOS. Use to try local changes in the user's normal terminal without publishing.
---

# Codex Powerline local install

From the repository root, build and install a tarball from the current
checkout. Build and link the sibling Core checkout as described in the README.
If dependencies are missing, run `bun install --frozen-lockfile`
before the build. The tarball can replace the installed package at the same
version without a registry release. It does not change saved layouts.

Check `npm prefix -g` and locate the existing command. If the command resolves
outside that prefix, identify which installation is first on PATH before
replacing anything. Use the user's existing writable npm prefix.

For an unpublished Core version, pack the sibling checkout into a temporary
folder first. Set `$corePackage` (PowerShell) or `core_package` (macOS) to
its absolute tarball path. After Core is on npm, use the matching
`@powerline-dev/codex-powerline-core@<version>` instead.

## Windows (PowerShell)

Locate the command with `Get-Command codex-powerline -All`. Use the npm
`.cmd` shims if PowerShell blocks scripts.

```powershell
$bunBin = Join-Path $env:USERPROFILE '.bun/bin'
if (!(Get-Command bun -ErrorAction SilentlyContinue) -and (Test-Path -LiteralPath (Join-Path $bunBin 'bun.exe'))) {
    $env:Path = "$bunBin;$env:Path"
}
bun run build
if ($LASTEXITCODE -ne 0) { throw 'Powerline build failed' }

$packDir = Join-Path ([IO.Path]::GetTempPath()) ('codex-powerline-' + [guid]::NewGuid())
[void][IO.Directory]::CreateDirectory($packDir)
$tarball = $null
try {
    $packName = npm.cmd pack --pack-destination $packDir --silent
    if ($LASTEXITCODE -ne 0 -or $packName -notmatch '^powerline-dev-codex-powerline-cli-[^\\/]+\.tgz$') {
        throw 'npm pack did not produce the expected tarball'
    }
    $tarball = Join-Path $packDir $packName
    npm.cmd install --global $corePackage $tarball
    if ($LASTEXITCODE -ne 0) { throw 'Local Powerline installation failed' }
} finally {
    if ($tarball) { Remove-Item -LiteralPath $tarball }
    [IO.Directory]::Delete($packDir)
}
```

## macOS

Locate the command with `command -v codex-powerline`. Installing the tarball
exercises the built Node entry point, bundled assets, and macOS postinstall.

```sh
(
  set -eu
  bun run build
  pack_dir="$(mktemp -d)"
  tarball=
  trap 'test -z "$tarball" || unlink "$pack_dir/$tarball"; rmdir "$pack_dir"' EXIT
  tarball="$(npm pack --pack-destination "$pack_dir" --silent)"
  npm install --global "$core_package" "$pack_dir/$tarball"
)
```

## Verify

Check which command will run and compare its `--version` with `package.json`.
Use `codex-powerline.cmd --version` on Windows if needed. A matching version
alone does not prove the checkout was installed: check the changed behavior
through the installed command, or compare the built and installed `dist/`
files if there is no visible behavior to test. Pass a temporary `--config`
and a sample payload for render checks. Use an isolated `CODEX_HOME` for
terminal smoke tests. Reopen the editor or restart a running launcher to use
the updated build.
