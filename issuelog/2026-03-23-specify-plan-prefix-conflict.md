# 2026-03-23 Specify plan prefix conflict

## Problem Analysis

Running `.specify/scripts/bash/setup-plan.sh --json` failed even though the current branch matched the feature naming convention. The failure only appeared after the feature spec had already been created and committed. The script reported that more than one spec directory existed with the prefix `001`, which blocked plan generation for the current feature.

## Root Cause

1. The feature was created as `001-ci-maestro-simulator` while the repository already contained `specs/001-voice-notes-summary`.
2. `.specify` plan setup resolves feature paths by numeric prefix and assumes that each prefix maps to exactly one spec directory.
3. Because the earlier feature-creation step only checked for matching short-name collisions, it did not prevent a numeric-prefix collision with an unrelated spec.

## Solution

1. Renamed the working branch from `001-ci-maestro-simulator` to `002-ci-maestro-simulator`.
2. Moved the feature directory from `specs/001-ci-maestro-simulator` to `specs/002-ci-maestro-simulator`.
3. Updated intra-spec references so follow-up `.specify` commands can resolve the feature cleanly.
4. Re-ran the plan setup workflow after the rename to continue artifact generation.
