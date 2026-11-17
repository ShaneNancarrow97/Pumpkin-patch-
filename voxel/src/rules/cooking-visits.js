// Outdoor meals are sold by Maisie at her hatch, after the visitor's other
// purchases. Holds reserve real portions; a single server takes payment only
// once the same finite-wallet guest reaches the hatch and finishes service.
import { routeLength } from '../content/cooking-dining.js';
import { truckApproachRoute, truckHatchRoute, TRUCK_EXIT_ROUTE, TRUCK_WALK_SPEED, TRUCK_SERVICE_SECONDS, TRUCK_QUEUE_CAPACITY } from '../content/cooking-visits.js';
import { quoteFoodForCustomer, commitFoodForCustomer, releaseFoodForCustomer, protectedFoodPurse } from './cooking-sales.js';

const active = visitor => visitor.takeaway && !visitor.takeaway.gone;
export function planTruckVisit(s, visitor) {
  if (s.paused || !s.kitchen?.purchased || visitor.food?.status === 'paid' || visitor.takeaway) return false;
  if (s.visitors.filter(active).length >= TRUCK_QUEUE_CAPACITY) return false;
  visitor.foodOwner = 'visitor-' + visitor.id;
  if (!quoteFoodForCustomer(s, visitor, visitor.basket, { pumpkinsPaid: true })) return false;
  const occupied = new Set(s.visitors.filter(active).map(v => v.takeaway.place));
  let place = 0; while (occupied.has(place)) place++;
  visitor.takeaway = { phase: 'approach', place, distance: 0, remaining: 0, gone: false };
  return true;
}

export function tickTruckVisit(s, visitor, dt, events) {
  const trip = visitor.takeaway;
  if (!trip || trip.gone) return false;
  if (s.paused || !Number.isFinite(dt) || dt <= 0) return true;
  if (!s.kitchen?.purchased) {
    releaseFoodForCustomer(s, visitor);
    trip.gone = true; return true;
  }
  if (trip.phase === 'queue') {
    const busy = s.visitors.some(v => v !== visitor && active(v) && ['to-hatch', 'serving'].includes(v.takeaway.phase));
    if (!busy) { trip.phase = 'to-hatch'; trip.distance = 0; }
    return true;
  }
  if (trip.phase === 'serving') {
    trip.remaining -= dt;
    if (trip.remaining <= 1e-8) {
      const receipt = commitFoodForCustomer(s, visitor, { protectedPurse: protectedFoodPurse(s, visitor) });
      if (receipt) {
        visitor.foodSpend = (visitor.foodSpend ?? 0) + receipt.amount;
        events.push({ type: 'sale', route: 'takeaway', amount: receipt.amount, quantity: 0,
          foodQuantity: receipt.quantity, recipe: receipt.recipe, visitor: visitor.id });
      } else releaseFoodForCustomer(s, visitor);
      trip.phase = 'leaving'; trip.distance = 0;
    }
    return true;
  }
  const route = trip.phase === 'approach' ? truckApproachRoute(visitor, trip.place)
    : trip.phase === 'to-hatch' ? truckHatchRoute(trip.place) : TRUCK_EXIT_ROUTE;
  trip.distance = Math.min(routeLength(route), trip.distance + dt * TRUCK_WALK_SPEED);
  if (trip.distance >= routeLength(route) - 1e-8) {
    if (trip.phase === 'approach') { trip.phase = 'queue'; trip.distance = 0; }
    else if (trip.phase === 'to-hatch') { trip.phase = 'serving'; trip.distance = 0; trip.remaining = TRUCK_SERVICE_SECONDS; }
    else { releaseFoodForCustomer(s, visitor); trip.gone = true; }
  }
  return true;
}
