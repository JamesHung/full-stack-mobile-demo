# 2026-03-23 E2E auth and Maestro mismatch

## Problem Analysis

The app was not ready for real end-to-end execution against the FastAPI backend even though unit and backend integration tests were passing. The mobile screens could sign in successfully, but subsequent list, create, and detail requests still used a hard-coded bearer token instead of the token returned by `/auth/demo-login`. The bundled Maestro smoke flow also targeted UI copy and app identifiers that did not line up with the current app implementation.

## Root Cause

1. Authentication state stopped at the sign-in screen and was never propagated into the rest of the app.
2. `app/(tabs)/index.tsx`, `app/notes/create.tsx`, and `app/notes/[noteId].tsx` each instantiated `ApiClient` with `accessToken: "demo-token"`, which causes authorization failures against the real backend.
3. `.maestro/voice-notes-smoke.yaml` tried to tap `"Create note"` from the list screen even though the visible action there is `"Create"`, and it used a retry path that was not deterministic for the default happy-path title.
4. `app/app.json` did not declare iOS/Android package identifiers, so the Maestro `appId` had no explicit counterpart in Expo config.

## Solution

1. Added a lightweight auth session store at `app/features/auth/session.ts`.
2. Stored the real demo session after sign-in and consumed that token from list, create, and detail screens instead of the fake `demo-token`.
3. Added explicit unauthenticated UI messaging so E2E runs fail in a predictable state instead of surfacing raw backend authorization errors.
4. Updated the Maestro flow to use the actual `"Create"` entry point, create a deterministic failing note (`"fail weekly sync"`), wait for `"Retry"`, and then trigger retry.
5. Added `ios.bundleIdentifier` and `android.package` as `com.demo.voicenotes` in Expo config so the app target matches the smoke flow configuration.
