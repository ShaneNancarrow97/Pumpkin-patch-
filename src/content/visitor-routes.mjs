// Outdoor visitors follow the stone path, in map units (the farm is 1000 × 610).
// Traced from the route drawn over the map on 17 October 2026: in from below
// the bottom edge, up the path to the fork beneath the shop, along the short
// spur to Skyla's counter, then back to the fork and out past the shop to the
// top right.
var visitorWalkSpeed = 68;
var stallApproach = [[901, 720], [900, 610], [899, 584], [887, 534], [825, 456], [824, 438], [825, 418], [883, 356], [835, 316]];
var stallDeparture = [[835, 316], [883, 356], [956, 308], [1045, 250]];
function routeLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}
// The point `distance` along a route, clamped to its ends.
function pointAlong(points, distance) {
  let left = Math.max(0, distance);
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i], step = Math.hypot(x1 - x0, y1 - y0);
    if (left <= step) {
      const t = step ? left / step : 0;
      return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
    }
    left -= step;
  }
  const [x, y] = points[points.length - 1];
  return { x, y };
}
// Visit timings in seconds. The model sells when a visitor reaches the counter,
// so arrival and departure follow the route lengths at walking pace.
var stallVisit = {
  arriveSeconds: routeLength(stallApproach) / visitorWalkSpeed,
  patienceSeconds: 6,
  lingerSeconds: 1,
  leaveSeconds: routeLength(stallDeparture) / visitorWalkSpeed
};

export { pointAlong, routeLength, stallApproach, stallDeparture, stallVisit, visitorWalkSpeed };
