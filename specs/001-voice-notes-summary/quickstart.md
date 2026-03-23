# Quickstart: Voice Notes Summary

This repo now contains the scaffold for the `001-voice-notes-summary` feature. The commands below reflect the local workflow validated in this turn.

## Workspace Layout

```text
app/                # Expo-managed React Native app
backend/            # FastAPI API + worker package managed by uv
packages/shared/    # Shared note status, DTOs, validators, formatters
.storybook/         # Shared UI stories for reusable mobile components
```

## Bootstrap Flow

1. Install JavaScript dependencies at the repo root with `corepack pnpm install`.
2. Install backend dependencies with `uv sync --directory backend`.
3. Copy backend environment defaults from `.env.example` to `.env` and provide local values for API keys, storage path, and demo auth secret.
4. Start the backend API and worker in separate terminals.
5. Start the Expo mobile app and connect an iOS simulator, Android emulator, or Expo Go client.

## Development Commands

```bash
corepack pnpm install
uv sync --directory backend
corepack pnpm --filter app start
uv run --directory backend fastapi dev backend/src/main.py
uv run --directory backend python -m backend.src.workers.notes
```

## Regression Commands

Run these before finalizing implementation changes for this feature:

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm build
uv run --directory backend pytest --cov=backend.src --cov-report=term-missing
```

## Regression Record

Validated on 2026-03-23 with these commands:

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm test
corepack pnpm build
uv run --directory backend pytest --cov=backend.src --cov-report=term-missing
```

If shared UI primitives such as `StatusBadge`, `NoteCard`, or `ResultPanel` are introduced, add Storybook coverage and run the Chromatic CI check for those states. Chromatic baseline approval remains a separate CI step.

## Demo Script

1. Use the demo login action in the app.
2. Create a new voice note and upload an audio clip.
3. Verify the list shows `uploaded` then `processing`.
4. Open the note detail and observe short auto-refresh while the note is still in progress; use list refresh when returning to the note list.
5. Confirm transcript, summary, and tags render.
6. Force a failure path with an invalid or synthetic failing sample and verify the retry affordance.
