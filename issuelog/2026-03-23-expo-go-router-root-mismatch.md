# 2026-03-23 Expo Go router root mismatch

## Problem Analysis

Expo Go on iOS could fetch and bundle `expo-router/entry`, but the app did not reliably transition into the intended note screens. Earlier debugging also showed intermittent `ExpoLinking` and route-loading confusion, which made the issue look like a native module or simulator problem.

## Root Cause

The Expo project root is `/Users/hungming-hung/repo/ai-project/full-stack-demo/app`, so Expo Router expects route files under `app/app/`. The repo's screens were implemented at the project root level (`app/sign-in.tsx`, `app/notes/create.tsx`, `app/(tabs)/index.tsx`, etc.), which are valid source files but not valid Expo Router route entries for this project layout.

This created a misleading state:

- Metro could still bundle `expo-router/entry`
- Expo Go could still open the dev URL
- but the route tree that Expo Router expected was missing

## Solution

1. Added a real Expo config at `app/app.json` with `scheme`, `expo-router` plugin, and `newArchEnabled`.
2. Created route wrappers under `app/app/`:
   - `app/app/_layout.tsx`
   - `app/app/index.tsx`
   - `app/app/sign-in.tsx`
   - `app/app/(tabs)/_layout.tsx`
   - `app/app/(tabs)/index.tsx`
   - `app/app/notes/create.tsx`
   - `app/app/notes/[noteId].tsx`
3. Kept the existing screen implementations in their original files and re-exported them through the correct route tree.
4. Added explicit `expo-linking` and `@babel/runtime` dependencies in `app/package.json` so Metro could resolve Router-related wrappers cleanly in the workspace.
5. Ignored Expo-generated local artifacts (`app/ios/`, `app/tsconfig.json`) and simulator screenshots to keep the worktree clean during Expo Go QA.

## Verification

- `expo start --clear --ios` bundled successfully
- Expo Go rendered `sign-in`
- Deep-link navigation successfully rendered `list`, `create`, and `detail` screens
- No manual Expo Go onboarding tap was required after the route root fix
