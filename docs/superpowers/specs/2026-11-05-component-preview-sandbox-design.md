# Component Preview Sandbox Improvements

**Date:** 2026-11-05
**Status:** Design approved in conversation; written spec awaiting user review
**Project:** Component Preview Server and shared project documentation

## Summary

Make the component preview sandbox useful without requiring users to know a component's source path. Turn its root page into a searchable catalog of discovered mockups, improve loading and error states for direct preview routes, and make the experience responsive and keyboard accessible.

Keep this tool independent from TITAN Ω accounts and workspace data. It remains a development/design utility that renders components from the generated module map.

## Current Context

- The sandbox is a React/Vite artifact at `artifacts/mockup-sandbox`.
- `src/App.tsx` imports a generated module map and supports base-path-aware `/preview/:componentPath` routes.
- The root page is currently a static instruction card that tells the user to type a path.
- A missing component or failed import displays an error, but the loading state returns `null`, leaving a blank view.
- Component resolution falls back to the last exported function when the named exports are not found, which can select a non-component helper.
- The root `replit.md` still contains scaffold placeholders and inaccurate product/operations sections.

## Goals

- Let users discover available previews from the sandbox root without memorizing paths.
- Preserve deep links and artifact base paths in both development and production builds.
- Make loading, empty, missing-route, and import-failure states explicit and recoverable.
- Ensure the gallery and preview pages work with keyboard navigation, screen readers, and narrow screens.
- Keep the sandbox isolated from private account data and TITAN Ω sync APIs.
- Replace placeholder project guidance with accurate artifact, command, environment, and architecture documentation.

## Non-Goals

- Turning the sandbox into a public component marketplace or production design-system site.
- Adding account login, server data, or access to private TITAN Ω workspaces.
- Replacing the generated module-discovery pipeline or moving the sandbox to another framework.
- Rewriting the UI component library or changing existing mockup components without a demonstrated preview failure.

## Proposed Experience

### Catalog at the root route

- Build the catalog from the generated module map already imported by `App.tsx`.
- Show component names derived from their paths, with folders represented as simple categories.
- Provide a search field and category filter; selecting an entry opens its base-path-safe preview route.
- Show an intentional empty state when no mockup modules are discovered.
- Use a responsive list/grid that preserves focus, visible keyboard focus, and readable component names.

### Preview routes

- Keep direct `/preview/:componentPath` navigation and `BASE_URL` handling.
- Show a loading skeleton or status message while a dynamic module is loading.
- Resolve only explicit component exports in a documented order (default, `Preview`, then a matching named export). If none exists, show a useful error rather than rendering an arbitrary exported function.
- For missing modules or rejected imports, show the path, a clear error, a retry action where retry is meaningful, and a link back to the catalog.
- Ensure canceled/outdated asynchronous loads cannot replace the currently selected preview.

### Project documentation

- Update `replit.md` to name the actual workspace and describe TITAN Ω, the API server, and the component preview sandbox.
- Document current run/build/typecheck commands, real environment requirements, artifact preview paths, and the source-of-truth locations.
- Remove stale scaffold claims and placeholder sections; keep collaborator-visible instructions concise and accurate.

## Architecture and Boundaries

- Continue using React, Vite, the existing generated module map, and `import.meta.env.BASE_URL`.
- Keep catalog navigation in the sandbox artifact; do not add API routes or Clerk dependencies for this tool.
- Treat generated module keys as the source of truth for available previews. Do not maintain a second hardcoded component registry.
- Keep load cancellation in the component effect and provide a nonblank accessible state for each loading/error branch.

## Delivery Sequence

1. Extract component paths and display names from the generated module map.
2. Add the responsive, searchable catalog and base-path-safe links.
3. Improve the preview loading, export-resolution, missing-module, and import-error states.
4. Update project guidance and add focused route/accessibility checks.

This subproject is independent of account/workspace synchronization. It can be implemented after the sync API contract is stable, or as a separate isolated implementation once its own plan is approved.

## Success Criteria

- The root route lists every discovered mockup and can filter/navigate to it without manually typing a path.
- Search, category navigation, and preview links work under the artifact base path.
- Valid previews render; missing paths, empty catalogs, and failed imports show clear nonblank states.
- An outdated async import cannot overwrite a newer selected preview.
- All catalog and error actions are keyboard operable, have visible focus, and expose useful accessible names/status.
- The catalog remains usable at mobile widths without horizontal overflow.
- `replit.md` accurately describes current artifacts, workflows, packages, and required environment configuration.
- Full workspace typecheck/build and sandbox route checks pass with no new browser errors.

## Risks and Mitigations

- **Generated module paths may be nested or change shape:** derive labels from paths and keep the generated module map as the only registry.
- **An exported utility function may be mistaken for a React component:** use explicit export resolution and a clear error state; remove the arbitrary last-function fallback.
- **Base-path bugs can break deep links:** test the root route and preview links with the configured artifact base path.
- **The sandbox is development tooling:** keep account data and private API access out of the preview renderer.
- **Project guidance can drift again:** document real commands and environment requirements, then verify them against the workspace build.

## Review Boundary

This document defines sandbox behavior and verification. It does not change component implementations or the generated module-discovery pipeline unless a concrete preview failure requires a focused fix.
