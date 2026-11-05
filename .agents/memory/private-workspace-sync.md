---
name: Private workspace sync
description: Product requirements for TITAN Ω accounts and cross-device workspace data
---

# Private Workspace Sync

TITAN Ω account data is private per user, while guest/local workspaces remain available without an account. Keep a separate local cache for each account and a separate guest profile. Signing out locks the account cache without deleting it; the account cache remains usable offline while that account is signed in. The app-level lock is not encryption at rest.

Sync all durable workspace content and preferences, but keep transient window, focus, boot, and live animation state device-local. When revisions conflict, preserve both and ask the user before resolving; do not silently use last-write-wins.

Use the reviewed workspace-sync design spec as the implementation source of truth. Team sharing is outside the current scope.

**Why:** The user selected private per-user accounts, all durable workspace data, offline use, separate guest/account data, and preserve-both conflict handling.

**How to apply:** When changing TITAN persistence, account handling, or the API, maintain these ownership, offline, sign-out, and conflict rules.
