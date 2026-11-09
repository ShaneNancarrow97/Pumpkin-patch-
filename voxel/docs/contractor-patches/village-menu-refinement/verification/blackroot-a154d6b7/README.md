# Corrected camera and refined fungus candidate

Exact HTML SHA-256: `a154d6b74b0343145f2e66b6b94051ace738393d3869c2ddf086446f9e08f38e`.

34/34 recorded automated checks passed, with zero page/shader errors and zero external requests. Chromium/server closed. This camera/model correction keeps the [earlier integrated 43/44 finding pass](../blackroot-222467b5/README.md) honest; unchanged full-satchel/three-patch/delivery workflows were not repeated.

The camera now frames the real resident feet, keeps the owner sprite facing the camera and places both character bounds clear of the actual speech/nameplate/reply UI on Fold and TV. Greeting transactions, chat/cooldown/once-only answers, gift inventory, About and actual offered Blackroot acceptance passed. Exact camera pose restoration and both movement boundaries passed, including a new stick hold introduced after neutral during return, followed by neutral/fresh walking. Phone/landscape long content scrolled independently.

The refined domed/thin-root fungus was approached through real Find/collision input. Its normal close inspection uses only the existing camera diagnostic; the actual two-second hand action still removes its voxel geometry, grants one sample and emits one bounded puff with no added lights.

Normal photos: [Fold greeting](01-fold-neighbour-greeting.png), [TV greeting](02-tv-neighbour-greeting.png), [refined fungus close view](05-fold-refined-blackroot.png).

**Additional visual finding:** the TV photo revealed grid children overflowing the root box. Original checks tested root bounds and target sizes, which passed, but did not enforce footer/Back child positions. Stored DOM data confirms speech/Back ended at y1143.30 on a1080px viewport while the root ended at1040.05. A TV-only CSS correction and explicit child-bounds guard follow separately. The original passing report is retained as run; this is not claimed as an approved final TV layout.

The updated resident fixture pauses only routine movement while preserving the normal active-camera billboard/animation. Other declared fixture details, stepped clocks, normal-render captures and physical-hardware limitations remain in the report. Audio is muted; no style/text changes were injected for normal photos. Long-copy layout setup changes displayed DOM copy only, without changing choices/handlers or game rules.
