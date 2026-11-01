import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runAttractionAudit, runAttractionScenario } from '../tools/audit-attractions.mjs';

test('matched inputs produce a reproducible 18-case study with source fingerprints', () => {
  const options = Object.freeze({ durationSeconds: 240 });
  const a = runAttractionAudit(options), b = runAttractionAudit(options);
  assert.deepEqual(a, b);
  assert.equal(a.scenarios.length, 18);
  assert.equal(new Set(a.scenarios.map(s => s.id)).size, 18);
  assert.equal(a.summary.ledgerBalanced, true);
  assert.match(a.scope, /not whole-farm profit/);
  assert.equal(a.options.acceptance, 'capacity');
  assert.ok(a.assumptions.some(text => text.includes('forces the willingness/value roll only')));
  assert.ok(Object.keys(a.sourceHashes).length > 50, 'capture shared rules/content, not only immediate ride imports');
  assert.ok(Object.hasOwn(a.sourceHashes, 'src/core/costume-model.mjs'), 'include shared repository dependencies of the model');
  assert.equal(Object.hasOwn(a.sourceHashes, 'voxel/src/content/directional-atlas.js'), false, 'unrelated contractor sprite content must not tie the pack to another branch');
  assert.equal(Object.hasOwn(a.sourceHashes, 'voxel/src/content/hayride-icon-map.js'), false, 'unrelated renderer content is not an audit input');
  const key = 'voxel/src/rules/hayride.js';
  const bytes = readFileSync(new URL('../../../../src/rules/hayride.js', import.meta.url));
  assert.equal(a.sourceHashes[key], createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual([...new Set(a.scenarios.map(s => s.metrics.offered))], [32]);
  assert.ok(a.scenarios.every(s => s.config.invitationsActuallySimulated === false));
});

test('actual ticket transactions conserve finite wallets and capital is kept separate', () => {
  const result = runAttractionScenario({ routeLevel: 2, fleet: 2, ticketPrice: 12 }, { durationSeconds: 600, guestBudget: 60.1 });
  const { config: c, metrics: m, ledger: l } = result;
  assert.ok(m.ticketsSold > 0 && c.capitalInvested > m.ticketRevenue);
  assert.equal(m.ticketRevenue, m.ticketsSold * c.ticketPrice);
  assert.equal(m.ticketRevenue, l.walletDebits);
  assert.equal(m.ticketRevenue, l.saleEventTotal);
  assert.equal(m.ticketRevenue, l.coinIncreaseAfterCapital);
  assert.equal(m.ticketRevenue, l.earnedIncrease);
  assert.equal(m.ticketsSold, l.uniqueChargedVisitors);
  assert.equal(m.ticketsSold, l.uniqueVisitReceipts);
  assert.ok(Math.abs(l.offeredWalletTotal - m.remainingGuestMoney - m.ticketRevenue) < 1e-6);
  assert.ok(m.completed <= m.ticketsSold && m.paidReturnedGuests <= m.completed);
  assert.equal(m.meanPaidGuestRemainder, 48.1);
  assert.equal(m.ledgerBalanced, true);
});

test('forced capacity acceptance does not bypass an insufficient guest budget', () => {
  const result = runAttractionScenario({ fleet: 2, ticketPrice: 12 }, { durationSeconds: 300, guestBudget: 10 });
  assert.ok(result.metrics.offered > 0);
  assert.equal(result.metrics.accepted, 0);
  assert.equal(result.metrics.refusedBudget, result.metrics.offered);
  assert.equal(result.metrics.ticketsSold, 0);
  assert.equal(result.metrics.ticketRevenue, 0);
  assert.equal(result.metrics.ledgerBalanced, true);
});

test('ordinary walk-in mode preserves willingness/value choices', () => {
  const config = { routeLevel: 0, fleet: 2, ticketPrice: 12 };
  const capacity = runAttractionScenario(config, { durationSeconds: 600 });
  const walkIn = runAttractionScenario(config, { durationSeconds: 600, acceptance: 'walk-in' });
  assert.equal(walkIn.metrics.offered, capacity.metrics.offered);
  assert.ok(walkIn.metrics.refusedWillingnessOrValue > 0);
  assert.ok(walkIn.metrics.accepted < capacity.metrics.accepted);
  assert.equal(walkIn.metrics.ledgerBalanced, true);
});

test('event-aligned half-second and one-second steps preserve outcomes', () => {
  const config = Object.freeze({ routeLevel: 2, fleet: 2, ticketPrice: 12 });
  const a = runAttractionScenario(config, { durationSeconds: 600, stepSeconds: 1 });
  const b = runAttractionScenario(config, { durationSeconds: 600, stepSeconds: .5 });
  assert.deepEqual(a, b);
});

test('the ledger remains complete after the live ride truncates its receipt history', () => {
  const r = runAttractionScenario({ fleet: 2, ticketPrice: 8 }, { durationSeconds: 3600, arrivalEverySeconds: 10, partySize: 8 });
  assert.ok(r.metrics.ticketsSold > 256);
  assert.equal(r.ledger.retainedRuntimeReceipts, 256);
  assert.equal(r.ledger.uniqueVisitReceipts, r.metrics.ticketsSold);
  assert.equal(r.ledger.saleEventTotal, r.metrics.ticketRevenue);
  assert.equal(r.metrics.ledgerBalanced, true);
});

test('paid departures and completed returns are kept distinct at the horizon', () => {
  const r = runAttractionScenario({ fleet: 2, ticketPrice: 8 }, { durationSeconds: 60 });
  assert.ok(r.metrics.ticketsSold > 0);
  assert.equal(r.metrics.completed, 0);
  assert.equal(r.metrics.paidReturnedGuests, 0);
  assert.ok(r.metrics.chargedActiveAtEnd > 0);
});

test('route warnings are conditional evidence and the original circuit is not mislabelled', () => {
  const report = runAttractionAudit({ durationSeconds: 300 });
  const baseline = report.scenarios.find(s => s.id === 'route-0-fleet-1-ticket-12');
  const detour = report.scenarios.find(s => s.id === 'route-2-fleet-1-ticket-12');
  assert.equal(baseline.warnings.some(w => w.code === 'route-scare-saturated'), false);
  if (detour.config.scareRating <= baseline.config.scareRating && report.staticFacts.routes[2].ticketRange.max <= report.staticFacts.routes[0].ticketRange.max && detour.config.circuitSeconds > baseline.config.circuitSeconds) {
    assert.equal(detour.warnings.some(w => w.code === 'route-scare-saturated'), true);
  }
  const comparisons = report.findings.find(f => f.id === 'route-payoff-at-scare-cap').comparisons;
  assert.equal(comparisons.length, 12);
  for (const c of comparisons) {
    const base = report.scenarios.find(s => s.id === c.baselineId), candidate = report.scenarios.find(s => s.id === c.scenarioId);
    assert.equal(base.config.fleet, candidate.config.fleet);
    assert.equal(base.config.ticketPrice, candidate.config.ticketPrice);
    assert.equal(base.metrics.offered, candidate.metrics.offered);
    assert.equal(c.completionDelta, candidate.metrics.completed - base.metrics.completed);
    assert.equal(c.revenueDelta, candidate.metrics.ticketRevenue - base.metrics.ticketRevenue);
  }
});

test('invalid or accidentally enormous studies are rejected without running fixtures', () => {
  for (const options of [{ stepSeconds: 0 }, { durationSeconds: -1 }, { guestBudget: NaN }, { acceptance: 'all-win' }, { partySize: 21 }, { unknownOption: true }, { durationSeconds: 86400, arrivalEverySeconds: .1, partySize: 20 }]) assert.throws(() => runAttractionAudit(options));
  assert.throws(() => runAttractionAudit(null));
  assert.throws(() => runAttractionScenario({ routeLevel: 3 }));
  assert.throws(() => runAttractionScenario({ fleet: 3 }));
  assert.throws(() => runAttractionScenario({ ticketPrice: 500 }));
});
