function farmPaintOrder(plots, positions, actors, visitors, openPlots) {
  const layers = plots.slice(0, openPlots).flatMap((plot, index) => plot.phase === "empty" ? [] : [{ kind: "crop", index, depth: positions[index].y }]);
  actors.forEach((actor, index) => layers.push({ kind: "actor", index, depth: actor.y }));
  visitors.forEach((visitor, index) => layers.push({ kind: "visitor", index, depth: visitorGround(visitor).y }));
  return layers.sort((a, b) => a.depth - b.depth || Number(a.kind === "actor") - Number(b.kind === "actor"));
}
function visitorGround(v) {
  if (v.age < 3) {
    const t2 = v.age / 3;
    return { x: 1030 - 197 * t2, y: 379 + Math.sin(t2 * Math.PI) * 4 };
  }
  if (!v.checked || v.age < v.leaveAt) return { x: 833, y: 379 };
  const t = Math.min(1, (v.age - v.leaveAt) / 7);
  return { x: 833 - 72 * t, y: 379 + 245 * t };
}

export { farmPaintOrder, visitorGround };
