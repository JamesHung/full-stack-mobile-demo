name: mobile-workflow-architect
description: Use this skill whenever a user is building, reviewing, or improving a mobile engineering workflow — especially for Flutter, React Native, or Kotlin Multiplatform (KMP) projects. Trigger on any of these signals: the user shares an Agent.md, AGENTS.md, or workflow doc for a mobile project; asks how to set up or improve CI/CD for a mobile app; wants to know which AI agents (Codex, Gemini CLI, Copilot, Cursor) should handle which tasks; asks about cross-platform code sharing strategy; mentions release gates, test coverage, or smoke test gaps in a mobile context; wants to audit their dev-to-production pipeline; or says things like "review my mobile workflow", "how should I structure my Flutter CI", "is my KMP architecture testable", "help me decide what Copilot vs Gemini should do", or "we're shipping to both iOS and Android and our release process is a mess". When in doubt, use this skill — it's better to apply it and trim scope than to miss a workflow improvement opportunity.
---

# Mobile Workflow Architect

## Mission
Analyze a mobile engineering workflow end to end and turn it into an executable, testable, and reviewable system.

Focus areas:
- Flutter
- React Native
- Kotlin Multiplatform (KMP)
- AI-assisted development workflows
- Spec-driven implementation
- CI/CD and release validation

---

## When to Use This Skill

Use this skill when the user asks to:
- Review an Agent.md, AGENTS.md, or skill design for a mobile project
- Optimize a mobile development-to-CI/CD workflow
- Decide how Codex, Gemini CLI, Copilot, Cursor, or other agents should collaborate
- Extract repeated implementation or review patterns into reusable skills
- Audit testability for a cross-platform mobile codebase
- Identify missing platform-specific validation
- Improve release safety, automation, or review quality

Do not use this skill for:
- Feature implementation only, with no workflow or architecture concerns
- Framework-specific bug fixes that don't touch the delivery pipeline
- Pure UI design with no engineering workflow component
- Isolated code review with no workflow or architecture scope

---

## Required Analysis Flow

Work through these six steps in order. Each step informs the next: you can't assign agent responsibilities (Step 6) without understanding the delivery shape (Step 1), and you can't recommend CI gates (Step 5) without knowing the test coverage (Step 4). If the user's input doesn't contain enough information to complete a step, state what's missing and make a reasonable assumption — mark it with `[ASSUMPTION]` so the user can correct it.

---

### Step 1 — Identify Delivery Shape

Establish the structure of the project and its delivery pipeline before anything else.

Determine:
- **Framework**: Flutter / React Native / KMP / hybrid
- **App topology**: single app / mono repo / multi-package / white-label
- **Delivery stages**: local dev → review → CI → release candidate → production
- **AI agent roles**: who generates, who reviews, who validates, who gates merge/release

Output a short **Workflow Map** covering:
- The stages in sequence
- Which humans and agents act at each stage
- The top 2–3 bottlenecks or gaps you can already see

**Example Workflow Map (abbreviated):**
```
local dev (Copilot) → PR review (Gemini CLI lint + human) → CI (GitHub Actions: test + build matrix) → RC build (manual sign-off) → store submission (human only)
Gaps: no E2E smoke on RC build; Android signing not scripted; no nightly regression
```

---

### Step 2 — Detect Repeated Patterns

Identify patterns that appear more than once in the workflow — these are candidates for extraction into reusable skills, scripts, or shared commands.

Look for:
- Repeated review instructions or checklists
- Repeated build/test commands run by hand
- Repeated release preparation steps
- Repeated explanations of platform differences
- Repeated E2E setup steps
- Repeated spec-to-implementation conversion prompts

Output:
- A list of **components to extract**, with recommended names
- For each: suggested file/folder location and ownership (human vs. agent)

---

### Step 3 — Validate Cross-Platform Boundaries

Check whether the workflow explicitly handles platform-specific differences. This is where cross-platform projects most commonly have silent gaps — logic that works on one platform and silently fails on the other.

For each area below, state: shared / platform-specific / missing validation.

| Area | Check |
|------|-------|
| Navigation | Stack/tab handling consistent across platforms? |
| Push notifications | Permission prompts, payload handling, background behavior |
| Auth / session restore | Token refresh, biometrics, background session on cold start |
| Deep links / universal links | iOS Associated Domains vs Android App Links |
| Local storage / offline mode | SQLite, Hive, MMKV — path and migration behavior |
| Permissions | Runtime permission flow on Android vs iOS |
| Performance instrumentation | Frame timing, startup trace, memory profiling |
| Release signing | iOS provisioning + Android keystore — scripted or manual? |
| Crash and analytics hooks | Same event schema on both platforms? |
| Native module boundaries | FFI, MethodChannel, or TurboModule boundaries tested? |

Output:
- **Shared logic candidates** — what can safely live in shared code
- **Platform-specific logic candidates** — what must be handled per platform
- **Missing validation points** — where the workflow has no check at all

If you don't have enough information about a specific area, mark it `[ASSUMPTION: treating as shared — confirm this]`.

---

### Step 4 — Audit Testability

Classify validation by layer, then identify gaps. Be concrete: name the test tool, the file path or module, and the specific scenario being covered or missed.

#### Unit Tests
Use for: domain logic, reducers/state transitions, validation/formatters, mapping/serialization, retry/backoff/queue logic.
- Flutter: `flutter test`
- React Native: `jest`
- KMP: shared module tests (kotest or kotlin.test)

#### Integration Tests
Use for: repository/storage interactions, bridge boundaries, API client behavior, feature module composition, dependency wiring.
- Flutter: `flutter test` with fake dependencies
- React Native: `jest` with MSW or similar
- KMP: platform host app + shared module wired together

#### E2E Tests
Use for: sign-in and onboarding, purchase/subscription/payment flows, deep link handling, offline/online recovery, critical user journeys, release smoke tests.
- Flutter: `flutter test integration_test`
- React Native: Maestro (preferred for new projects); Detox if already adopted
- KMP: Maestro against the compiled host app
- For cross-platform UI flow validation: Maestro is the default recommendation

Output a **Test Matrix** — a table of: layer | scenario | tool | status (covered / gap / unknown). Then identify the **minimum smoke suite** needed to safely gate a merge and a release.

**Example Test Matrix (abbreviated):**
```
Unit       | Auth token refresh logic     | flutter test       | covered
Unit       | Cart total calculation       | jest               | covered
Integration| Repo → SQLite write/read     | flutter test       | gap
E2E        | Sign-in → home screen        | maestro            | covered
E2E        | Deep link → product page     | maestro            | gap (iOS only tested)
```

---

### Step 5 — Audit CI/CD and Release Gates

Map every automated check to the stage where it belongs. The goal is to catch issues as early as possible, avoid blocking fast feedback loops with slow checks, and ensure nothing reaches production without human sign-off on security-sensitive changes.

Review stages:
- Pre-commit / pre-push
- PR validation
- Merge to main
- Nightly regression
- Release candidate build
- App store / Play Store submission

For each stage, flag:
- **Missing checks**: what should run but doesn't
- **Misplaced checks**: what runs too late (or too early, slowing PRs)
- **Stale instructions**: agent prompts or scripts that reference outdated commands, paths, or APIs
- **Missing artifacts**: build outputs, screenshots, or test reports not being saved
- **Missing rollback path**: what happens if a release needs to be pulled

Output a **Stage-to-Check Mapping** with three columns: `blocks merge`, `warns only`, `runs nightly`.

---

### Step 6 — Assign AI Agent Responsibilities

Recommend which agent is best suited to each task, based on the workflow shape identified in Step 1. If the team uses only one agent, adapt the recommendations accordingly — don't assume a multi-agent setup.

**Default guidance:**
- **Codex / Copilot / Cursor**: implementation, scaffolding, refactor, command generation
- **Gemini CLI**: review, critique, policy checks, instruction drift detection
- **Human reviewer**: architectural boundaries, security decisions, release approvals, UX tradeoffs

**Hard stops — never recommend AI-only approval for:**
- Security-sensitive changes (auth, session, permissions)
- Payment or subscription flows
- Release signing changes
- App store submission logic
- Large refactors crossing platform boundaries

If the user is on a single-agent setup, assign these categories to human review explicitly rather than leaving them unassigned.

Output a **Responsibility Matrix** (agent | task category | escalation trigger) and a list of **escalation points** requiring human review.

---

## Output Format

Your response must include all eight sections below, in this order. Keep each section focused — prefer a tight table or a short bulleted list over long prose. Every recommendation should name the delivery stage it belongs to.

### 1. Workflow Summary
2–4 sentences on the current state: framework, topology, major delivery stages, and the single biggest risk you've identified.

### 2. Immediate Risks
Up to 5 risks, ranked by severity. Each risk: one line description + the delivery stage it affects + what breaks if unaddressed.

### 3. Reusable Skills to Extract
Table: skill name | what it does | recommended owner | priority (now / soon / later).

### 4. Cross-Platform Gaps
Table derived from Step 3. Columns: area | shared or platform-specific | validation status | recommended action.

### 5. Recommended Test Matrix
Table derived from Step 4. Columns: layer | scenario | tool | status. End with the minimum smoke suite for merge and release.

### 6. CI/CD Stage Recommendations
Table: stage | checks that should run | blocks merge? | runs nightly?

### 7. Agent Responsibility Split
Table: agent | task categories | escalation trigger. Include the hard-stop list at the bottom.

### 8. Immediate Next Actions
Up to 5 specific, ordered actions the team should take this week. Each action: what to do + who does it + what it unblocks.

---

## Output Rules

- Be concrete, not generic. "Add integration tests for the auth repository" beats "improve test coverage."
- Prefer executable commands over abstract advice.
- Tie every recommendation to a delivery stage.
- Distinguish shared logic from platform-specific logic — never conflate them.
- Mark uncertain recommendations with `[ASSUMPTION]` and invite the user to correct them.
- If the user provided a repo structure, Agent.md, or workflow draft, quote the specific lines or sections that contain weaknesses — don't paraphrase vaguely.
- If you don't have enough information to complete a section, say so explicitly and state what you'd need.