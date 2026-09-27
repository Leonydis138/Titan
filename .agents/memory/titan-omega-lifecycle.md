---
name: TITAN Ω Window Lifecycle
description: Lifecycle rule for preventing closed TITAN Ω app windows from retaining asynchronous work
---

# TITAN Ω Window Lifecycle

Every app module that creates a timer, animation frame, global DOM listener, or EventBus subscription must retain its cancellation handle and release it from the object returned by `mount()`. A destroyed flag should guard callbacks that can race with close.

**Why:** TITAN Ω mounts vanilla-JavaScript apps dynamically inside reusable windows, so removing a window DOM subtree does not automatically cancel work registered on `window`, `document`, or the event bus.

**How to apply:** When adding or changing an app in `artifacts/titan-omega/index.html`, audit `setTimeout`, `setInterval`, `requestAnimationFrame`, `window/document.addEventListener`, and `EventBus.on` together with its `destroy()` path. Avoid anonymous global listeners when teardown may be needed.