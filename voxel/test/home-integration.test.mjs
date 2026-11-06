import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { playWays, inZone } from '../src/play-ways.js';
import { homePieceTargets } from '../src/rules/home-interactions.js';

const fixture = (houseLevel = 2) => {
  const s = M.freshState();
  s.coins = 100000;
  s.earned = M.LEVELS[7].at;
  s.progression.claimed = M.LEVELS.slice(0, 8).map(l => l.level);
  s.progression.pending = [];
  s.house.level = houseLevel;
  s.house.placed = [];
  return s;
};
const jsonRoundTrip = s => M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
const piece = (s, instance) => s.house.placed.find(p => p.instance === instance);
const buyAndPlace = (s, id, room = 'parlour') => {
  assert.equal(M.buyDecor(s, id), true, `buy ${id}`);
  const instance = M.placeDecor(s, id, room);
  assert.ok(instance, `place ${id} in ${room}`);
  return instance;
};

test('a paid bathroom changes cached kitchen links, retains earlier rooms and survives the full save pipeline', () => {
  const s = fixture();
  const before = M.roomLayout(s, 'kitchen');
  assert.equal(M.roomLayout(s, 'bathroom'), null);
  assert.equal(before.doors.some(d => d.to === 'bathroom'), false);
  const coins = s.coins, earned = s.earned;
  assert.equal(M.buyRoomExtension(s, 'bathroom'), true);
  assert.equal(s.coins, coins - 4500);
  assert.equal(s.earned, earned);
  assert.equal(M.buyRoomExtension(s, 'bathroom'), false);
  assert.equal(s.coins, coins - 4500, 'a second press cannot charge twice');
  const kitchen = M.roomLayout(s, 'kitchen'), bathroom = M.roomLayout(s, 'bathroom');
  assert.notEqual(kitchen, before, 'cache sees the purchased extension');
  assert.ok(kitchen.doors.some(d => d.to === 'bathroom' && d.wall === 'left'));
  assert.ok(bathroom.doors.some(d => d.to === 'kitchen' && d.wall === 'right'));
  assert.equal(bathroom.stairs.length, 0, 'the annex must not inherit the attic ladder');
  const basin = buyAndPlace(s, 'household-basin', 'bathroom');
  assert.equal(M.buyRoomStyle(s, 'bathroom-sage'), true);
  assert.equal(M.setRoomStyle(s, 'bathroom-sage'), true);
  s.house.activeRoom = 'bathroom';
  const r = jsonRoundTrip(s);
  assert.equal(r.version, M.STATE_VERSION);
  assert.equal(r.house.extensions.bathroom, true);
  assert.equal(r.house.activeRoom, 'bathroom');
  assert.equal(M.roomStyle(r, 'bathroom').id, 'bathroom-sage');
  assert.deepEqual(piece(r, basin), piece(s, basin));
  assert.equal(r.coins, s.coins);
});

test('bathroom doors arrive beyond the opposite trigger and the annex has no invisible garden exit', () => {
  const s = fixture(); assert.ok(M.buyRoomExtension(s, 'bathroom'));
  const outward = playWays(s, 'room:kitchen').find(w => w.to === 'room:bathroom');
  const inward = playWays(s, 'room:bathroom').find(w => w.to === 'room:kitchen');
  assert.ok(outward && inward);
  assert.equal(inZone(inward.zone, outward.arrive), false, 'bathroom arrival cannot bounce back');
  assert.equal(inZone(outward.zone, inward.arrive), false, 'kitchen arrival cannot bounce back');
  assert.equal(playWays(s, 'room:bathroom').some(w => w.to === 'estate'), false);
});

test('the bathroom purchase gate needs patch level, manor tier, funds and active play', () => {
  const s = fixture();
  s.progression.claimed = [1]; s.earned = 0;
  assert.equal(M.buyRoomExtension(s, 'bathroom'), false);
  s.progression.claimed = [1, 8]; s.earned = M.LEVELS[7].at; s.house.level = 1;
  assert.equal(M.buyRoomExtension(s, 'bathroom'), false);
  s.house.level = 2; s.coins = 4499;
  assert.equal(M.buyRoomExtension(s, 'bathroom'), false);
  s.coins = 4500; s.paused = true;
  assert.equal(M.buyRoomExtension(s, 'bathroom'), false);
  s.paused = false;
  assert.equal(M.buyRoomExtension(s, 'bathroom'), true);
  assert.equal(s.coins, 0);
});

test('two paid copies remain independent through shelving, wall moves, storage and reload', () => {
  const s = fixture();
  const shelf = buyAndPlace(s, 'household-floating-shelf');
  const first = buyAndPlace(s, 'household-cream-mug');
  const second = buyAndPlace(s, 'household-cream-mug');
  assert.notEqual(first, second);
  assert.equal(M.ownedCopies(s, 'household-cream-mug'), 2);
  assert.equal(M.availableCopies(s, 'household-cream-mug'), 0);
  assert.equal(M.placeDecor(s, 'household-cream-mug'), null, 'placing cannot invent a third mug');
  assert.equal(M.putOnTop(s, first, shelf), shelf);
  assert.equal(M.putOnTop(s, second, shelf), shelf);
  const host = piece(s, shelf);
  const startY = M.wallMountHeight(s, host);
  assert.equal(M.moveWallDecor(s, shelf, host.wall ?? 'back', host.x, startY + .3), true);
  const r = jsonRoundTrip(s);
  assert.equal(M.placedCopies(r, 'household-cream-mug'), 2);
  assert.equal(piece(r, first).on, shelf);
  assert.equal(piece(r, second).on, shelf);
  assert.equal(M.wallMountHeight(r, piece(r, shelf)), startY + .3);
  assert.equal(M.removeDecor(r, first), true);
  assert.equal(M.availableCopies(r, 'household-cream-mug'), 1);
  assert.equal(piece(r, second).on, shelf, 'storing one mug leaves the other attached');
  assert.equal(M.removeDecor(r, shelf), true);
  assert.equal(M.availableCopies(r, 'household-cream-mug'), 2, 'storing a host safely returns its rider');
  assert.equal(M.availableCopies(r, 'household-floating-shelf'), 1);
});

test('wall items can use bare wall height while real windows and door apertures stay clear', () => {
  const s = fixture();
  const id = 'household-towel-rail';
  assert.equal(M.setRoomStyle(s, 'parlour-plain-cream'), true);
  const instance = buyAndPlace(s, id);
  assert.equal(M.moveWallDecor(s, instance, 'back', 1, .3), true);
  assert.equal(M.moveWallDecor(s, instance, 'back', 1, 3.7), true);
  assert.equal(M.moveWallDecor(s, instance, 'left', 2.3, .8), false, 'kitchen door remains a real aperture');
  assert.equal(M.moveWallDecor(s, instance, 'left', 2.3, 3.8), true, 'space above a door is usable');
  const r = jsonRoundTrip(s);
  assert.deepEqual({ wall: piece(r, instance).wall, x: piece(r, instance).x, y: piece(r, instance).y }, { wall: 'left', x: 2.3, y: 3.8 });
  assert.equal(M.setRoomStyle(r, 'parlour-manor'), true);
  const window = M.wallZones(r, 'parlour', 'back').find(z => z.kind === 'window');
  assert.ok(window);
  assert.equal(M.moveWallDecor(r, instance, 'back', window.x + .1, window.y + .1), false);
});

test('an optional bathroom never substitutes for the original attic in the level20 home task', () => {
  const s = fixture(3); assert.ok(M.buyRoomExtension(s, 'bathroom'));
  s.earned = M.LEVELS[19].at;
  s.progression.claimed = M.LEVELS.slice(0, 19).map(l => l.level);
  s.house.placed = Array.from({ length: 12 }, (_, i) => ({ instance: `goal-${i}`, id: 'd03', room: ['parlour', 'bedroom', 'kitchen', 'bathroom'][i % 4], x: 0, z: 0, books: [] }));
  assert.equal(M.homeRequirements(s, 20).find(r => r.id === 'four-rooms').met, false);
  assert.equal(M.patchLevel(s).level, 19);
  s.house.placed[3].room = 'attic';
  assert.equal(M.homeRequirements(s, 20).find(r => r.id === 'four-rooms').met, true);
  assert.equal(M.patchLevel(s).level, 20);
});

test('version15 ownership migrates conservatively and books remain unique', () => {
  const s = M.freshState(), old = JSON.parse(JSON.stringify(M.saveData(s)));
  old.version = 15; delete old.house.copies; delete old.house.extensions;
  const r = M.restoreState(old);
  assert.equal(r.coins, s.coins);
  assert.equal(r.earned, s.earned);
  assert.deepEqual(r.house.owned, s.house.owned);
  assert.equal(r.house.extensions.bathroom, false);
  assert.equal(M.ownedCopies(r, 'f01'), 1);
  assert.equal(r.house.placed.find(p => p.id === 'f11').books[0], 'b01');
  r.coins = 1000;
  assert.equal(M.buyDecor(r, 'b01'), false);
  assert.equal(M.buyDecor(r, 'f01'), true);
  assert.equal(M.ownedCopies(r, 'f01'), 2);
});

test('small animated appliances retain controls, instance identity and household earnings on reload', () => {
  const s = fixture();
  const tv = buyAndPlace(s, 'household-television');
  const laptop = buyAndPlace(s, 'household-laptop');
  const washer = buyAndPlace(s, 'household-washing-machine');
  const expected = { coins: s.coins, earned: s.earned, sold: s.sold };
  assert.ok(M.toggleHomeMedia(s, tv));
  assert.ok(M.cycleHomeChannel(s, tv)); assert.ok(M.cycleHomeChannel(s, tv));
  assert.ok(M.toggleHomeMedia(s, laptop));
  assert.ok(M.toggleHomeMedia(s, washer)); assert.ok(M.toggleHomeMedia(s, washer));
  assert.deepEqual(piece(s, tv).media, { on: true, channel: 2 });
  assert.deepEqual(piece(s, laptop).media, { on: true, channel: 0 });
  assert.deepEqual(piece(s, washer).media, { on: false, channel: 0 });
  const r = jsonRoundTrip(s);
  for (const instance of [tv, laptop, washer]) assert.deepEqual(piece(r, instance).media, piece(s, instance).media);
  assert.deepEqual({ coins: r.coins, earned: r.earned, sold: r.sold }, expected);
  assert.ok(homePieceTargets(r, 'parlour').some(t => t.instance === tv));
  r.paused = true;
  assert.equal(M.toggleHomeMedia(r, tv), false);
  assert.equal(M.cycleHomeChannel(r, tv), false);
  assert.equal(M.toggleHomeMedia(s, 'missing'), false);
});
