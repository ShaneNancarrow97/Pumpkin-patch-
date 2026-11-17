// Rules and decoration checks only matter to the controller inside the full
// glow radius. Read current sites every time so a respawn never needs a cache.
export function nearbyVillageResourceTargets(nodes, position, positionOf, ready, reach, stats) {
  const targets = [];
  if (stats) stats.passes++;
  for (const node of nodes) {
    if (stats) stats.nodePositionsChecked++;
    const at = positionOf(node);
    if (!at) continue;
    const dx = at.x - position.x, dz = at.z - position.z;
    if (Math.abs(dx) >= reach || Math.abs(dz) >= reach || !(Math.hypot(dx, dz) < reach)) continue;
    if (stats) stats.nodeEligibilityChecks++;
    if (!ready(node.id)) continue;
    targets.push({ type: "village-node", id: node.id, x: at.x, z: at.z });
  }
  if (stats) stats.nearbyNodes = targets.length;
  return targets;
}

// The old stable distance sort gave tracked activities first, then the nearest
// activity, then any nearby target. Retain that order without copying every row.
export function nearestVillageInteractionTarget(targets, position, { gatherReach, talkReach, withinResidentReach, followedStep } = {}) {
  let nearest = null, activity = null, followed = null;
  let nearestDistance = Infinity, activityDistance = Infinity, followedDistance = Infinity;
  for (const target of targets) {
    const distance = Math.hypot(target.x - position.x, target.z - position.z);
    const reachable = target.type === "village-folk" ? withinResidentReach(distance, target.reach) : distance < (target.type === "village-node" ? gatherReach : talkReach);
    if (!reachable) continue;
    if (distance < nearestDistance) { nearest = target; nearestDistance = distance; }
    if (target.type !== "expansion-activity") continue;
    if (distance < activityDistance) { activity = target; activityDistance = distance; }
    if (target.id === followedStep && distance < followedDistance) { followed = target; followedDistance = distance; }
  }
  const target = followed ?? activity ?? nearest;
  return target ? { ...target, d: followed ? followedDistance : activity ? activityDistance : nearestDistance } : null;
}
