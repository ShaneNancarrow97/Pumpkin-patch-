# Visual review · Mothlight open ledger

## Direction selected

An opened spooky-season witchy ledger, with moths, pressed herbs and handwritten
margin notes. The aim is a keepsake book Natalie would enjoy opening, while real
service actions remain immediate and readable. The complete game UI is being
worked on separately in `contractor/mothlight-game-ui`; this review covers only
the optional Festival lab on `contractor/festival-host-bridge`.

## Review findings and resulting design

| Previous visual issue | Current treatment |
| --- | --- |
| Repeated nested rounded cards felt like a management form | One material book spread, with calmer internal sections and fewer boxed icon containers |
| Equal-weight dark columns lacked a clear fantasy | Bone parchment pages inside a mulberry cover, shaded gutter and restrained ink-plum/brass details |
| Small generic line icons did not carry the game's artwork | Actual dish/ingredient/hospitality atlas illustrations with prominent current quotes |
| Decoration competed with controls or threatened mobile space | Moths and pressed fern/lavender remain clipped to pointer-safe outer margins; desktop spread becomes one mobile flow |
| Handwriting risked obscuring prices and actions | DM Sans/Fraunces remain functional; Caveat supplies nonessential margin/flavour/keepsake lettering |
| Repeated financial figures distracted from the receipt | The paid paper receipt and takings lead; reconciliation/prepared-cash detail is inspected on demand |

## Materials, type and artwork

- **Cover:** deep mulberry, muted plum and a restrained woven/leather impression.
- **Pages:** warm bone parchment with subtle grain, edge shading and a centre
  binding on desktop. Mobile removes the binding and keeps a narrow cover edge.
- **Functional ink:** deep plum with earthy brass prices and sage completed goals.
  Decorative marks can be faint; amounts, action names, stock and progress cannot.
- **Handwritten layer:** the unmodified Caveat Latin WOFF2 is embedded. Its
  [source/hashes](../preview/assets/SOURCES.json) and
  [SIL Open Font License 1.1](../preview/assets/OFL-Caveat.txt) are retained, and the
  standalone HTML includes the licence/attribution. No remote font request occurs.
- **Original marginalia:** `ledger-ornaments.js` draws the moth's crescent/eye wing
  markings and fine venation plus pressed fern/lavender. The inline SVGs contain
  no text, IDs, defs, scripts or external references. They are decorative,
  assistive-hidden and pointer-safe, rather than interactive indicators.
- **Service artwork:** literal food art follows the real recipe ID. Missing food
  artwork uses an illustrative place-setting; cocoa, garden and ride art are
  category illustrations. An image never proves payment, order contents or an
  unlocked physical reward.

## Motion and interaction

A new committed operation can reveal its receipt/stamp and current result. Goal
and queue motion follows actual state changes, and a completed evening receives
a restrained keepsake reveal. Replay/delivery cannot fabricate another payment
animation. One faint service-light breath remains while running. Reduced-motion
and hidden-page handling suppress nonessential movement. Decoration never ticks
the simulation, changes income or adds visitors.

## Evidence and limits

- **163 native cases across 22 files**, including 82 bridge and 81 prerequisite
  cases. The seven new service-art cases verify exact cell order, bounded indices,
  fallback honesty, frozen shared maps and detached descriptors.
- **145 exact-HTML browser assertions**, no page errors, external requests or
  player-storage access. Tests exercise real finite-wallet payments, all themes,
  queue/replay/recovery, keepsakes, restored shelves and UI-specific constraints.
- Phone 390×844, unfolded 874×787 and landscape 844×390 layouts retain 44px controls,
  a visible first action/progress summary, distinct controls and no page overflow.
  The phone hosting view keeps all four service actions and committed feedback in
  reach; keepsake claim/next-evening actions remain in the first viewport.
- Functional actions, amounts and progress retain the reviewed functional fonts.
  Enabled functional ink meets 4.5:1 against the declared solid paper base. This is
  not a per-pixel certification of decorative gradients/art or the full game.
- The exact lab HTML is **1,544,786 bytes**, below the browser-checked **2 MiB**
  budget, with embedded fonts/art and retained Caveat licensing.

Reviewed HTML SHA-256:
`e8e824aaddb0ea65843098f1e62a463bc2275eb45c17714de580aeeeb2fb6b85`.

Screenshots and source hashes are in `verification/browser/`. The latest full
book capture is `desktop-premium-fullpage.png`. Physical Fold 7 GPU, Android
file-provider and PS5 Bluetooth tests are not supplied by these emulations.
The lab's funded stock/equipment and nominated guest demand remain explicit
fixture inputs, not live economy, profit or pacing evidence.

## Lead handoff

Reuse the palette/material/illustration pattern without copying prepared fixture
state into the game. Keep functional selectors, controller focus, safe areas and
unobstructed world space intact. Live Festival producer/save/physical-reward
integration remains separate. The older downloadable lab kit and its historical
rebuild proof do not automatically cover this latest Mothlight source iteration.
