# Hollow House exterior verification

Final HTML is built with the ordinary starting economy and embedded assets. All **64 Node test files pass**; see [node-tests.txt](node-tests.txt). The custom browser flow and final wider-framed visual review are underway; their exact hashes and outcomes will be recorded here before delivery. Historical `core/` is a failed first-build QA timing assumption, retained with its scope note.

The managed Chromium policy blocks direct file navigation and native fullscreen. QA serves the unchanged HTML on loopback, uses one SwiftShader browser, records external requests and checks phone/Fold layouts. This does not establish physical Fold performance. The standard smoke wrapper uses the unchanged `voxel/smoke.mjs` through `GAME_URL`.
