import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import * as THREE from "three";

// Exercise the real room lifecycle, with empty room fixtures so a rendering
// context isn't needed. The front atlas is shared even on older unmarked art.
test("leaving and rebuilding rooms releases owner materials without disposing shared atlas frames", async () => {
  const stubs = {
    "customer-bag.js": "export const customerBag=()=>null,disposeCustomerBag=()=>{};",
    "food-props.js": "export const buildFoodWallDisplay=()=>null,buildFoodProp=()=>null,disposeFoodProp=()=>{};",
    "cooking-sales.js": "export const availableFood=()=>0;",
    "kitchen-equipment.js": "export const kitchenEquipment=()=>({});",
    "cooking.js": "export const RECIPE_BY_ID={};",
    "piece-colours.js": "export const applyPieceColour=()=>{};",
    "model.js": "export const GRID={w:10,d:6},footprint=()=>({}),pieceFootprint=()=>({}),pieceBody=()=>({}),roomStyle=()=>({id:'base'}),roomPieces=()=>[],roomLayout=()=>null,available=()=>0,displayCount=()=>0,decorById={},hostSurfaces=()=>[],wallMountHeight=()=>0;",
    "surfaces.js": "export const riderSize=()=>({});",
    "interiors.js": "import * as THREE from 'three';export const WALL_H=5,INTERIOR={lean:.2,pitch:.5},buildRoom=()=>({group:new THREE.Group(),lights:[],links:[]}),buildShopInterior=buildRoom,SHOP_SPOTS={counter:{x:5,z:1}};",
    "decor.js": "export const decorProp=()=>null,shelfBooks=()=>null,decorReady=()=>false;",
    "home-pets.js": "export const homePetTextures=[],createHomePets=()=>({clear(){},tick(){},status(){return[]},faceCamera(){}});",
    "home-interactions.js": "export const homePieceTargets=()=>[],petInteractionTargets=()=>[];",
    "player-home-poses.js": "export const ownerHomeTextures=[],applyHomePose=()=>false,clearHomePose=()=>{};",
    "wardrobe.js": "export const activeLook=()=>({});",
  };
  const { outputFiles } = await build({ entryPoints: [fileURLToPath(new URL("../src/places.js", import.meta.url))], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent", plugins: [{ name: "room-fixtures", setup(plugin) {
    plugin.onResolve({ filter: /^\.\// }, args => {
      if (!args.importer.endsWith("/src/places.js")) return;
      const name = args.path.split("/").pop(); return name in stubs ? { path: name, namespace: "fixture" } : null;
    });
    plugin.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: stubs[args.path], resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "js" }));
  } }] });
  const { createPlaces } = await import("data:text/javascript;base64," + Buffer.from(outputFiles[0].text).toString("base64"));
  const scene = new THREE.Scene(), front = new THREE.PlaneGeometry(1, 2), directional = new THREE.PlaneGeometry(1, 2), texture = new THREE.Texture(), directionTexture = new THREE.Texture();
  directional.userData.shared = true;
  let sharedDisposals = 0, materialDisposals = 0, actorDisposals = 0, voxelDisposals = 0, painted = true;
  for (const resource of [front, directional, texture, directionTexture]) resource.addEventListener("dispose", () => sharedDisposals++);
  const character = who => {
    const group = new THREE.Group(), lean = new THREE.Group(); group.add(lean);
    const material = new THREE.MeshStandardMaterial({ map: texture }), geometry = painted ? front : new THREE.BoxGeometry(1, 2, 1), mesh = new THREE.Mesh(geometry, material); lean.add(mesh);
    group.userData.kind = "person";
    if (painted) {
      mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ map: texture });
      material.addEventListener("dispose", () => materialDisposals++);
      mesh.customDepthMaterial.addEventListener("dispose", () => materialDisposals++);
      group.userData.dispose = () => { actorDisposals++; material.dispose(); mesh.customDepthMaterial.dispose(); };
    } else geometry.addEventListener("dispose", () => voxelDisposals++);
    return group;
  };
  const places = createPlaces({ scene, state: { house: { wallpapers: {} }, kitchen: {}, shop: {} }, character, visitorModel: () => null, pumpkinTemplate: () => null, animate: () => {} });
  places.enterRoom("parlour");
  const first = places.playerActor("shane"), mesh = first.children[0].children[0];
  mesh.geometry = directional; mesh.material.map = directionTexture; mesh.customDepthMaterial.map = directionTexture;
  places.enterRoom("kitchen");
  assert.equal(first.parent, null); assert.equal(actorDisposals, 2); assert.equal(materialDisposals, 4); assert.equal(sharedDisposals, 0);
  const next = places.playerActor("shane").children[0].children[0];
  assert.equal(next.geometry, front); assert.equal(next.material.map, texture); assert.equal(next.customDepthMaterial.map, texture);
  places.leave();
  assert.equal(actorDisposals, 4); assert.equal(materialDisposals, 8); assert.equal(sharedDisposals, 0);
  painted = false; places.enterRoom("parlour"); places.leave();
  assert.equal(voxelDisposals, 2, "uncached voxel owner geometry still gets released");
  assert.equal(sharedDisposals, 0);
});
