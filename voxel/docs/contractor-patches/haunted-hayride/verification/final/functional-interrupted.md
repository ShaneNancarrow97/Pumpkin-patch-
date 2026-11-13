# Functional browser run interrupted by the execution host

The complete QA flow ran against the HTML built at **2026-10-23 22:07:15 UTC**,
with the corrected visitor return routes and before the final visual repairs.
The browser served an immutable in-memory copy of that HTML throughout the run.
The later overwrite of `/workspace/Pumpkin-Patch-Hollow-Hayride.html` did not alter
the running page.

At approximately 22:20 UTC the execution transport disconnected and killed the
Node/browser processes. The final JSON report did not flush. Its SHA-256 existed
only in that process and is therefore unavailable; these captures must not be
represented as captures of the later final candidate. The final candidate has a
separate hash-backed report under `../visual/`.

The following assertions completed successfully and were observed in the tool
output before the host interruption:

- Real Attractions navigation, the level-8 purchase gate, purchase at the posted
  cost, closed initial admissions, and operational controls after purchase.
- Both ticket-price buttons, opening admissions and its pressed state, and
  desktop management layout with 44px controls.
- Four ordinary visitor plans enter the actual queue without early payment.
  Boarding charges exactly four £8 tickets: £32 is added to coins, earned and
  hayride income; each original £100 purse becomes £92. Retail sold counts and
  customer-care tips stay unchanged. Repeating the boarding action charges zero.
- The full wagon departs once. A real pointer tap on the projected physical
  station opens the small context card; Manage opens the attraction sheet.
- The real Ride along action opens the free briefing. Start enters a finite
  native wagon camera and hides the ordinary HUD, dock and farming controls.
  Canvas drag changes bounded look angles; the farm harvest shortcut is blocked.
- Pause freezes the owner clock; Resume continues. A tab interruption pauses and
  returning to the tab waits for explicit Resume. All five encounter cues fire
  once, the result card appears, further advancement produces no duplicates, and
  Replay clears the prior encounter list.
- Paused owner controls fit at 390×844 and 844×390 with 44px targets. Exit restores
  the farm camera and controls. The complete serialised farm save and paid ledgers
  remain byte-identical throughout the owner ride, pause, five cues, replay and
  exit. Resource counts stay stable after the scene has warmed.
- Changing the posted ticket price preserves paid receipts. Closing admissions
  preserves the paid convoy, which continues while the player views a room.
- Save/reload preserves all four paid passenger identities, purses, receipts and
  manifest entries. Offscreen completion unloads all four without another ticket
  or additional income.
- The two paid upgrades increase capacity to six and eight seats. Buying a scare
  increases the real rating; open appeal increases footfall; switching an owned
  scare off changes its active state without repurchase.

The desktop management capture completed. The remaining phone/Fold management,
fullscreen fallback, single-canvas and request/error assertions had not completed
when the host killed the process. The focused final-candidate run includes those
remaining checks. No page or console error was observed before interruption.

These historical owner captures exposed the backdrop edge, clipped billboard,
unsupported control glyphs and weak default encounter framing. Those visual
findings drove the final repairs; use the separate final-candidate captures to
judge the repaired presentation.
