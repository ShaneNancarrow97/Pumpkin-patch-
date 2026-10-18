# Changelog

Releases continue from 3.0 so they can't be confused with the lost 2.11–2.16 builds. See [docs/PLAN.md](docs/PLAN.md).

## 3.0.0 "Lantern" (in progress)

Save safety. The save format is unchanged (schema 9), so 2.10 saves load as before.

- **A damaged save is mended, not discarded.** Only the broken parts start fresh, such as coins, plots, stock, the shop, the house, outfits or the stall. Paid upgrades and purchases are kept where possible. A one-time notice says what changed, and the damaged original can be downloaded from Settings.
- **Earlier copies.** The game keeps three automatic copies at least ten minutes apart. Settings can restore any of them, and Undo works as it does for imports.
- **Backup reminder.** Settings shows when you last downloaded a backup. After a week, once the patch has earned £1,000, a small dot appears on the Settings gear.
- **Imports list repairs.** Loading a backup with a damaged section shows what will start fresh before you confirm.
- **Saves from newer versions are protected.** They are never overwritten, and Settings explains why.
- **Version shown.** Settings shows the game version and save format, and backups record the version.
- **Visitors use the stone path.** Stall visitors walk in from the bottom of the map, up the path to the fork, along the spur to Skyla's counter, then out past the shop to the top right. They used to slide in sideways and leave through the fence. Each sale now happens when the visitor reaches the counter, about 4 seconds later than before; income over 4 hours changes by under 0.1%.
- **A new layout built around the farm.** In phone landscape, the farm takes up 74% of the screen instead of 32%, and every other size gains too.
  - **Navigation:** one bar with Patch, Shop, Home, Wardrobe and Journal, along the bottom of a phone held upright and down the left side otherwise.
  - **HUD:** coins, stock and visitors float over the farm with the Settings gear. Music, full screen and How to play are in Settings.
  - **Actions:** Plant and Harvest appear only when there is something to do, and show how many plots they'll affect.
  - **Camera:** the farm opens on the big pumpkin and the plots, so phones no longer start on an empty field.
  - **Talking:** tap Shane or Natalie to chat.
  - **Notices:** sale and purchase notices are visible again.
  - **Text and buttons:** no text is smaller than 12px and no button is smaller than 44px.
  - **Headings:** now use the Fraunces font the design always intended.
- **Older browsers.** The game works in browsers that lack `Object.hasOwn` and `replaceChildren`, such as Safari before 15.4.

## 2.10.0

Source recovered from the shipped Android build. See [docs/SOURCE-RECOVERY.md](docs/SOURCE-RECOVERY.md).
