---
name: TITAN Ω Architecture
description: Single-file HTML app structure and key conventions for editing
---

# TITAN Ω Architecture

## Key Facts
- **File:** `artifacts/titan-omega/index.html` (~12,000+ lines after enhancements)
- **Type:** react-vite artifact (slug: titan-omega, previewPath: "/") serving vanilla JS/CSS/Canvas — no React used
- **Pattern:** All JS modules are inline `<script>` blocks; all CSS is one `<style>` block

## Module Order (inline in index.html)
1. CSS design system + app-specific styles
2. Utils, Icons, EventBus, Logger, StateManager
3. WindowManager, CommandPalette, NotificationCenter, ContextMenu
4. DesktopClass (wallpaper engine with 7 styles)
5. DockClass, TopbarClass
6. App modules (each is a `const XApp = (() => { ... })()` IIFE)
7. AppRegistry + registrations
8. Boot + Init

## Config Location
`TITAN_CONFIG` object near top of `<script>` block (~line 2800):
- `themes`: array of 7 theme IDs
- `wallpaperStyles`: array of 7 style IDs  
- `bootSteps`: array of boot messages

## Editing Convention
- Use targeted `Edit` tool patches with enough surrounding context (~10 lines) to be unique
- Never rewrite the whole file — it's too large
- State is persisted via `StateManager.set/get` (localStorage-backed)

**Why:** The file is 12K+ lines; rewrites risk data loss and merge conflicts.
