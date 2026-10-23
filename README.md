# The Hollow Hayride — design and native vehicle prototype

Extract Hollow-Hayride-Tractor-Preview.zip and open the HTML in Safari or Chrome. The HTML is standalone and works offline. Rear/front/side/seat views, touch orbit, pinch zoom, opening gate and rolling wheels demonstrate the native voxel tractor and four-seat wagon.

This is a design prototype, not the latest playable farm or a complete woodland ride. The required player ride-along, visitor boarding payments, scenic route and progression are specified for Claude to implement.

Source commit: 4fccd9da673b9af9a6ac0ef6e3ec96b5b92d959b
Source branch: contractor/first-person-hollow-house
Handover: https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/4fccd9da673b9af9a6ac0ef6e3ec96b5b92d959b/voxel/docs/handovers/32-haunted-hayride-roadmap.md

Hollow-Hayride-Design-Pack.zip includes the generated route map, tractor turnaround, native model/preview sources, check reports and handover, preserving repository paths. Build tools expect the full repository and its dependencies; the prebuilt preview HTML needs neither.

Validation: 1,129 positive finite boxes, matching hitches/measured bounds, eight rolling wheels and four seats. Desktop/portrait-phone preview checks pass with no page errors. The full attraction is planned, not integrated; live farm runtime and saves are unchanged.

This downloads-only branch must not be merged into game source. Claude should inspect the source commit and handover on the contractor branch.
