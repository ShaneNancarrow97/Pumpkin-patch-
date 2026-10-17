import { findProduct, productForLegacyPrice } from "../content/products.js";

var safeCount = (value) => Number.isSafeInteger(value) && value >= 0;
var positiveCount = (value) => safeCount(value) && value > 0;
var stableId = (value) => typeof value === "string" && /^[a-zA-Z0-9:_-]{1,100}$/.test(value);
var record = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function freshInventory() {
  return { version: 1, nextLot: 0, nextReservation: 0, lots: [], reservations: [] };
}
function stockQuantity(inventory, productId, locationId) {
  return inventory.lots.reduce((total, lot) => total + ((!productId || lot.productId === productId) && (!locationId || lot.locationId === locationId) ? lot.quantity : 0), 0);
}
function stockValue(inventory) {
  return inventory.lots.reduce((total, lot) => total + lot.quantity * lot.unitPrice, 0);
}
function heldQuantity(inventory, lotId) {
  return inventory.reservations.reduce((total, reservation) => total + reservation.lines.reduce((sum, line) => sum + (line.lotId === lotId ? line.quantity : 0), 0), 0);
}
function availableQuantity(inventory, productId, locationId) {
  return inventory.lots.reduce((total, lot) => total + ((!productId || lot.productId === productId) && (!locationId || lot.locationId === locationId) ? lot.quantity - heldQuantity(inventory, lot.id) : 0), 0);
}
function addStock(inventory, productId, quantity = 1, locationId = "barn", unitPrice = findProduct(productId)?.defaultPrice) {
  if (!findProduct(productId) || !positiveCount(quantity) || !stableId(locationId) || !safeCount(unitPrice) || !Number.isSafeInteger(stockQuantity(inventory) + quantity) || !Number.isSafeInteger(stockValue(inventory) + quantity * unitPrice))
    return false;
  const last = inventory.lots[inventory.lots.length - 1];
  if (last?.productId === productId && last.locationId === locationId && last.unitPrice === unitPrice) {
    last.quantity += quantity;
  } else {
    if (!safeCount(inventory.nextLot) || inventory.nextLot >= Number.MAX_SAFE_INTEGER)
      return false;
    inventory.lots.push({ id: "lot-" + inventory.nextLot++, productId, quantity, locationId, unitPrice });
  }
  return true;
}
function addLegacyStock(inventory, unitPrice, quantity = 1) {
  const product = productForLegacyPrice(unitPrice);
  return !!product && addStock(inventory, product.id, quantity, "barn", unitPrice);
}
function migrateLegacyInventory(prices) {
  if (!Array.isArray(prices))
    return null;
  const inventory = freshInventory();
  let value = 0;
  for (const price2 of prices) {
    const product = productForLegacyPrice(price2);
    if (!product)
      return null;
    value += product.defaultPrice;
    if (!Number.isSafeInteger(value))
      return null;
    const last = inventory.lots[inventory.lots.length - 1];
    if (last?.productId === product.id && last.unitPrice === price2)
      last.quantity++;
    else
      inventory.lots.push({
        id: "lot-" + inventory.nextLot++,
        productId: product.id,
        locationId: "barn",
        quantity: 1,
        unitPrice: product.defaultPrice
      });
  }
  return inventory;
}
function reserveStock(inventory, owner, requests, maxAmount = Number.MAX_SAFE_INTEGER) {
  if (!stableId(owner) || !Array.isArray(requests) || !requests.length || !safeCount(maxAmount) || inventory.reservations.some((reservation2) => reservation2.owner === owner) || !safeCount(inventory.nextReservation) || inventory.nextReservation >= Number.MAX_SAFE_INTEGER)
    return null;
  const planned = /* @__PURE__ */ new Map();
  let amount = 0;
  for (const request of requests) {
    if (!request || !findProduct(request.productId) || !positiveCount(request.quantity) || request.locationId !== void 0 && !stableId(request.locationId))
      return null;
    let remaining = request.quantity;
    for (const lot of inventory.lots) {
      if (lot.productId !== request.productId || request.locationId && lot.locationId !== request.locationId)
        continue;
      const previous = planned.get(lot.id);
      const free = lot.quantity - heldQuantity(inventory, lot.id) - (previous?.quantity || 0);
      const quantity = Math.min(remaining, free);
      if (quantity <= 0)
        continue;
      amount += quantity * lot.unitPrice;
      if (!Number.isSafeInteger(amount) || amount > maxAmount)
        return null;
      planned.set(lot.id, { lotId: lot.id, quantity: quantity + (previous?.quantity || 0), unitPrice: lot.unitPrice });
      remaining -= quantity;
      if (!remaining)
        break;
    }
    if (remaining)
      return null;
  }
  const reservation = {
    id: "reservation-" + inventory.nextReservation++,
    owner,
    lines: [...planned.values()]
  };
  inventory.reservations.push(reservation);
  return structuredCopy(reservation);
}
function structuredCopy(reservation) {
  return { ...reservation, lines: reservation.lines.map((line) => ({ ...line })) };
}
function releaseStock(inventory, reservationId) {
  const index = inventory.reservations.findIndex((reservation) => reservation.id === reservationId);
  if (index < 0)
    return false;
  inventory.reservations.splice(index, 1);
  return true;
}
function commitStock(inventory, reservationId) {
  const reservation = inventory.reservations.find((item) => item.id === reservationId);
  if (!reservation)
    return null;
  const lines = reservation.lines.map((line) => ({ line, lot: inventory.lots.find((lot) => lot.id === line.lotId) }));
  if (lines.some(({ line, lot }) => !lot || lot.quantity < line.quantity))
    return null;
  const amount = reservation.lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
  const quantity = reservation.lines.reduce((total, line) => total + line.quantity, 0);
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(quantity))
    return null;
  for (const { line, lot } of lines)
    lot.quantity -= line.quantity;
  inventory.lots = inventory.lots.filter((lot) => lot.quantity > 0);
  releaseStock(inventory, reservationId);
  return { reservationId, owner: reservation.owner, amount, quantity, lines: reservation.lines.map((line) => ({ ...line })) };
}
function decodeInventory(raw) {
  if (!record(raw) || raw.version !== 1 || !safeCount(raw.nextLot) || !safeCount(raw.nextReservation) || !Array.isArray(raw.lots) || !Array.isArray(raw.reservations))
    return null;
  const inventory = freshInventory(), ids = /* @__PURE__ */ new Set();
  inventory.nextLot = raw.nextLot;
  inventory.nextReservation = raw.nextReservation;
  for (const value of raw.lots) {
    if (!record(value) || !stableId(value.id) || !/^lot-\d+$/.test(value.id) || ids.has(value.id) || !findProduct(value.productId) || !stableId(value.locationId) || !positiveCount(value.quantity) || !safeCount(value.unitPrice))
      return null;
    if (Number(value.id.slice(4)) >= inventory.nextLot)
      return null;
    ids.add(value.id);
    inventory.lots.push({
      id: value.id,
      productId: value.productId,
      locationId: value.locationId,
      quantity: value.quantity,
      unitPrice: value.unitPrice
    });
  }
  if (!Number.isSafeInteger(stockQuantity(inventory)) || !Number.isSafeInteger(stockValue(inventory)))
    return null;
  const owners = /* @__PURE__ */ new Set(), reservationIds = /* @__PURE__ */ new Set();
  for (const value of raw.reservations) {
    if (!record(value) || !stableId(value.id) || !/^reservation-\d+$/.test(value.id) || reservationIds.has(value.id) || !stableId(value.owner) || owners.has(value.owner) || !Array.isArray(value.lines) || !value.lines.length || Number(value.id.slice(12)) >= inventory.nextReservation)
      return null;
    const reservation = { id: value.id, owner: value.owner, lines: [] }, seen = /* @__PURE__ */ new Set();
    for (const line of value.lines) {
      if (!record(line) || !stableId(line.lotId) || seen.has(line.lotId) || !positiveCount(line.quantity) || !safeCount(line.unitPrice))
        return null;
      const lot = inventory.lots.find((lot2) => lot2.id === line.lotId);
      if (!lot || line.unitPrice !== lot.unitPrice || line.quantity + heldQuantity(inventory, lot.id) > lot.quantity)
        return null;
      seen.add(line.lotId);
      reservation.lines.push({ lotId: line.lotId, quantity: line.quantity, unitPrice: line.unitPrice });
    }
    owners.add(value.owner);
    reservationIds.add(value.id);
    inventory.reservations.push(reservation);
  }
  return inventory;
}

export { addLegacyStock, availableQuantity, commitStock, decodeInventory, freshInventory, migrateLegacyInventory, releaseStock, reserveStock, stockQuantity };
