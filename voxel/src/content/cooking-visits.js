// One shared plan for the paid truck visit and its visible walk. The hatch
// sits outside the truck body, on its paved service apron; the queue follows
// the public east lane, clear of the delivery cart and dining tables.
import { counterPlace, ROUTE_OUT } from './farm-layout.js';
import { COOKING_SITE } from './cooking-layout.js';
import { routeLength } from './cooking-dining.js';

export const TRUCK_HATCH = Object.freeze([COOKING_SITE.truck.x, 5.15]);
export const TRUCK_WALK_SPEED = 2.8;
export const TRUCK_SERVICE_SECONDS = 2;
export const TRUCK_QUEUE_CAPACITY = 8;
export const truckQueuePlace = place => [TRUCK_HATCH[0] + Math.max(0, place) * .65, 6.6];
export const truckApproachRoute = (visitor, place) => [counterPlace(visitor.spot), ...ROUTE_OUT.slice(1), truckQueuePlace(place)];
export const truckHatchRoute = place => [truckQueuePlace(place), [TRUCK_HATCH[0], 6.6], [...TRUCK_HATCH]];
export const TRUCK_EXIT_ROUTE = Object.freeze([[...TRUCK_HATCH], [TRUCK_HATCH[0], 6.6], [53.6, 6.6], [57, 6.6]]);

function along(route, distance) {
  let left = Math.max(0, distance);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (left <= length || i === route.length - 1) {
      const t = Math.min(1, left / Math.max(.001, length));
      return { x: a[0] + dx * t, z: a[1] + dz * t, dx, dz };
    }
    left -= length;
  }
  return { x: route[0][0], z: route[0][1], dx: 0, dz: -1 };
}

// Rendering reads the exact simulation distance: no separate fake service
// pause and no payment triggered by rendering or by being off camera.
export function truckGuestPose(visitor) {
  const trip = visitor.takeaway;
  if (!trip || trip.gone) return null;
  const walking = ['approach', 'to-hatch', 'leaving'].includes(trip.phase);
  const route = trip.phase === 'approach' ? truckApproachRoute(visitor, trip.place)
    : trip.phase === 'leaving' ? TRUCK_EXIT_ROUTE : truckHatchRoute(trip.place);
  const distance = trip.phase === 'queue' ? 0 : trip.phase === 'serving' ? routeLength(route) : trip.distance;
  return { ...along(route, distance), walking, waiting: !walking,
    served: visitor.food?.status === 'paid', phase: trip.phase };
}
