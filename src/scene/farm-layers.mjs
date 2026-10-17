import { pointAlong, stallApproach, stallDeparture, stallVisit, visitorWalkSpeed } from "../content/visitor-routes.mjs";

function farmPaintOrder(plots, positions, actors, visitors, openPlots) {
  const layers = plots.slice(0, openPlots).flatMap((plot, index) => plot.phase === "empty" ? [] : [{ kind: "crop", index, depth: positions[index].y }]);
  actors.forEach((actor, index) => layers.push({ kind: "actor", index, depth: actor.y }));
  visitors.forEach((visitor, index) => layers.push({ kind: "visitor", index, depth: visitorGround(visitor).y }));
  return layers.sort((a, b) => a.depth - b.depth || Number(a.kind === "actor") - Number(b.kind === "actor"));
}
// Where a passer-by stands: walking the path in, at Skyla's counter, or walking out.
function visitorGround(v) {
  if (v.checked && v.age >= v.leaveAt) return pointAlong(stallDeparture, (v.age - v.leaveAt) * visitorWalkSpeed);
  return pointAlong(stallApproach, v.age * visitorWalkSpeed);
}
function visitorWalking(v) {
  return v.age < stallVisit.arriveSeconds || v.checked && v.age >= v.leaveAt;
}

export { farmPaintOrder, visitorGround, visitorWalking };
