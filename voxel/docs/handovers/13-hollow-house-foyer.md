# Claude handover: The Hollow House, Mortimer and the Scare Maze foyer

This is a complete additive attraction in the contractor branch, not a merge into `voxel-reference`. No Hollow House implementation existed in the published base inspected for this task. If Claude has an unpublished attraction system, port the foyer onto that system’s transaction and visitor APIs rather than running two ticket ledgers.

## Unlock, restore, open

The derelict property occupies the **old farm cottage site on the left**, at x6.5/z6.4. At patch level **6**, the player can purchase it for **£1,750**. Restoration is a separate **£2,500**, **90 game-second** job. Tea break pauses it. Completion prepares a closed attraction; the player explicitly opens it before visitors can buy tickets. No restoration, opening or upgrade purchase happens automatically on levelling.

The farm model changes from boarded derelict house, through restoration, to a lit attraction, then grows with its foyer tier. The map’s cobbles use the same routes as guests. The farm extends west to x−8. A clear lane connects the maze entrance to its own bottom-edge gate. The central hedge arch stays reserved for the private homestead. Sandy’s stand and the village exit retain their meadow routes.

| Foyer tier | Patch level | Upgrade cost | Floor | Reception capacity | Maze capacity | Ticket service |
| ---: | ---: | ---: | --- | ---: | ---: | ---: |
| 1 | 6 | Included in restoration | 10 × 8 | 3 | 2 | 3.5s |
| 2 | 7 | £1,800 | 11 × 8 | 5 | 3 | 3s |
| 3 | 8 | £4,200 | 12 × 9 | 7 | 5 | 2.5s |
| 4 | 10 | £8,500 | 13 × 10 | 10 | 7 | 2s |
| 5 | 12 | £16,000 | 14 × 10 | 14 | 10 | 1.6s |

The default ticket is £6. Players set a bounded price (maximum £10/£12/£15/£18/£24 by tier). Interest and willingness to pay are deterministic per visitor. Guests share the same finite purse across drinks, tickets, pumpkins and tips. Ticket choice keeps enough for one currently affordable pumpkin, while allowing the eventual basket to change; an entire expensive basket is not reserved ahead of every attraction visit. Higher prices can lose demand. Ticket revenue has its own ledger and does not become pumpkin takings or tips.

## One visitor journey

`v.hollow` belongs to the existing farm visitor. Interested new arrivals use the west gate. Guests coming from cocoa walk to the shop-side bottom gate, make a 2.5-second hidden transit, then approach through the west gate. They enter reception, queue for Mortimer, wait for a maze slot, pay once, enter the maze, finish a 28-second visit and return through reception. They walk down the west lane to z30, disappear for 2.5 game seconds, reappear at the shop-side bottom gate, then follow the normal shop path. No visitor walks across the pumpkin patch, big tap-pumpkin stage or the off-path farm background. The normal pumpkin-stall clock is suspended during the detour. No duplicate “interior customer” is minted when the camera changes.

Occupancy is derived from this single visitor list. Reception entry leaves one place for returning guests, preventing the full-foyer/full-maze deadlock. Capacity waits time out before payment. Closing rejects new/unpaid admission; paid guests finish and exit safely. `visitId`, the charged flag and the receipt check prevent repeated charges.

Rules run while viewing the farm, home or any menu. `saveData` saves unfinished Hollow visits separately from transient normal shoppers, and restores them into the same visitor list after ordinary holds are cleared. Paid visitors retain their receipt and wallet; an approach retains its route. Reopening the game does not charge a saved ticket again. This is in-session/game-time simulation; no offline earnings calculation has been added.

## A real customisable foyer

The voxel room includes the working reception desk/register, a dark staircase, maze archway, waiting furniture, gothic windows, chandelier, fireplace, portraits, cobwebs and pumpkins. Three welcome furniture/decor pieces are movable. Six surface/fixture groups have 21 purchasable or baseline choices: floors, walls, reception, lighting, entrance and effects. Sixteen separate props span furniture, reception, lights, decor, entrance and effects.

Players buy into inventory, place on a snapped grid, move, rotate, recolour, Undo, Cancel, Done or Store. Portraits and cobwebs mount on actual wall surfaces with the correct orientation; chandeliers and floating effects have separate collision layers. Doorways, stairs, the fireplace, service and admission lanes stay reserved. On expansion, mounted art follows the new walls immediately. Any decoration obstructing an enlarged functional lane returns to owned storage, with a notice; no owned copy is lost. The working ticket counter’s location is a utility station; paid desk finishes customise it. Additional movable furniture does not secretly move Mortimer’s queue.

Floor patterns, wall construction, counter colours, maze curtains/briar arch, lighting tone, purple mist, floating candles and friendly ghosts change in the actual scene. Effects and Mortimer animate subtly. No decorative prop creates a hidden ticket-price or income multiplier.

## Mortimer Graves

`mortimer.js` contains one articulated native voxel model: purple Victorian suit, burgundy waistcoat, top hat, pale green skin, amber eyes and oversized bow tie. It supports welcome, bow, ticket handover, gesture, counting, dusting, survivor reaction and a purple-smoke disappearance. Animations read the visit state and never credit money. Mortimer appears only in the restored foyer. Short, rate-limited speech bubbles stop during decorating and menus; no permanent dialogue panel.

## Shocktober horror direction

The final foyer lighting uses a colder blue moon key, restrained warm fill and a slowly flickering hearth. Low, soft ground haze leaves the queue readable; the paid purple mist is stronger. A pair of eyes occasionally watches from the unreachable black stair landing. Portrait eyes, burgundy curtains, cold gothic glass, shadowed stairs, thorny exterior ivy and small grave markers push the attraction toward a haunted-house feel. At higher tiers the dormer windows reveal watching eyes. These are world details, with no full-screen flash or obstructing horror overlay. Mortimer stays readable behind his candlelit desk. The existing shuffled MIDI soundtrack and saved audio settings remain unchanged.

## Integration

`content/hollow-house.js` owns all routes, tiers and item IDs. `rules/hollow-house.js` owns restoration, prices, visits, capacity, receipts and decor. The small hooks in `selling.js` suspend ordinary stall time during a visit. `model.js` calls `updateHollowHouse` before selling and saves/restores pending visits. Saved transit phases retain the same guest, purse and ticket receipt. `hollow-house-farm.js`, `hollow-house-world.js` and `foyer-view.js` adapt the rules into world art, cameras and actors. `ui/hollow-sheet.js` provides the compact context card and deeper management; `ui/foyer-controls.js` handles reversible editing.

Keep source-of-truth capacity and wallet rules when reconciling Claude’s unpublished work. See [handover 14](14-minimal-ui-and-verification.md) and the delivery README for verification and artifact details.
