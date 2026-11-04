# TITAN Ω Project-Wide Improvements

**Date:** 2026-11-04
**Status:** Design approved; awaiting spec review before implementation planning

## Summary

Improve TITAN Ω through focused, verified stages instead of an all-at-once rewrite. Preserve the existing product behavior and vanilla-JavaScript architecture while addressing measurable reliability, performance, mobile, and usability issues across the app.

## Current Context

- TITAN Ω is a multi-app observatory implemented primarily in `artifacts/titan-omega/index.html`.
- The app shares state and cross-app actions through its existing state manager, event bus, window manager, and workspace bridge.
- A browser smoke command is available at `artifacts/titan-omega/scripts/productivity-smoke.mjs`. It verifies task-to-agenda projection, task-to-note conversion, shared Markdown edits, file routing to Markdown and Code Editor, Terminal writes/tasks, and state persistence after reload in an isolated browser profile.
- The supporting API currently exposes `GET /api/healthz`. The TITAN Ω frontend does not currently call the API.
- The mockup sandbox is workspace design tooling, not part of the user-facing product.

## Goals

- Reduce unnecessary work from heavy observatory visuals when the page is hidden or the viewport is mobile-sized.
- Preserve and verify cross-app productivity flows and shared data.
- Improve concrete usability, accessibility, and responsive issues found during an app-by-app audit.
- Keep the app stable through targeted edits and repeatable checks.

## Scope

### In scope

- TITAN Ω app modules and their shared state, event, window, and file behaviors.
- Existing visual and responsive behavior, including reduced-motion settings.
- The productivity smoke test and other focused checks needed to prevent regressions.
- API startup and health verification.

### Out of scope

- Replacing the vanilla app with React or splitting the current product into a new architecture.
- Rewriting persistence or adding API endpoints that the app does not need.
- Changes to the mockup sandbox or other workspace tooling.
- Unrequested features or broad visual redesigns without a demonstrated user benefit.

## Design and Architecture

- Keep the current app structure and product identity. Use targeted edits in the existing TITAN Ω app rather than a framework migration.
- Preserve shared state contracts and existing identifiers between apps.
- Treat the API as a health-checked supporting service only unless an actual frontend requirement is discovered.
- Test changes in an isolated browser profile so automated tests do not overwrite the user's saved workspace data.
- Keep reduced-motion behavior available and avoid introducing new continuously running visual work when it is not visible or useful.

## Staged Work

### Stage 1: Establish the baseline

- Run the workspace build and current productivity smoke test.
- Confirm the API health route responds successfully.
- Record any existing browser errors before changing behavior.

### Stage 2: Hidden and mobile performance

- Audit observatory canvases, animation frames, timers, and other recurring visual work.
- Stop, suspend, or reduce work when the document is hidden or the relevant view is not visible.
- Use TITAN Ω's existing 720px `ViewportMode` breakpoint rather than introducing a competing mobile threshold.
- Honor reduced-motion preferences without removing core functionality.
- Keep visual output consistent when the user returns to a hidden view.

### Stage 3: Cross-app reliability and usability

- Inspect the shared productivity flows and key app-to-app transitions.
- Fix concrete data, navigation, keyboard, responsive, or accessibility inconsistencies found by the audit.
- Add or extend smoke coverage only for behaviors that need protection; do not add unrelated features.

### Stage 4: Whole-app verification

- Run the workspace build and relevant smoke checks after each implementation batch.
- Check desktop and mobile previews, browser errors, and the API health route.
- Resolve failed checks before continuing to a later stage.

## Success Criteria

- Existing saved data and shared app behavior remain intact.
- Key productivity flows continue to work after reload.
- Heavy visuals do not continue unnecessary work while hidden, and mobile layouts remain usable.
- Reduced-motion behavior remains effective.
- The workspace build, relevant smoke checks, preview checks, and API health check pass without new browser errors.

## Risks and Mitigations

- **Single-file edit risk:** Keep changes localized, validate syntax/build, and run smoke checks after each coherent batch.
- **Visibility transitions can leave stale visuals:** Resume rendering on visibility/viewport changes and verify the return path.
- **Automated tests could affect user data:** Use a temporary browser profile and clean it up on success or failure.
- **Unneeded API expansion:** Keep API work to health verification unless a real frontend dependency is identified.

## Implementation Planning

Treat the stages as separate implementation units. Start with Stage 2 after spec review, using the existing smoke command as a regression baseline. Stage 3 should be scoped to concrete findings from the audit rather than speculative feature additions.
