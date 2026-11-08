# Farm village gateway visual check

Exact final HTML SHA-256: `bc7d34a08760e36b9e1004a48dae2b63d74b576dcce6622de648c3d3b60cd79e`.

[Normal-renderer gateway photograph](05-farm-village-gateway.png) was captured at 1280×800 with glow and shadows enabled. The declared quiet level-20 fixture has finished the village tour; visitors/arrivals were cleared and simulation paused. The management camera focuses on the authored gateway at zoom 2. Served HTML bytes are unchanged. This is an additional visual check, separate from the held-draw standard regression.

Visual review: the Mothlight Village sign, entrance posts and clear opening are visible beside Skyla's shop. Pale cobble continuously joins the main public path to the entrance. A small brown back-facing board farther down the spur and a foreground tree remain visible, without closing the actual gate opening. Physical collision traversal is independently proven in the 57-check gameplay report; this photograph alone is not collision proof.

Two automated checks passed: zero browser/shader errors and zero external asset requests. Chromium was closed after the photo. See [village-play-polish-report.json](village-play-polish-report.json). No runtime changes were needed.
