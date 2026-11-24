---
name: codex-powerline-widgets
description: Add or change Codex Powerline widgets, Powerline themes, renderer layout, and widget previews or controls in the Ink editor. Use for widget settings compatibility and display bugs, not Codex App Server protocol work.
---

# Codex Powerline widgets

## Check before adding a widget

Review the full widget and layout manifests in `src/utils/widget-manifest.ts`
and `LEGACY_WIDGET_TYPE_ALIASES` in `src/utils/widget-aliases.ts`. Compare what the
request needs to the widgets' display names, descriptions, rendered output,
and editor options. Read the closest implementations in `src/widgets/`.
A different name or ID does not make a widget distinct.

- If a widget already meets the request, name it and explain how to select or
  configure it. Do not add another widget or ID.
- If an existing widget covers the same purpose but lacks the requested
  behavior, improve that widget when the change is clear. If the intended
  improvement is unclear, ask the developer what the existing widget needs to
  do differently before editing. Keep the existing widget ID.
- Add a widget only when it serves a distinct purpose and has a supported data
  source.

## Implement and check

1. Reuse shared formatters and editor controls from the closest widget.
   Register a new widget ID in `src/utils/widget-manifest.ts` and export its
   class from `src/widgets/index.ts`.
2. Give preview mode a representative sample without running commands or
   reading live session data. Use the relevant fields in `RenderContext` for
   live mode. If a field is unavailable, hide the widget or use its existing
   no-data behavior. Do not present missing usage or cost as zero.
3. Keep existing widget IDs and metadata readable. If an ID must change,
   add its old spelling to `src/utils/widget-aliases.ts`. Imported
   unknown widgets remain in the file but do not render.
4. Check the affected widget and renderer tests. Smoke-test styled output
   from the built CLI with `scripts/payload.example.json`. For a layout bug,
   include both Powerline and plain layouts when both share the changed path.

The preview and the live renderer both use the widget registry. The launcher
prints ANSI rows and supports OSC 8 links.
