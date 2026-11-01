import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RECIPES, COOKING } from '../../../../src/content/cooking.js';
import { KITCHEN_EQUIPMENT, KITCHEN_CAPABILITIES } from '../../../../src/content/kitchen-equipment.js';
import { VISITOR_EVENT_UPGRADES } from '../../../../src/content/visitor-events.js';
import { HAYRIDE_PROPERTY, HAYRIDE_TIERS, HAYRIDE_ROUTE_UPGRADES } from '../../../../src/content/hayride.js';
import { HOLLOW_PROPERTY, FOYER_TIERS } from '../../../../src/content/hollow-house.js';
import { COCOA_TIERS } from '../../../../src/content/festival-meadow.js';
import { COCOA_SPECIALS } from '../../../../src/rules/cocoa-menu.js';
import { ESTATE_DECOR } from '../../../../src/content/house-estate.js';
import { UNLOCKS } from '../../../../src/rules/unlocks.js';
import { decorById } from '../../../../src/rules/house.js';

const content = JSON.parse(readFileSync(new URL('../data/festival-themes.json', import.meta.url), 'utf8'));
const byId = list => new Map(list.map(item => [item.id, item]));
const recipes = byId(RECIPES), equipment = byId(KITCHEN_EQUIPMENT), events = byId(VISITOR_EVENT_UPGRADES), garden = byId(ESTATE_DECOR), specials = byId(COCOA_SPECIALS);

test('the content is an isolated proposal with unregistered cosmetic rewards', () => {
  assert.equal(content.status, 'proposal');
  assert.equal(content.integrationStatus, 'not-installed');
  assert.equal(new Set(content.themes.map(t => t.id)).size, content.themes.length);
  assert.equal(new Set(content.rewards.map(r => r.id)).size, content.rewards.length);
  for (const reward of content.rewards) {
    assert.match(reward.id, /^contract-trophy-/);
    assert.equal(reward.integrationStatus, 'not-registered');
    assert.equal(reward.kind, 'cosmetic-floor-prop');
    assert.deepEqual(reward.mechanicalEffects, []);
    assert.ok(!Object.hasOwn(decorById, reward.id), `${reward.id} unexpectedly became live content; update the integration claim`);
    assert.equal(content.themes.filter(t => t.rewardId === reward.id).length, 1, `${reward.id} must belong to exactly one evening`);
  }
});

test('every themed menu uses attainable existing recipes and physical kitchen equipment', () => {
  for (const theme of content.themes) {
    assert.equal(theme.recipeIds.length, 2, `${theme.id}: current shop has two food displays`);
    assert.equal(new Set(theme.recipeIds).size, 2);
    assert.ok(COOKING.level <= theme.level);
    const grants = new Set(theme.prerequisites.suggestedKitchenEquipmentIds.flatMap(id => {
      assert.ok(equipment.has(id), `${theme.id}: missing equipment ${id}`);
      return equipment.get(id).grants;
    }));
    for (const capability of theme.prerequisites.kitchenCapabilities) assert.ok(Object.values(KITCHEN_CAPABILITIES).some(list => list.includes(capability)), `${theme.id}: nonexistent kitchen capability`);
    for (const id of theme.recipeIds) {
      const recipe = recipes.get(id);
      assert.ok(recipe, `${theme.id}: unknown recipe ${id}`);
      assert.ok(recipe.level <= theme.level, `${theme.id}: recipe unlocks after the evening`);
      for (const need of recipe.equipment) {
        assert.ok(grants.has(need), `${theme.id}: starter suggestions lack ${need} for ${id}`);
        assert.ok(theme.prerequisites.kitchenCapabilities.includes(need), `${theme.id}: recipe need omitted from capability gate`);
      }
      if (recipe.homeOnly) assert.ok(theme.prerequisites.houseLevel >= 2, `${theme.id}: home-only recipe requires the kitchen room`);
    }
    for (const goal of theme.goals.options) for (const id of goal.conditions.recipeIds ?? []) {
      assert.ok(theme.recipeIds.includes(id), `${theme.id}: goal advertises an unstaged menu item`);
    }
  }
});

test('event prerequisites do not require a higher future patch level or attraction tier', () => {
  for (const theme of content.themes) {
    const p = theme.prerequisites;
    assert.ok(UNLOCKS.house[p.houseLevel - 1] <= theme.level, `${theme.id}: future house gate`);
    for (const id of p.visitorEventIds) {
      assert.ok(events.has(id), `${theme.id}: nonexistent guest event`);
      assert.ok(events.get(id).level <= theme.level, `${theme.id}: future guest event`);
    }
    if (p.cocoaTier) assert.ok(COCOA_TIERS[p.cocoaTier - 1]?.level <= theme.level, `${theme.id}: future cocoa gate`);
    for (const attraction of p.attractions) {
      const maze = attraction.id === 'hollow-house';
      assert.ok(maze || attraction.id === 'hayride', `${theme.id}: unknown attraction`);
      const property = maze ? HOLLOW_PROPERTY : HAYRIDE_PROPERTY;
      const tier = (maze ? FOYER_TIERS : HAYRIDE_TIERS)[attraction.minTier - 1];
      assert.ok(property.level <= theme.level && tier?.patchLevel <= theme.level, `${theme.id}: future attraction gate`);
      for (const route of HAYRIDE_ROUTE_UPGRADES.slice(0, attraction.routeLevel ?? 0)) {
        assert.ok(route.patchLevel <= theme.level && route.tier <= attraction.minTier, `${theme.id}: inaccessible route extension`);
      }
    }
  }
});

test('every proposed goal has explicit counting, units and an attainable referenced product', () => {
  for (const theme of content.themes) {
    assert.equal(theme.goals.choose, 3);
    assert.equal(theme.goals.options.length, 4);
    assert.equal(theme.goals.tuningStatus, 'suggested-unbalanced');
    assert.equal(new Set(theme.goals.options.map(g => g.id)).size, 4);
    assert.equal(new Set(theme.goals.options.map(g => g.metricId)).size, 4, `${theme.id}: avoid counting the same behaviour as multiple alternatives`);
    for (const goal of theme.goals.options) {
      const metric = content.metricDefinitions[goal.metricId];
      assert.ok(metric?.adapterRequirement && metric?.aggregation, `${theme.id}: undefined authoritative metric ${goal.metricId}`);
      assert.equal(goal.unit, metric.unit);
      assert.ok(Number.isSafeInteger(goal.target) && goal.target > 0);
      assert.ok(['session', 'preparation-or-session'].includes(goal.window));
      for (const id of goal.conditions.cocoaProductIds ?? []) {
        if (id === 'cocoa') continue;
        assert.ok(specials.has(id), `${theme.id}: nonexistent cocoa special`);
        assert.ok(specials.get(id).tier <= theme.prerequisites.cocoaTier, `${theme.id}: unprepared cocoa tier`);
      }
      for (const id of goal.conditions.attractionIds ?? []) {
        assert.ok(theme.prerequisites.attractions.some(a => a.id === id), `${theme.id}: goal requires an unprepared attraction`);
      }
      if (goal.conditions.minimumRouteLevel) {
        assert.ok(theme.prerequisites.attractions.some(a => a.id === 'hayride' && a.routeLevel >= goal.conditions.minimumRouteLevel));
      }
      if (goal.conditions.minimumHappiness !== undefined) assert.ok(goal.conditions.minimumHappiness >= 0 && goal.conditions.minimumHappiness <= 100);
      if (goal.conditions.maximumQueueSeconds !== undefined) assert.ok(goal.conditions.maximumQueueSeconds > 0);
    }
  }
});

test('garden alternatives use real productive pieces and remain optional', () => {
  for (const theme of content.themes) {
    const gardenGoals = theme.goals.options.filter(g => g.metricId === 'garden-harvest-quantity');
    assert.ok(theme.goals.options.length - gardenGoals.length >= theme.goals.choose, `${theme.id}: players must be able to choose three goals without garden work`);
    for (const id of [...theme.prerequisites.gardenDecorIds, ...(theme.recommendedGardenDecorIds ?? [])]) {
      assert.ok(garden.get(id)?.crop, `${theme.id}: nonproductive garden recommendation`);
      assert.ok(garden.get(id).houseLevel <= theme.prerequisites.houseLevel);
    }
    for (const goal of gardenGoals) for (const id of goal.conditions.gardenDecorIds) {
      const crop = garden.get(id)?.crop;
      assert.ok(crop, `${theme.id}: unknown harvest crop`);
      assert.ok(theme.recipeIds.some(recipe => Object.hasOwn(recipes.get(recipe).ingredients, crop.yields)), `${theme.id}: the garden crop has no connection to tonight's menu`);
    }
  }
});

test('preparation and operation cannot punish absence or force an active-play style', () => {
  assert.equal(content.policy.preparation, 'untimed');
  for (const theme of content.themes) {
    assert.equal(theme.preparation.length, 3);
    assert.equal(theme.operation.mode, 'player-ended');
    assert.equal(theme.operation.hardDeadline, false);
    assert.equal(theme.operation.offlineSimulation, false);
    assert.equal(theme.operation.pauseWithGame, true);
    assert.equal(theme.operation.failurePenalty, 'none');
    assert.ok(theme.operation.suggestedMinutes > 0);
    assert.ok(!theme.goals.options.some(goal => /thumbstick|controller|walked|manual/i.test(goal.metricId)), `${theme.id}: optional goals must accept automated service`);
  }
});
