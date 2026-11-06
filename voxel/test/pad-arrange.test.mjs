import test from "node:test";
import assert from "node:assert/strict";
import { pieceInDirection, nearestSpot, cycleSpot } from "../src/pad-arrange.js";

// A room seen from the front: a sofa in the middle, a lamp left, a table right,
// a picture high on the back wall, a rug near the front.
const room = [
  { id: "sofa", x: 500, y: 300 }, { id: "lamp", x: 200, y: 290 }, { id: "table", x: 780, y: 320 },
  { id: "picture", x: 520, y: 90 }, { id: "rug", x: 470, y: 520 }, { id: "plant", x: 900, y: 120 },
];
const at = (id) => room.find((s) => s.id === id);

test("a push lands on the piece that way, nearer and straighter first", () => {
  assert.equal(pieceInDirection(room, at("sofa"), 1, 0).id, "table");
  assert.equal(pieceInDirection(room, at("sofa"), -1, 0).id, "lamp");
  assert.equal(pieceInDirection(room, at("sofa"), 0, -1).id, "picture");
  assert.equal(pieceInDirection(room, at("sofa"), 0, 1).id, "rug");
  assert.equal(pieceInDirection(room, at("table"), 0, -1).id, "plant", "up from the table is the plant above it, not the picture across the room");
  assert.equal(pieceInDirection(room, at("lamp"), -1, 0), null, "nothing further left");
  assert.equal(pieceInDirection(room, at("sofa"), .7, .7).id, "table", "a diagonal push still finds what's that way");
});

test("the ring starts on the piece nearest the middle, and the bumpers read left to right, top to bottom", () => {
  assert.equal(nearestSpot(room, 480, 320).id, "sofa");
  assert.equal(nearestSpot([], 0, 0), null);
  const order = []; let id = null;
  for (let i = 0; i < room.length; i++) { id = cycleSpot(room, id, 1).id; order.push(id); }
  assert.deepEqual(order, ["picture", "plant", "lamp", "sofa", "table", "rug"]);
  assert.equal(cycleSpot(room, "picture", -1).id, "rug", "and wrap round");
  assert.equal(cycleSpot([], "x", 1), null);
});
