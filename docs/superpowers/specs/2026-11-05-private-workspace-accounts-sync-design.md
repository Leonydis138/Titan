# Private Accounts and Full Workspace Sync

**Date:** 2026-11-05
**Status:** Design approved in conversation; written spec awaiting user review
**Project:** TITAN Ω, API server, and shared database packages

## Summary

Add private, app-specific accounts and full synchronization for TITAN Ω's durable workspace data. Keep the app local-first: it must continue to open and work offline, while account-owned local caches and cloud data remain isolated per user. Use Replit-managed Clerk Auth rather than Replit Auth so people can create TITAN Ω accounts without needing Replit accounts.

The sync contract uses versioned workspace snapshots with revision checks. When two devices have competing changes, keep both versions and ask the user before applying either; never silently replace a newer or divergent workspace.

This design expands the earlier Titan-only improvement design. It retains the targeted-edit and no-rewrite constraints and does not undo the completed rendering, lifecycle, or productivity improvements.

## Current Context

- TITAN Ω is a vanilla-JavaScript desktop-like workspace in `artifacts/titan-omega/index.html`.
- `StateManager` persists one JSON snapshot in browser local storage. The durable values include theme and display preferences, memories, plugin settings, code snippets, custom graphs, tasks, notes, virtual files, Markdown content, and chat history.
- The same store also includes device/session values such as open and focused windows, boot metadata, window positions, and app launch state. These are not user content and remain device-local.
- The client currently caps its serialized local snapshot at approximately 1.5 MB and reports a persistence error rather than saving an oversized snapshot.
- No sign-in flow or API authorization middleware exists in the current artifacts. The API currently exposes `GET /api/healthz`.
- The API workspace already includes OpenAPI, generated Zod, database, and client packages. The current API server does not yet serve workspace data.
- Replit-managed Clerk Auth creates separate Development and Production user stores. Development accounts do not carry over to Production.
- The project-wide `replit.md` is still scaffold text and will be corrected in the separate sandbox/developer-experience spec.

## Goals

- Provide private TITAN Ω accounts independent of Replit accounts.
- Synchronize every durable, user-owned TITAN Ω value covered by the StateManager and any additional persistent store found in the implementation inventory.
- Preserve guest/local workspaces and keep the app usable offline.
- Isolate each account's local cache and server data from every other account.
- Make import, sync, conflict resolution, export, restore, sign-out, and cloud deletion understandable and non-destructive by default.
- Keep API contracts generated and validated through the existing OpenAPI/Zod workspace packages.
- Enforce account ownership in the API and database access path, not only in the user interface.

## Non-Goals

- Replacing TITAN Ω's vanilla-JavaScript architecture or rewriting its StateManager.
- Team, organization, or public workspace sharing.
- Synchronizing live window focus, open windows, boot state, animation frames, active simulations, audio playback, or transient event-bus history.
- Storing passwords or implementing a custom authentication system.
- Requiring an account or network connection for local TITAN Ω use.
- Adding binary-media storage in this stage. If workspace data later includes large binary assets, storage must be designed separately rather than silently expanding snapshot limits.

## Account and Identity

- Use Replit-managed Clerk Auth for a dedicated TITAN Ω account system. Do not use Replit Auth, because users should not need a Replit account to sign into TITAN Ω.
- The Clerk management check currently reports `not_configured`; provisioning and code setup are implementation work, not part of this design review.
- The API verifies the managed identity token on every private workspace request and derives the owner from its verified subject. It never trusts an owner/account ID supplied by the client.
- Development and Production identities are distinct. Workspace storage must be aligned with the active environment, and sign-in UI/documentation must not imply that Development accounts or data carry over to Production.
- No Clerk credentials, session tokens, or database credentials are added to source files. The implementation follows the current Clerk setup guidance and workspace secret flow.

## Workspace Data and Local Profiles

### Synced data

The sync payload uses an explicit, versioned allowlist of durable user-owned data, initially including:

- Theme, wallpaper, motion, opacity, and layout preferences.
- Memories, plugin preferences, code snippets, and custom graphs.
- Tasks, notes, virtual files, Markdown content, and chat history.
- Any other durable user content discovered in the implementation inventory.

The implementation must classify every persistent state key as either synced account data or device-local state. Adding a new durable field without a classification and coverage test is a release blocker.

### Device-local data

Open/focused windows, window positions, app launch state, boot metadata, internal persistence metadata, active timers, playback, animation state, and transient event data remain on the device. They are not included in cloud snapshots.

### Profile separation and migration

- Keep a distinct guest workspace and a separate local cache namespace for each authenticated account.
- Resolve the current account/profile before mounting workspace windows. Do not briefly render another profile's state while authentication is loading.
- On sign-out, lock—but do not erase—the account cache and return to the guest workspace. Signing back into that account unlocks its cache. An already authenticated account remains usable offline.
- This is app-level separation, not encryption at rest. The UI and documentation must say that another person with access to the same browser profile or developer tools may inspect local cached data. Shared/public devices should use separate browser or operating-system profiles.
- Migrate the existing unpartitioned local snapshot to the guest profile without deleting the original until the copy has been verified.
- When the guest workspace is first associated with an account, preserve a local backup and ask before importing it into an account that already has cloud data.

## Sync Behavior and Conflict Safety

- The local profile remains immediately readable and writable; sync never blocks the main UI.
- Debounce local changes, send them when online, and retry safely when connectivity returns. Offline edits remain queued in the account's local cache.
- Each snapshot carries a schema version and a server revision. Updates include the expected current revision.
- A first account save creates the cloud workspace if none exists. An account with cloud data hydrates an empty device profile. If both guest/device and cloud data are meaningful, show an explicit import/selection flow after preserving the local copy.
- When an update uses a stale revision, the server preserves the existing cloud version and the submitted candidate as a pending conflict, then returns a conflict response. Neither version becomes current automatically.
- The conflict UI offers the user clear options to use the device copy, use the cloud copy, or export both. A merge is offered only for data that can be combined deterministically; same-item collisions require an explicit user choice.
- Resolving a conflict creates a new revision. Pending versions remain available until resolved or the user explicitly deletes the cloud workspace.
- Oversized or invalid payloads return a clear error. The client keeps its local data and never truncates or clears it to make a save succeed.
- Retrying the same write must not create duplicate revisions. Use an idempotency mechanism alongside revision checks.

## User Experience

- Add an account control and sync status to TITAN Ω's top bar. States include signed out, syncing, up to date, offline/pending, and conflict.
- Add account and sync controls in Settings for retry, export, restore, sign-out, and cloud-workspace deletion.
- Sign-out is non-destructive. Cloud deletion is a separate, clearly labeled action with explicit confirmation; it deletes the account's cloud snapshots and pending conflicts, not the Clerk identity or guest workspace.
- Export creates a complete, versioned workspace backup. Restore validates the file and preserves the current workspace before applying it.
- Existing local users can continue without creating an account.

## API and Data Boundary

- Keep `GET /api/healthz` public and do not include private data in its response.
- Add authenticated workspace read, write, conflict-resolution, export/restore support, and explicit cloud-workspace deletion through the existing Express API.
- Maintain the external contract in `lib/api-spec/openapi.yaml` and regenerate shared validators/client bindings from the existing workspace tooling.
- Use the existing PostgreSQL/Drizzle package for per-user workspace snapshots and conflict versions. Detailed table definitions and migration mechanics belong in the implementation plan after applying the PostgreSQL schema/security guidance.
- Enforce tenant isolation with API ownership checks and PostgreSQL row-level policies using server-verified identity context. The runtime database role must not bypass those policies; if the current connection role is privileged, use a least-privilege runtime role before shipping.
- Reject unauthenticated requests, invalid schemas, oversized bodies, and stale revisions with explicit status codes and a consistent error shape.
- Restrict CORS to the approved TITAN Ω development and production origins. Do not use wildcard access for private workspace routes.
- Keep database transactions short; do not hold locks while making identity-provider or other network calls.

## Delivery Sequence

1. **Identity and API foundation:** configure managed accounts, verify identities in the API, establish tenant-isolated data access, and preserve the public health route.
2. **Versioned workspace API:** add validated read/write/revision/conflict/export/delete contracts and database persistence.
3. **TITAN local profiles and sync:** partition guest/account caches, migrate legacy local state safely, add offline queueing and sync/conflict UI.
4. **Data recovery and release checks:** exercise export/restore/deletion and all cross-account, conflict, offline, and reload cases before release.

The component-preview sandbox remains a separate subproject and is specified in `2026-11-05-component-preview-sandbox-design.md`.

## Success Criteria

- A signed-out user can use a guest workspace without network access or an account.
- Every durable TITAN Ω user-data field is either synchronized or explicitly classified as device-local; no durable field is silently omitted.
- Signing into two different accounts in the same browser never mixes their local or server data.
- Account A cannot read, overwrite, or delete Account B's data by changing a request body, URL, or revision.
- Development and Production account stores are documented as separate environments.
- New-device hydration, first local import, offline edits, retry, conflict presentation, and conflict resolution preserve both copies until the user chooses.
- Sign-out locks the account cache without deleting it; cloud deletion is explicit and does not erase the guest profile.
- Export and restore round-trip the full durable workspace and reject invalid or oversized files without damaging current data.
- The full typecheck/build and API, migration, sync, conflict, account-isolation, and workflow checks pass without new browser or server errors.

## Risks and Mitigations

- **One snapshot can contain mixed user data and UI metadata:** use an explicit allowlist and test every StateManager key's classification.
- **Cross-account leakage from shared browser storage:** partition local profiles by authenticated identity; lock account caches on sign-out; test account switching.
- **Concurrent changes could overwrite work:** use expected revisions and preserve conflict candidates; prohibit silent last-write-wins behavior.
- **Authentication configuration may differ by environment:** use Replit-managed Clerk Auth, verify its management state before setup, and test Development and Production separately.
- **Local caches are not encrypted:** disclose the limitation and recommend separate browser/OS profiles on shared devices; do not describe the UI lock as cryptographic protection.
- **Large workspaces can exceed browser limits:** retain local data, return an explicit error, and do not truncate; design binary/object storage separately if needed.
- **Broad persistence scope can miss app-specific state:** inventory all persisted stores and block release on unclassified durable data.
- **Database ownership mistakes can expose multiple accounts:** use database-level isolation where supported and test hostile cross-account requests.

## Review Boundary

This document defines product behavior and system boundaries, not exact SQL columns, provider setup steps, or code-level migration procedures. Those details are settled in implementation planning after this spec is reviewed and approved.
