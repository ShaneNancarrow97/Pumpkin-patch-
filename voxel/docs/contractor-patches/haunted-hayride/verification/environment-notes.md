# Browser verification environment

The integrated HTML is tested using one Chromium process with SwiftShader,
performance rendering, and bloom, shadows, mist and lake lights disabled. The
same page is resized sequentially for desktop, phone and unfolded Fold layouts.

This managed environment blocks `file://` navigation. An attempted direct open
of the built artifact returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`. The browser's
managed URL policy at `/etc/chromium/policies/managed/urls.json` blocks all URLs
except its HTTP, HTTPS and websocket allowlist. Browser QA therefore serves the
unchanged, single-file artifact from a loopback-only HTTP server and records all
requests to prove it does not fetch external runtime assets.

The managed browser also sets `FullscreenAllowed: false` in
`/etc/chromium/policies/managed/misc.json`. Fullscreen UI availability and the
game's graceful refusal can be checked here; successful OS fullscreen entry
requires a browser without that policy.

Both the loopback server and Chromium's local sockets require sandbox escalation.
Automatic approval allowed the local verification command. No runtime files or
browser policies were changed for these environment restrictions.
