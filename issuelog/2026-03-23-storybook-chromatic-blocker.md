# 2026-03-23 Storybook Chromatic Blocker

## Problem Analysis

Attempting to complete `T065` by wiring Chromatic exposed a build blocker before
Chromatic upload could run. The repository token was available, but
`corepack pnpm storybook:build` failed repeatedly under both Vite and Webpack
Storybook builders.

Observed failures included:

- Missing builder/preset resolution when trying `@storybook/react-vite`
- Vite/Storybook internal runtime resolution failures during preview build
- Webpack preview compilation failures because app and shared sources still
  expose TypeScript syntax (`import type`, TS prop annotations) that the current
  Storybook pipeline is not transpiling for stories imported from `app/` and
  `packages/shared/`

## Root Cause

There were two separate root causes:

- The repo did not yet have a stable Storybook build toolchain for this
  monorepo layout, especially for TypeScript sources imported from `app/` and
  `packages/shared/`
- Storybook React renderer peers were resolved inconsistently, which left
  `@storybook/react-webpack5` using `react 18.3.1` together with
  `react-dom 19.2.4`; this broke story mount at runtime with
  `Cannot read properties of undefined (reading 'S')`

## Resolution

The blocker was reduced to two concrete fixes:

- Switch Storybook to a working Webpack 5 pipeline for this repo
- Add explicit transpilation/alias handling for `app/` and `packages/shared/`

Implemented changes:

- Added a real `storybook:build` script and a `chromatic` script
- Added Chromatic dependency wiring
- Added Storybook aliasing for `react-native`, `expo-router`, and the shared
  package entry
- Added explicit `babel-loader` transpilation for `app/` and
  `packages/shared/`
- Simplified the note stories so Storybook can compile them reliably
- Excluded generated `storybook-static/` output from TypeScript linting

Result:

- `corepack pnpm lint` now passes
- `corepack pnpm test` now passes
- `corepack pnpm build` now passes
- `corepack pnpm storybook:build` now passes
- Local Chrome headless rendering no longer shows Storybook error overlays for
  the note stories
- Chromatic upload uses the prebuilt `storybook-static/` directory because
  Chromatic CLI v11 could not spawn `pnpm` directly in this local environment
- Chromatic build `#4` passed and auto-accepted the 4 note-story snapshots

`T065` is resolved.
