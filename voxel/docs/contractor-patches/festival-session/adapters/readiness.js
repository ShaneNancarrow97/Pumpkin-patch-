// Optional read-only bridge. The game owns restoration and the engine owns the
// evening's requirements; this adapter only snapshots authoritative world facts.
import { patchLevel } from '../../../../src/rules/levels.js';
import { kitchenEquipment } from '../../../../src/rules/kitchen-equipment.js';
import { hollowReady } from '../../../../src/rules/hollow-house.js';
import { hayrideReady } from '../../../../src/rules/hayride.js';
import { RECIPE_BY_ID } from '../../../../src/content/cooking.js';
import { VISITOR_EVENT_UPGRADES } from '../../../../src/content/visitor-events.js';
import { ESTATE_DECOR_BY_ID } from '../../../../src/content/house-estate.js';

const unique = values => [...new Set(values)];

/**
 * Snapshot a valid fresh/restored game state without installing any feature.
 * Do not pass a raw save here; restore it through the game's own migration first.
 * Counts/owned capabilities are facts, not a promise that service is ready.
 */
export function worldFestivalContext(gameState) {
  if (!gameState || typeof gameState !== 'object' || Array.isArray(gameState)) {
    throw new TypeError('worldFestivalContext requires a fresh or restored game state');
  }
  const s = gameState;
  return {
    level: patchLevel(s).level,
    houseLevel: s.house?.level ?? 0,
    kitchenPurchased: s.kitchen?.purchased === true,
    kitchenCapabilities: [...kitchenEquipment(s, 'home')],
    knownRecipes: unique((s.kitchen?.recipes ?? []).filter(id => Object.hasOwn(RECIPE_BY_ID, id))),
    // These are purchased upgrades. An owner may temporarily disable their
    // invitation timers without losing the researched Festival Night requirement.
    visitorEventIds: VISITOR_EVENT_UPGRADES.filter(item => (s.visitorEvents?.[item.id]?.level ?? 0) > 0).map(item => item.id),
    cocoaTier: s.festival?.cocoa?.level ?? 0,
    gardenDecorIds: unique((s.estate?.placed ?? []).map(piece => piece.id).filter(id => Object.hasOwn(ESTATE_DECOR_BY_ID, id))),
    attractions: {
      'hollow-house': {
        ready: hollowReady(s),
        tier: s.hollowHouse?.tier ?? 0,
        open: s.hollowHouse?.open === true,
      },
      hayride: {
        ready: hayrideReady(s),
        tier: s.hayride?.tier ?? 0,
        routeLevel: s.hayride?.routeLevel ?? 0,
        open: s.hayride?.open === true,
      },
    },
    paused: s.paused === true,
  };
}
