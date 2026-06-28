# Walking Dog Precise Native Figma Rebuild

This folder contains a Figma plugin that generates a native, editable Figma design
file from the HTML design reference at:

`/Users/matsuokashuhei/Development/walking-dog/docs/design.html`

The plugin does not import the HTML as an image. It rebuilds the design with Figma
frames, text, vector paths, fills, local styles, variables, components, and component
variants.

## How to Generate the Figma File

Opening the Figma URL by itself does not run the generator. The linked file is
only the target canvas. Run the local Development Plugin inside Figma Desktop to
populate it.

1. Open Figma Desktop.
2. Create a new blank design file.
3. Go to `Plugins > Development > Import plugin from manifest...`.
4. Select `docs/figma/precise-native-figma/manifest.json`.
5. Run `Walking Dog Precise Native Rebuild`.

The plugin creates these pages by default:

- `Cover + Design System`
- `Components`
- `Screens`

`Cover` and `Design System` are built as separate sections on the first page so
the generator works on Figma Starter, which has a 3-page limit. On a plan that
allows more pages, the generator can be adjusted to split them back into four
pages: `Cover`, `Design System`, `Components`, and `Screens`.

## Figma MCP Status

A Figma file was created through the MCP integration:

https://www.figma.com/design/fUOUqTXrSFh89FRjhP49yp

Direct MCP generation did not complete because the current Figma account hit
Starter-plan page and MCP tool-call limits. The MCP write attempts failed
atomically, so the linked file may still be blank. Use the local Development
Plugin above to generate the editable native Figma file in Figma Desktop.

## What Is Included

- Local color styles for the Precise light/dark palette, semantic colors, and map colors.
- Local text styles for the iOS-inspired type scale.
- Figma variables for spacing, radius, and core sizing tokens.
- Component variants for buttons, tab bars, tags, and dog avatars.
- Reusable native component structures for phone chrome, map surfaces, forms, cards,
  metric grids, charts, dog rows, avatars, and walk controls.
- All 19 artboards represented by the HTML spec:
  - Onboarding: Sign In, Sign Up
  - Dogs: list, detail, edit, walking goal, walk detail
  - Walk: no dogs, start, active, finish, save sheet
  - Group Walk: start, active, minimized, finish
  - Me: settings, profile, edit profile

## Source Analysis Summary

The HTML spec is a self-unpacking bundle with:

- 22 bundled assets.
- 19 WOFF2 font assets.
- 3 JavaScript runtime assets.
- One React/Babel source payload defining the screens and shared primitives.
- Inline SVG icons for paw, tab bar, satellite, pause/play, route, camera, plus, and
  no-dog empty-state treatments.

The visual system uses:

- iOS grouped backgrounds and large-title navigation.
- A neutral-first light/dark palette.
- Blue tint for actions, green for walk progress/start, red for destructive/live, and
  orange/purple accents.
- Glass-like tab bars and walk-control sheets.
- Editable vector route maps rather than screenshots.

## Product Axes

- Dog experience: preserves dog, pack, group-walk, and per-dog event surfaces.
- Walk data: preserves distance, duration, pace, route, event logs, goal progress, and
  weekly charts.
- Owner contribution: preserves streaks, achievements, save feedback, and profile
  contribution screens.

## Verification

The generator has been checked with:

```bash
node --check docs/figma/precise-native-figma/code.js
```

It was also executed against a lightweight local Figma API mock to verify page and
node generation flow.
