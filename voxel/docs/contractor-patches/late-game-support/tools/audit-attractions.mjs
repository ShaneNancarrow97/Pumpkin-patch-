#!/usr/bin/env node
// Read-only developer study. This file never changes production rules or saves.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { freshState } from '../../../../src/model.js';
import * as H from '../../../../src/rules/hayride.js';
import { hayrideJourneyTiming } from '../../../../src/content/hayride-layout.js';
import { LEVELS } from '../../../../src/rules/levels.js';
import { attractionFootfallBonus } from '../../../../src/rules/selling.js';
import { MAZE_PREFABS } from '../../../../src/content/hollow-house.js';
import { MEADOW_COMFORTS } from '../../../../src/content/festival-meadow.js';

const ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const EPS = 1e-8;
const round = value => Math.round(value * 1e6) / 1e6;
const mean = values => values.length ? round(values.reduce((sum, n) => sum + n, 0) / values.length) : null;
const sha = data => createHash('sha256').update(data).digest('hex');
const requireTrue = (value, message) => { if (!value) throw new Error(message); };
const DEFAULTS = Object.freeze({ durationSeconds: 1800, stepSeconds: 1, arrivalEverySeconds: 30, partySize: 4, guestBudget: 60, acceptance: 'capacity' });

function optionsOf(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Study options must be an object');
  for (const key of Object.keys(input)) if (!Object.hasOwn(DEFAULTS, key)) throw new TypeError('Unknown study option: ' + key);
  const o = { ...DEFAULTS, ...input };
  for (const key of ['durationSeconds', 'stepSeconds', 'arrivalEverySeconds']) {
    if (!Number.isFinite(o[key]) || o[key] <= 0) throw new RangeError(key + ' must be a positive finite number');
  }
  if (o.durationSeconds > 86400 || o.stepSeconds < .05 || o.stepSeconds > 60 || o.arrivalEverySeconds < .1) throw new RangeError('Study size exceeds its safe limits');
  if (!Number.isInteger(o.partySize) || o.partySize < 1 || o.partySize > 20) throw new RangeError('partySize must be an integer from 1 to 20');
  if (!Number.isFinite(o.guestBudget) || o.guestBudget < 0 || o.guestBudget > 10000) throw new RangeError('guestBudget must be from 0 to 10000');
  if (!['capacity', 'walk-in'].includes(o.acceptance)) throw new RangeError('acceptance must be capacity or walk-in');
  if (Math.ceil(o.durationSeconds / o.arrivalEverySeconds) * o.partySize > 100000 || o.durationSeconds / o.stepSeconds > 200000) throw new RangeError('Study is too large; use a shorter horizon or coarser inputs');
  return o;
}

function sourceEvidence() {
  const files = new Set();
  const relativeImports = text => [...text.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?:[^'";]*?\sfrom\s*)?['"](\.[^'"]+)['"]/g)].map(m => m[1]);
  function collect(file) {
    file = path.resolve(file);
    if (!file.startsWith(ROOT)) throw new Error('A study dependency is outside the repository');
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    if (files.has(relative)) return;
    files.add(relative);
    const text = fs.readFileSync(file, 'utf8');
    for (const specifier of relativeImports(text)) collect(path.resolve(path.dirname(file), specifier));
  }
  // Follow the actual static rule/model imports, including shared root data.
  // Unrelated renderer/content files must not make this standalone folder depend
  // on the earlier contractor sprite branch when applied to Claude's lead.
  const auditorFile = fileURLToPath(import.meta.url);
  for (const specifier of relativeImports(fs.readFileSync(auditorFile, 'utf8'))) collect(path.resolve(path.dirname(auditorFile), specifier));
  const sourceHashes = Object.fromEntries([...files].sort().map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
  return { sourceHashes, rulesFingerprint: sha(JSON.stringify(sourceHashes)), auditorSHA256: sha(fs.readFileSync(fileURLToPath(import.meta.url))) };
}

// Every ride upgrade is purchased through its real rule. The rest of the
// developer fixture is prepared explicitly; its house/restoration is not a cost.
function prepared({ routeLevel = 0, fleet = 1, ticketPrice = 8 } = {}) {
  if (![0, 1, 2].includes(routeLevel) || ![1, 2].includes(fleet)) throw new RangeError('Use routeLevel 0–2 and fleet 1–2');
  const s = freshState();
  s.coins = 1000000;
  s.earned = LEVELS.at(-1).at;
  s.progression.claimed = LEVELS.map(level => level.level);
  s.house.level = 3;
  s.hollowHouse.purchased = true; s.hollowHouse.status = 'ready';
  requireTrue(H.buyHayride(s), 'Prepared fixture could not buy the hayride');
  for (let i = 1; i < 3; i++) requireTrue(H.upgradeHayride(s), 'Prepared fixture could not reach tier 3');
  for (const haunt of H.HAYRIDE_SCARES.filter(item => item.tier <= 3)) requireTrue(H.buyHayrideScare(s, haunt.id), 'Could not buy ' + haunt.id);
  for (let i = 0; i < H.HAYRIDE_OPERATIONS.find(u => u.id === 'dispatch').costs.length; i++) requireTrue(H.buyHayrideOperation(s, 'dispatch'), 'Could not buy station crew tier ' + (i + 1));
  if (fleet === 2) requireTrue(H.buyHayrideOperation(s, 'fleet'), 'Could not buy a second tractor');
  for (let i = 0; i < routeLevel; i++) requireTrue(H.buyHayrideRoute(s), 'Could not buy route tier ' + (i + 1));
  requireTrue(H.setHayrideTicketPrice(s, ticketPrice), 'Ticket price is outside the current tier 3 range');
  requireTrue(H.setHayrideOpen(s, true), 'Could not open the prepared hayride');
  // Remove only fixture-generated opening invitations. No real save is loaded.
  s.arriving = [];
  s.hayride.guestTimer = 1e12;
  return s;
}

function staticFacts() {
  const plain = prepared(), fullEstate = structuredClone(plain);
  fullEstate.hollowHouse.tier = 5; fullEstate.hollowHouse.open = true;
  fullEstate.hollowHouse.haunts = { owned: MAZE_PREFABS.map(p => p.id), active: MAZE_PREFABS.map(p => p.id) };
  fullEstate.festival.meadow = true; fullEstate.festival.comforts = MEADOW_COMFORTS.map(p => p.id);
  const withoutRide = structuredClone(fullEstate); withoutRide.hayride.open = false;
  const base = H.HAYRIDE_TIERS[2];
  return {
    tier: 3, baseCaseFleet: 1, baseScare: base.scare,
    fullHauntScareContribution: H.HAYRIDE_SCARES.filter(p => p.tier <= 3).reduce((n, p) => n + p.scare, 0),
    rawScareWithoutRoutes: base.scare + H.HAYRIDE_SCARES.filter(p => p.tier <= 3).reduce((n, p) => n + p.scare, 0),
    cappedScareWithoutRoutes: H.hayrideScareRating(plain),
    standaloneHayrideFootfallPercent: round(H.hayrideFootfallBonus(plain) * 100),
    sharedFootfallCapPercent: round(attractionFootfallBonus(fullEstate) * 100),
    fullEstateFootfallWithoutRidePercent: round(attractionFootfallBonus(withoutRide) * 100),
    fullEstateMarginalRideFootfallPercent: round((attractionFootfallBonus(fullEstate) - attractionFootfallBonus(withoutRide)) * 100),
    routes: [0, 1, 2].map(routeLevel => {
      const s = prepared({ routeLevel });
      return { routeLevel, name: routeLevel ? H.HAYRIDE_ROUTE_UPGRADES[routeLevel - 1].name : 'Original circuit', circuitSeconds: H.hayrideConfig(s).circuitSeconds, scareRating: H.hayrideScareRating(s), ticketRange: H.hayrideTicketRange(s), capitalInvested: s.hayride.invested };
    }),
  };
}

/** One controlled fixture. Only the fixture state is changed by imported rules. */
export function runAttractionScenario(input = {}, studyOptions = {}) {
  const options = optionsOf(studyOptions);
  const { routeLevel = 0, fleet = 1, ticketPrice = 8 } = input;
  const s = prepared({ routeLevel, fleet, ticketPrice }), h = s.hayride;
  const afterPurchases = s.coins, startingEarned = s.earned;
  const people = new Map(), accepted = new Set(), paid = new Set(), returned = new Set();
  const queueWaits = [], returnedHungers = [], returnedHappiness = [], receipts = [];
  let offered = 0, nextArrival = 0, peakQueue = 0, peakActive = 0;
  let refusedQueue = 0, refusedBudget = 0, refusedWillingnessOrValue = 0;
  let eventIncome = 0, flaggedFrightened = 0, chargedStillRiding = 0;
  function notePeaks() {
    const o = H.hayrideOccupancy(s);
    peakQueue = Math.max(peakQueue, o.queue + o.approach);
    peakActive = Math.max(peakActive, o.total);
  }
  function offerParty() {
    for (let i = 0; i < options.partySize; i++) {
      const id = offered++;
      const v = { id, kind: id % 15, budget: options.guestBudget, originalBudget: options.guestBudget, basket: [], preferred: [0], basketLimit: 1, spot: id % 8, age: 0, leaveAt: null, festival: { done: true }, needs: { hunger: 50, thirst: 50, happiness: 70, value: 1 } };
      people.set(id, v);
      const occupancy = H.hayrideOccupancy(s);
      const timing = hayrideJourneyTiming(v, 'arrival', s);
      v.hayride = H.planHayrideVisit(s, v, 'arrival', { ...timing, force: options.acceptance === 'capacity' });
      if (v.hayride) { accepted.add(id); s.visitors.push(v); }
      else if (options.guestBudget < ticketPrice) refusedBudget++;
      else if (occupancy.queue + occupancy.approach >= H.hayrideConfig(s).queueCapacity) refusedQueue++;
      else refusedWillingnessOrValue++;
      s.nextVisitor = id + 1;
    }
    notePeaks();
  }
  while (s.time < options.durationSeconds - EPS) {
    if (nextArrival <= s.time + EPS) { offerParty(); nextArrival += options.arrivalEverySeconds; }
    const dt = Math.min(options.stepSeconds, options.durationSeconds - s.time, nextArrival - s.time);
    if (dt < EPS) { s.time = Math.min(nextArrival, options.durationSeconds); continue; }
    s.time += dt;
    const events = [];
    H.updateHayride(s, dt, events);
    for (const event of events) if (event.type === 'sale' && event.route === 'hayride-ticket') {
      requireTrue(!paid.has(event.visitor), 'A fixture visitor was charged twice');
      const v = people.get(event.visitor);
      requireTrue(v?.hayride?.charged && v.budget >= 0 && event.amount === ticketPrice, 'Ticket event lost its finite wallet');
      paid.add(event.visitor); eventIncome += event.amount; queueWaits.push(v.hayride.waited);
      receipts.push({ visitor: event.visitor, visitId: v.hayride.visitId, amount: event.amount });
    }
    notePeaks();
    for (const v of s.visitors) if (v.hayride.done && !returned.has(v.id)) {
      returned.add(v.id);
      if (paid.has(v.id)) {
        returnedHungers.push(v.needs.hunger); returnedHappiness.push(v.needs.happiness);
        if (v.hayride.fleeing) flaggedFrightened++;
      }
    }
    // Their later shopping is deliberately outside this ride-only study.
    s.visitors = s.visitors.filter(v => !v.hayride.done);
  }
  const spent = [...people.values()].reduce((sum, v) => sum + options.guestBudget - v.budget, 0);
  const cashIncrease = s.coins - afterPurchases, earnedIncrease = s.earned - startingEarned;
  const ledgerBalanced = eventIncome === h.income && Math.abs(spent - h.income) < 1e-6 && cashIncrease === h.income && earnedIncrease === h.income && paid.size === h.ticketsSold;
  requireTrue(ledgerBalanced, 'Wallet debits, events, ride revenue, coins and earned diverged');
  requireTrue(new Set(receipts.map(r => r.visitId)).size === receipts.length, 'Duplicate visit receipt');
  requireTrue(s.arriving.length === 0 && h.guestTimer > 1e9, 'Builtin invitation suppression failed');
  chargedStillRiding = s.visitors.filter(v => v.hayride.charged && ['riding', 'unloading', 'return'].includes(v.hayride.phase)).length;
  const actual = H.hayrideConfig(s), baseline = routeLevel ? prepared({ routeLevel: 0, fleet, ticketPrice }) : s, warnings = [];
  const missed = [...people.values()].filter(v => v.hayride?.missed);
  const queueTimedOut = missed.filter(v => v.hayride.waited + EPS >= H.HAYRIDE_PROPERTY.queuePatience).length;
  requireTrue(missed.length === h.missed, 'Missed visits counter diverged');
  if (routeLevel && actual.circuitSeconds > H.hayrideConfig(baseline).circuitSeconds && H.hayrideScareRating(s) <= H.hayrideScareRating(baseline) && H.hayrideTicketRange(s).max <= H.hayrideTicketRange(baseline).max) warnings.push({ code: 'route-scare-saturated', title: 'Longer route has no extra scare or ticket ceiling', text: 'The original circuit already reaches the same scare rating with its eligible haunts. This longer paid circuit adds neither scare rating nor ticket ceiling in this fixture.' });
  warnings.push({ code: 'study-scope', title: 'Ride-only fixture', text: 'Fixed arrivals and prepared upgrades isolate service capacity. Ticket revenue is not whole-farm profit or a player progression forecast.' });
  return {
    id: `route-${routeLevel}-fleet-${fleet}-ticket-${ticketPrice}`,
    label: `${routeLevel ? H.HAYRIDE_ROUTE_UPGRADES[routeLevel - 1].name : 'Original circuit'} · ${fleet} tractor${fleet > 1 ? 's' : ''} · £${ticketPrice}`,
    config: { tier: 3, routeLevel, fleet, ticketPrice, dispatch: h.dispatch, acceptance: options.acceptance, durationSeconds: options.durationSeconds, circuitSeconds: actual.circuitSeconds, seatsPerWagon: actual.seats, queueCapacity: actual.queueCapacity, capitalInvested: h.invested, scareRating: H.hayrideScareRating(s), boardingSeconds: round(H.hayrideBoardingSeconds(s)), partLoadWaitSeconds: H.hayrideLoadingWait(s), standaloneFootfallPercent: round(H.hayrideFootfallBonus(s) * 100), configuredInvitationGapSeconds: round(H.hayrideGuestGap(s)), invitationsActuallySimulated: false },
    metrics: {
      offered, accepted: accepted.size, refusedQueue, refusedBudget, refusedWillingnessOrValue,
      ticketsSold: h.ticketsSold, completed: h.completed, returnedGuests: returned.size, paidReturnedGuests: returnedHungers.length,
      ticketRevenue: h.income, ticketsPerMinute: round(h.ticketsSold * 60 / options.durationSeconds), completionsPerMinute: round(h.completed * 60 / options.durationSeconds), departures: h.departures,
      peakQueue, peakActive, meanBoardingQueueSeconds: mean(queueWaits), queueTimedOut, missedAfterAdmission: h.missed,
      remainingGuestMoney: round([...people.values()].reduce((sum, v) => sum + v.budget, 0)),
      meanPaidGuestRemainder: mean([...paid].map(id => people.get(id).budget)),
      meanReturnedHunger: mean(returnedHungers), meanReturnedHappiness: mean(returnedHappiness),
      frightenedFlagged: h.runHome, frightenedReturnedGuests: flaggedFrightened,
      activeAtEnd: s.visitors.length, chargedActiveAtEnd: chargedStillRiding,
      activePhases: s.visitors.reduce((counts, v) => ({ ...counts, [v.hayride.phase]: (counts[v.hayride.phase] ?? 0) + 1 }), {}),
      ledgerBalanced,
    },
    ledger: { offeredWalletTotal: round(offered * options.guestBudget), walletDebits: round(spent), saleEventTotal: eventIncome, coinIncreaseAfterCapital: cashIncrease, earnedIncrease, uniqueChargedVisitors: paid.size, uniqueVisitReceipts: receipts.length, retainedRuntimeReceipts: h.receipts.length },
    warnings,
  };
}

export function runAttractionAudit(input = {}) {
  const options = optionsOf(input), scenarios = [];
  for (const fleet of [1, 2]) for (const ticketPrice of [8, 12, 20]) for (const routeLevel of [0, 1, 2]) scenarios.push(runAttractionScenario({ routeLevel, fleet, ticketPrice }, options));
  const facts = staticFacts();
  const comparisons = scenarios.filter(s => s.config.routeLevel > 0).map(s => {
    const base = scenarios.find(b => b.config.fleet === s.config.fleet && b.config.ticketPrice === s.config.ticketPrice && b.config.routeLevel === 0);
    return { baselineId: base.id, scenarioId: s.id, addedCircuitSeconds: s.config.circuitSeconds - base.config.circuitSeconds, addedCapital: s.config.capitalInvested - base.config.capitalInvested, addedScare: s.config.scareRating - base.config.scareRating, addedStandaloneFootfallPoints: round(s.config.standaloneFootfallPercent - base.config.standaloneFootfallPercent), ticketDelta: s.metrics.ticketsSold - base.metrics.ticketsSold, completionDelta: s.metrics.completed - base.metrics.completed, revenueDelta: s.metrics.ticketRevenue - base.metrics.ticketRevenue };
  });
  return {
    version: 1,
    scope: 'Controlled ride capacity study — not whole-farm profit or a player-time forecast',
    options,
    assumptions: [
      `Prepared tier 3 attraction, all eligible haunts and all available station-crew tiers. Each case starts afresh; ${options.durationSeconds}s horizon.`,
      `The same ${options.partySize} visitors are offered every ${options.arrivalEverySeconds}s, starting at time 0. Each has a finite £${options.guestBudget} wallet and hunger 50.`,
      options.acceptance === 'capacity' ? 'Capacity mode forces the willingness/value roll only. Affordability, queue limits, actual boarding, payment, circuit and return rules still apply.' : 'Walk-in mode keeps the real deterministic willingness/value roll. Guests are not marked as attraction-invited.',
      'The automatic opening party and attraction-generated invitations are disabled only in these private fixtures so demand is identical across configurations.',
      'Actual physical approach/return timing is used. Each visitor is offered one ride and then removed after their return, without later shopping or a second attraction.',
      'Farm production, food/cocoa sales, tips, other attractions, natural needs drift and whole-farm arrival generation are excluded. The real hayride unloading effects still apply.',
      'The house and Hollow House are prepared fixtures. Hayride capital is purchased through real rules and reported separately; it is not an operating cost/profit estimate.',
      'The horizon stops exactly without draining the queue. Tickets already sold, rides completed and guests fully returned are reported separately.',
      'The planner returns a refusal without a reason code. Audit classifications check insufficient budget first, then a full queue, then the remaining willingness/value rejection.',
      'Frightened is the current ride flag/statistic. It does not prove that a returned arrival visitor actually leaves the whole farm.',
    ],
    ...sourceEvidence(),
    metricDefinitions: {
      ticketRevenue: 'Gross ticket receipts in the fixed study window. No retail revenue, operating costs or profit forecast is included.',
      ticketsSold: 'Unique admitted visitors who actually paid at boarding, including anyone still on their trip at the window end.',
      completed: 'Paid guests whose wagon finished unloading by the window end.',
      returnedGuests: 'All admitted visits whose physical return finished, including guests who missed the ride after admission.',
      paidReturnedGuests: 'Paid guests whose physical return finished by the window end.',
      configuredInvitationGapSeconds: 'The current rule’s calculated invitation gap; automatic invitations are held off in this fixture.',
      meanReturnedHunger: 'Paid returned guests only. Natural need drift is excluded; actual hayride unloading effects are included.',
      refusedQueue: 'A refused offer with enough money where the actual approach/queue occupancy has reached capacity.',
      refusedWillingnessOrValue: 'A refused offer with enough money and available queue capacity under the real willingness/value rule.',
    },
    staticFacts: facts,
    scenarios,
    findings: [
      { id: 'route-payoff-at-scare-cap', severity: scenarios.some(s => s.warnings.some(w => w.code === 'route-scare-saturated')) ? 'review' : 'context', title: scenarios.some(s => s.warnings.some(w => w.code === 'route-scare-saturated')) ? 'Longer routes need a benefit beyond capped scare' : 'Review the changed route benefits', text: `Tier 3 and all eligible haunt content total ${facts.rawScareWithoutRoutes} raw scare; the current rule reports ${facts.cappedScareWithoutRoutes} before a detour. Routes change the paid circuit from ${facts.routes[0].circuitSeconds} to ${facts.routes[2].circuitSeconds}s. Compare scare, ticket ranges and the paired results below. These results cover this fixture only; scenery/POV enjoyment is not monetised by the audit.`, comparisons },
      { id: 'shared-footfall-cap', severity: 'context', title: 'Permanent footfall bonuses do not all stack', text: `A fully dressed maze and meadow provide ${facts.fullEstateFootfallWithoutRidePercent}% combined attraction footfall. The ride has a standalone ${facts.standaloneHayrideFootfallPercent}% bonus, but adds ${facts.fullEstateMarginalRideFootfallPercent} points in that context before the shared ${facts.sharedFootfallCapPercent}% result. Invitation demand remains a separate mechanism.`, comparisons: [] },
      { id: 'finite-visit-wallet', severity: 'context', title: 'Ticket money is the visitor’s real money', text: 'Every scenario checks unique charges and equality of wallet debits, ticket events, ride income, coins and earned. The remaining purse is available for later businesses, whose sales this study deliberately does not predict.', comparisons: [] },
    ],
    summary: { scenarioCount: scenarios.length, ledgerBalanced: scenarios.every(s => s.metrics.ledgerBalanced), minimumTicketThroughput: Math.min(...scenarios.map(s => s.metrics.ticketsPerMinute)), maximumTicketThroughput: Math.max(...scenarios.map(s => s.metrics.ticketsPerMinute)), pairedLongerRoutesWithFewerCompletions: comparisons.filter(c => c.completionDelta < 0).length, pairedRouteComparisons: comparisons.length, headline: 'Compare service-capacity consequences separately from the creative value of new scenery.' },
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2), options = {}, read = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const valueFlags = new Set(['--out', '--duration-seconds', '--step-seconds', '--arrival-every', '--party-size', '--guest-budget', '--acceptance']);
  if (args.includes('--help')) {
    console.log('Read-only attraction audit\n  node audit-attractions.mjs --out report.json\n  Optional: --duration-seconds 1800 --step-seconds 1 --arrival-every 30 --party-size 4 --guest-budget 60 --acceptance capacity|walk-in\nThis is a prepared ride-only study, not a whole-farm profit or player-time forecast.');
    process.exit(0);
  }
  for (let i = 0; i < args.length; i += 2) {
    if (!valueFlags.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Unknown flag or missing value: ' + args[i]);
  }
  for (const [flag, key] of [['--duration-seconds', 'durationSeconds'], ['--step-seconds', 'stepSeconds'], ['--arrival-every', 'arrivalEverySeconds'], ['--party-size', 'partySize'], ['--guest-budget', 'guestBudget']]) if (read(flag) !== undefined) options[key] = Number(read(flag));
  if (read('--acceptance')) options.acceptance = read('--acceptance');
  const report = runAttractionAudit(options), output = read('--out');
  if (output) { const file = path.resolve(output); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n'); console.log('Wrote ' + report.scenarios.length + ' controlled scenarios to ' + file); }
  else process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
