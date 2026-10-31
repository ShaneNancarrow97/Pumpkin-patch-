// Where people walk on the farm, as lines: the guests' own routes to the
// stall, out to the road, round the meadow, to the Hollow House, to the
// hayride and to the food truck's tables, for whichever of those are open.
// The caretakers keep to them (rules/cleanliness.js), so they never cut
// across the pumpkin patch or through a building; the litter they go after
// lies on them, where a guest dropped it.
import { ROUTE_IN, ROUTE_OUT, extendFarmRoute, farmPathEnd } from "./farm-layout.js";
import { MEADOW_PATHS, COCOA_APPROACH, PUMPKIN_APPROACH, CHAT_SPOTS } from "./festival-meadow.js";
import { HOLLOW_PATHS } from "./hollow-house.js";
import { HAYRIDE_FRONT_APPROACH, HAYRIDE_UNLOAD_PATH, hayrideApproach } from "./hayride-layout.js";
import { DINING_SEATS, diningRoute } from "./cooking-dining.js";

export function farmWalks(s) {
  const lines = [extendFarmRoute(ROUTE_IN, s), ROUTE_OUT];
  if (s?.festival?.meadow) {
    lines.push(...MEADOW_PATHS, extendFarmRoute(COCOA_APPROACH, s), PUMPKIN_APPROACH);
    for (const spot of CHAT_SPOTS) for (const route of [spot.to, spot.exit]) if (route?.length > 1) lines.push(extendFarmRoute(route, s));
  }
  if (s?.hollowHouse?.purchased) lines.push(...HOLLOW_PATHS.map((route) => extendFarmRoute(route, s)));
  if (s?.hayride?.purchased) lines.push(hayrideApproach(), extendFarmRoute(HAYRIDE_FRONT_APPROACH, s), HAYRIDE_UNLOAD_PATH);
  if (s?.kitchen?.purchased) lines.push(...DINING_SEATS.map((seat) => diningRoute(seat.id)));
  return lines;
}

// A line's end that stops this close to another line, part-way along it, joins it there.
const JOIN = 1.2;
const near = (line, x, z) => {
  let best = null;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i], dx = bx - ax, dz = bz - az, n = dx * dx + dz * dz;
    const t = n ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / n)) : 0, px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { i, t, x: px, z: pz, d };
  }
  return best;
};
// The walks as a graph: every bend a node, every stretch between two an edge,
// and an edge wherever a line's end meets another line.
function build(lines) {
  const copy = lines.map((line) => line.map(([x, z]) => [x, z])), joins = [];
  for (let a = 0; a < copy.length; a++) for (const [x, z] of [copy[a][0], copy[a].at(-1)]) for (let b = 0; b < copy.length; b++) {
    if (a === b) continue;
    const hit = near(copy[b], x, z);
    if (!hit || hit.d >= JOIN) continue;
    if (hit.t > .001 && hit.t < .999) copy[b].splice(hit.i, 0, [hit.x, hit.z]);
    joins.push([[x, z], [hit.x, hit.z]]);
  }
  const nodes = [], index = new Map(), edges = [];
  const node = ([x, z]) => { const key = `${Math.round(x * 20)},${Math.round(z * 20)}`; if (!index.has(key)) { index.set(key, nodes.length); nodes.push({ x, z, links: [] }); } return index.get(key); };
  const link = (p, q) => { const a = node(p), b = node(q); if (a === b || nodes[a].links.some((l) => l.to === b)) return; const w = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z); nodes[a].links.push({ to: b, w }); nodes[b].links.push({ to: a, w }); edges.push([a, b]); };
  for (const line of copy) for (let i = 1; i < line.length; i++) link(line[i - 1], line[i]);
  for (const [p, q] of joins) link(p, q);
  return { nodes, edges };
}
const graphs = new Map();
const graphFor = (s) => {
  const key = [s?.festival?.meadow, s?.hollowHouse?.purchased, s?.hayride?.purchased, s?.kitchen?.purchased].map(Number).join("") + farmPathEnd(s);
  if (!graphs.has(key)) graphs.set(key, build(farmWalks(s)));
  return graphs.get(key);
};
// The nearest point on any stretch of the walks.
function attach({ nodes, edges }, x, z) {
  let best = null;
  for (const [a, b] of edges) {
    const hit = near([[nodes[a].x, nodes[a].z], [nodes[b].x, nodes[b].z]], x, z);
    if (!best || hit.d < best.d) best = { ...hit, a, b };
  }
  return best;
}

// The way to walk from one point to another ({ x, z } each): onto the nearest
// walk, along the walks, and off again to the point. Returns the points to
// walk through, the last of them `to`.
export function walkRoute(s, from, to) {
  const g = graphFor(s), start = attach(g, from.x, from.z), end = attach(g, to.x, to.z);
  const out = [];
  const add = (x, z) => { const p = out.at(-1) ?? [from.x, from.z]; if (Math.hypot(p[0] - x, p[1] - z) > .01) out.push([x, z]); };
  if (!start || !end) { add(to.x, to.z); return out; }
  add(start.x, start.z);
  const sameStretch = (start.a === end.a && start.b === end.b) || (start.a === end.b && start.b === end.a);
  if (!sameStretch) {
    // Dijkstra from both ends of the starting stretch, to either end of the last one.
    const n = g.nodes.length, cost = new Float64Array(n).fill(Infinity), from_ = new Int32Array(n).fill(-1), done = new Uint8Array(n);
    const P = (i) => [g.nodes[i].x, g.nodes[i].z];
    for (const i of [start.a, start.b]) cost[i] = Math.hypot(start.x - g.nodes[i].x, start.z - g.nodes[i].z);
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && cost[i] < Infinity && (u < 0 || cost[i] < cost[u])) u = i;
      if (u < 0) break;
      done[u] = 1;
      for (const { to: v, w } of g.nodes[u].links) if (cost[u] + w < cost[v]) { cost[v] = cost[u] + w; from_[v] = u; }
    }
    const last = [end.a, end.b].map((i) => ({ i, total: cost[i] + Math.hypot(end.x - g.nodes[i].x, end.z - g.nodes[i].z) })).sort((p, q) => p.total - q.total)[0];
    if (Number.isFinite(last.total)) {
      const chain = [];
      for (let i = last.i; i >= 0; i = from_[i]) chain.unshift(i);
      for (const i of chain) add(...P(i));
    }
  }
  add(end.x, end.z); add(to.x, to.z);
  return out;
}
