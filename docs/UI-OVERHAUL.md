# UI overhaul plan

This plan rebuilds the game's interface around the farm itself. It is based on an audit of the 3.0 build, which has the same interface as 2.10, on 17 October 2026 at six screen sizes. Contact sheets of every main screen are in [`ui-audit/`](ui-audit/) ([phone](ui-audit/2.10-phone.webp), [phone landscape](ui-audit/2.10-land.webp), [desktop](ui-audit/2.10-desk.webp)). They are the "before" pictures.

The art and the cosy dark-and-gold mood stay. What changes is how the interface sits on top of them: less framing, one route to each place, text you can read, and menus that leave the patch visible.

## 1. What the audit found

### Measurements

These were taken in headless Chromium with a fresh patch on the Patch screen.

| Size | Farm visible, not under UI | Text smaller than 12px | Smallest text | Tap targets under 44px |
| --- | --- | --- | --- | --- |
| Phone 390×844 | 64% | 24 elements | 8px | 3 |
| Small phone 360×740 | 58% | 26 | 3.5px | 5 |
| **Phone landscape 844×390** | **31%** | 29 | 4.5px | 2 |
| Fold cover 344×882 | 66% | 24 | 8px | 5 |
| Tablet 820×1180 | 70% | 28 | 4.5px | 2 |
| Desktop 1280×800 | 53% | 26 | 4.5px | 2 |

The stylesheet has 1,895 lines. It contains 23 section blocks that each restyle earlier ones ("Midnight 2.2…", "Midnight 2.7…"), 12 different breakpoints, and 130 rules set at 10px or smaller.

### Findings

| # | Finding | Evidence |
| --- | --- | --- |
| U1 | **The big pumpkin and the house start off-screen on phones.** In portrait, the map opens on the field. The pumpkin (the game's signature tap) sits at x = −227 and the house at x = −314, so a new player never sees either without swiping. | Phone contact sheet, first frame |
| U2 | **Phone landscape is mostly interface.** The top bar, HUD and two bottom bars leave 31% of the screen for the farm. Menus are cut to about 200px tall, so the wardrobe shows only the tops of its cards. | Landscape contact sheet |
| U3 | **Too many routes to the same places.** The shop opens from "Skyla's shop", the "Shop" map chip, Upgrades → Skyla's shop and the building itself. Home opens from the top tab, the "Home" map chip and the house. Upgrades for one thing live in two menus. | Top tabs and bottom bars together |
| U4 | **Two bars of navigation, top and bottom**, plus four tool icons and a favours chip, before any gameplay button. Phones spend about 220px of 844 on chrome. | `topbar` 98px, HUD 56px, actions 66px, view row about 44px |
| U5 | **Text too small to read.** The HUD labels are 7–8px, plot prices on desktop 9px, and upgrade levels and reward labels about 9px in low-contrast grey. | Measurements above |
| U6 | **Notices are invisible.** Since 2.7, full-screen mode hides toasts visually (screen readers only), and the "Saving unavailable" bar is `display:none`. Sales, purchases and errors give no visible feedback outside a menu. | `game.css` lines 1584–1585 |
| U7 | **Home is a web page, not a game screen.** It swaps the map for a long scrolling document with a heading, a "Back to the patch" button, a status strip and tabs. It looks and scrolls differently from every other screen. | Desktop contact sheet, last two frames |
| U8 | **Every menu is a centred dialog that hides the patch.** That includes the menus you use while playing (crops, shop). Only the desktop Upgrades panel keeps the farm in view. | All contact sheets |
| U9 | **Crops & seeds is a 12-card scroll.** Each plot has its own card with a dropdown, so changing what grows means scrolling through all of them. | Phone frame 7 |
| U10 | **Settings mixes in danger.** "Reset progress" sits second, between music and pause. Backups, the most important safety feature, are at the very bottom. | Phone frame 5 |
| U11 | **Disabled actions look broken.** "Plant all 0" and "Harvest all 0" stay on screen, dimmed, most of the time. | Every Patch frame |
| U12 | **Headline font never loads** (REVIEW R3). Headings fall back to Georgia, or another serif on Android. | `--serif` |

## 2. Principles

1. **The patch is the screen.** On every size, at least 70% of the Patch screen shows the farm. Menus open beside or below the farm, not over the whole of it.
2. **One way to each place.** Each feature has one home in the navigation, plus its building on the map. Duplicate chips and tabs go.
3. **Thumbs first.** On phones, the things you tap all the time sit in the bottom third. Navigation sits where a thumb reaches.
4. **Readable everywhere.** Nothing below 12px, body text at 14–16px, and a Text size setting on top of that. Contrast meets WCAG AA.
5. **Show what you can do.** Highlight ready actions, such as a harvest, a favour to claim or something affordable. Hide actions that can't be used yet instead of dimming them.
6. **Feedback you can see.** Sales, purchases and problems appear in a quiet notice area that never covers a control.
7. **Keep the voice.** The warm, dry headings and the dark, gold and plum look stay. The overhaul removes clutter, not character.

## 3. Target design

### Layout shell

One shell for every screen, in two arrangements:

```
Phone portrait                     Landscape · tablet · desktop
┌──────────────────────────┐      ┌────┬──────────────────────────┬────────────┐
│ £4,000 · 12 🎃 · 34 ☺  ⚙ │ HUD  │ ⌂  │ HUD                    ⚙ │            │
│                          │      │ ✿  │                          │   Sheet    │
│                          │      │ ☖  │          Farm            │  (opens    │
│           Farm           │      │ ♛  │      (or Home room)      │   beside)  │
│   (or the Home room)     │      │ ✎  │                          │            │
│                 [Boost]  │      │    │        [Plant][Harvest]  │            │
│        [Plant] [Harvest] │      └────┴──────────────────────────┴────────────┘
├──────────────────────────┤       nav rail
│ Patch Shop Home Style Jrnl│ nav
└──────────────────────────┘
```

- **HUD:** one slim row at the top. It shows coins, stock and visitors, with readable labels or icons with accessible names, and the Settings gear. The favours chip becomes a badge on Journal.
- **Navigation:** five destinations, **Patch · Shop · Home · Wardrobe · Journal**. On phones they form a bottom tab bar; in landscape and on larger screens, a left rail. The top tab row, the four tool icons and the "Home · Patch · Shop" map chips go. Music and full screen move into Settings, and Talk moves to tapping Shane or Natalie.
- **Actions:** Plant, Boost and Harvest float over the bottom of the farm. Each appears only when it can be used and carries a count, such as "Harvest 6". The big pumpkin is always on screen: the camera opens framing the pumpkin and the plots, not the empty field.
- **Upgrades:** no longer its own tab. Each place has an Upgrade button in its sheet: the farm (watering can, yield, helper, plots, signs), the shop and the house. An **All upgrades** view (the Phase 3 upgrade paths) lists every branch in one place.

### Sheets instead of dialogs

| Screen | Phone portrait | Landscape and larger |
| --- | --- | --- |
| Sheet | Bottom sheet with three heights: peek (one line), half, full. Swipe or tap the handle. The farm keeps running above it. | Side panel about 400px wide. The farm stays visible and playable. |
| Dialog | Kept only for decisions: confirm a purchase over £1,000, load a backup, reset, the repair notice. | Same |

### Screen by screen

| Screen | Becomes |
| --- | --- |
| Patch | Farm in the shell. Tap a plot to plant or pick it; tap the shop or house to go there. Changing crops becomes a **seed brush**: pick a variety from a strip of seed packets, then tap plots or "Paint all". The 12-card list goes. |
| Shop | Skyla's shop interior in the shell, with a sheet that has Displays, Stall, Ledger and Upgrade tabs. One route in. |
| Home | The room fills the shell instead of a web page. A bottom sheet or side panel holds Decorate (catalogue with filters), Rooms & styles, Library and Upgrade house. Drag-to-place works as it does now. |
| Wardrobe | A Natalie / Shane switch, then a grid of outfits with a large live preview, and Standing / Walking as a toggle on the preview. |
| Journal | One hub with tabs: Favours (with a claim badge), Memories (achievements), Collections (house, wardrobe, books, with completion %) and Library. It absorbs the scrapbook and favours menus. |
| Settings | Sections in this order: Save & backups, Sound, Display & accessibility, Help, then a separated **Start over** area at the end. |
| Notices | A small stack under the HUD, shown for 3 seconds, at most two at once, never over a control. It is also announced to screen readers. The hidden toasts and save bar are replaced. |

## 4. Design system

The build already joins one stylesheet into the page. This overhaul splits it into cascade layers:

```
src/styles/
  tokens.css      @layer tokens      colour, type, spacing, radius, elevation, motion
  base.css        @layer base        reset, typography, focus ring, reduced motion
  components.css  @layer components  button, chip, tab, stat, card, sheet, progress, price, badge, notice
  shell.css       @layer shell       HUD, nav bar and rail, action cluster, camera frame
  screens/*.css   @layer screens     patch, shop, home, wardrobe, journal, settings
  legacy.css      @layer legacy      today's game.css, shrinking to nothing
```

The legacy layer comes first, so it always loses to the new layers and needs no `!important` fights. Each screen deletes its old rules as it moves.

### Tokens

- **Colour:** keep the plum night, lantern gold and pumpkin orange. Define them as about 10 named tokens: ground, surface, raised, edge, ink, ink-soft, gold, pumpkin, moss (good) and ember (warning). Every text and background pair meets AA, which is 4.5:1 for body text.
- **Type:**
  - Embed **Fraunces** for display (it is OFL licensed) and keep **DM Sans** for everything else.
  - Use one scale: 12 / 14 / 16 / 20 / 26 / 34px.
  - Uppercase labels are 12px with 0.06em tracking.
  - Numbers in the HUD and prices use tabular figures.
- **Spacing:** a 4px base (4, 8, 12, 16, 24, 32).
- **Touch:** every target is at least 44×44px, and 48px for the bottom bar.
- **Motion:** 150ms for UI and 250ms for sheets, all switched off by the reduce-motion setting and the system preference.

### Components

| Component | States |
| --- | --- |
| Button (primary / secondary / quiet / danger) | rest, hover, pressed, focus, busy, disabled, with the reason as text |
| Price button | affordable / short by £n / owned |
| Chip, Tab, Segmented toggle | |
| Stat | Icon, value and label, used in the HUD and ledgers |
| Card | Upgrade, outfit, decor, favour and seed-packet variants, all on one card base |
| Progress | Bar and ring |
| Badge | Count and dot |
| Sheet | peek / half / full; side panel |
| Notice | Info, success and warning |
| Empty state | |

Each component gets a section on a **component gallery** page, `npm run gallery`, in the dev build. That gives one place to review states at every size.

## 5. Accessibility

New settings under Display & accessibility:

- **Text size** (100 / 115 / 130%) scales the type tokens.
- **High contrast** swaps to the high-contrast token set.
- **Reduce motion** is an in-game toggle that also follows the system preference.
- **Plot states** show shape and label as well as colour: a sprout, a progress ring and a "ready" glow with a tick.

Everything can be reached by keyboard, with a visible focus ring. Sheets trap focus and close with Escape and Back. Notices use `aria-live="polite"`.

## 6. Engineering approach

- **Screenshot tests first.** `npm run visual` captures every screen at 390×844, 844×390, 820×1180 and 1280×800 and compares them with committed baselines in `test/visual/`. Changes are reviewed as images in the PR. The current screens become the first baseline, so nothing moves by accident.
- **UI rules in the smoke test.** It checks that no text is under 12px, no target is under 44px, the farm is at least 70% uncovered on Patch, the big pumpkin is visible at load, and there is no horizontal scroll. These are the numbers in §1, turned into checks that fail the build.
- **Shell in code.** Split `app/game.js`: `ui/shell.js` (HUD, navigation, notices, sheet manager), `scene/camera.js` (opening framing, pan and fit) and `ui/actions.js`. Feature UIs ask the shell for a sheet instead of building their own modal.
- **One screen at a time.** Each pull request moves one screen to the new components and deletes that screen's legacy CSS. Every step stays playable and passes all checks.
- **No save changes.** This is presentation only. Remembered UI state, such as the last sheet tab and text size, goes in a separate local key, not the save.

## 7. Delivery

| Step | Scope | Done when |
| --- | --- | --- |
| **UI0 Foundation** | Screenshot tests, UI rules in the smoke test (reporting only at first), cascade layers, tokens, Fraunces, the notice area replacing hidden toasts | Baselines committed; notices visible on all sizes; no visual change otherwise |
| **UI1 Shell** | HUD, bottom bar and rail, floating actions, camera opening on the pumpkin, duplicates removed | Farm ≥ 70% uncovered on Patch at every size, including landscape; pumpkin visible at load; one route to each place |
| **UI2 Sheets** | Sheet manager; Settings, Upgrades and Journal hub moved over; Upgrade buttons in place | No full-screen dialog left except decisions; Settings in its new order |
| **UI3 Patch** | Seed brush, plot state shapes, hide-not-dim actions, empty-state hints | Crops changed in two taps; plot states readable without colour |
| **UI4 Home & Wardrobe** | Home in the shell with its sheet; wardrobe grid and preview | Home no longer scrolls as a page; placing an item takes at most three taps |
| **UI5 Shop** | Shop interior in the shell; Displays, Stall, Ledger and Upgrade tabs | Shop reached one way; stall and displays editable while customers move |
| **UI6 Accessibility & cleanup** | Text size, high contrast, reduce-motion toggle; delete `legacy.css` | No text under 12px anywhere; AA contrast; legacy layer empty; UI rules now failing the build |

### How it fits [PLAN.md](PLAN.md)

UI0 and UI1 go **before Phase 2**. The second till, barn, chutney and visitor groups all need new interface, and building them on the old modal pattern would mean redoing them. UI2–UI5 then run alongside Phases 2–4, with each new feature built on the new components. UI6 closes out with Phase 7's accessibility work.

## 8. Decisions for you

| Question | Recommendation |
| --- | --- |
| Bottom tab bar on phones, instead of tabs at the top? | Yes: it's where your thumb is, and it frees the top for the farm |
| Rename "Outfits" to "Wardrobe"? | Yes: it matches the menu's own title |
| Move music and full screen into Settings? | Yes; music keeps a quick mute in the sheet header |
| Talk: tap Shane or Natalie, instead of a button? | Yes, with a hint the first time |
| Keep the scrolling Home page on desktop? | No: the same shell everywhere is simpler to build and test |
