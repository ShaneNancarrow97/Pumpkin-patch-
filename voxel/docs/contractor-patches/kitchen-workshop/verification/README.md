# Workshop verification

- 76 Node test files pass on merged runtime 695df56. The final truck-only visibility/wheel change was followed by all five native truck/delivery tests passing.
- Full browser flow: 28 checks, exact HTML hash in full-browser/checks.json. Screenshots cover equipped kitchen, active cooking, hospitality and phone/Fold menus.
- Final artifact: 8 checks, exact download hash in final-browser/checks.json. Confirms Maisie, original/VIP sitting art, four-frame VIP walking advancement, phone/Fold menus, no errors/external assets.
- Final clean committed-source build is byte-identical to the download. CI is recorded separately when complete; do not infer a final CI pass from a prior commit.

Fixtures grant funds/levels only in QA browser localStorage. None are embedded in the downloadable HTML. Physical Android/Fold performance, file handling and OS fullscreen remain unverified.
