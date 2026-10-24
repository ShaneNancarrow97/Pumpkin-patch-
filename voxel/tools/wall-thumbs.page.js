// Transparent, room-lit renders: no sprite image or backdrop enters these icons.
import * as THREE from "three";
import { PREMIUM_WALL_ITEMS } from "../src/decor-models/premium-walls.js";
import { premiumWallProp, premiumWallStats } from "../src/premium-wall-props.js";

try {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(256, 256); renderer.setPixelRatio(1); renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .01, 50);
  scene.add(new THREE.HemisphereLight(0x8a7ac8, 0x3a2830, 1.9));
  const moon = new THREE.DirectionalLight(0xd2c6ff, 2.2); moon.position.set(6, 10, -7); scene.add(moon);
  const fill = new THREE.DirectionalLight(0xffcf9a, 1.2); fill.position.set(-1, 4, 10); scene.add(fill);
  const lamp = new THREE.PointLight(0xffd0a0, 9, 14, 1.4); lamp.position.set(-1.6, 3.6, 2.6); scene.add(lamp);
  const images = {}, stats = {};
  for (const item of PREMIUM_WALL_ITEMS) {
    const prop = premiumWallProp(item.id); scene.add(prop);
    const box = new THREE.Box3().setFromObject(prop), centre = box.getCenter(new THREE.Vector3()), dims = box.getSize(new THREE.Vector3());
    const yaw = .13, pitch = .10, halfW = (Math.cos(yaw) * dims.x + Math.sin(yaw) * dims.z) / 2;
    const halfD = (Math.sin(yaw) * dims.x + Math.cos(yaw) * dims.z) / 2;
    const halfH = (Math.cos(pitch) * dims.y + Math.sin(pitch) * halfD * 2) / 2;
    const dist = Math.max(halfW, halfH) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.15 + halfD;
    camera.position.copy(centre).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist)); camera.lookAt(centre);
    renderer.render(scene, camera);
    images[item.id] = renderer.domElement.toDataURL("image/png"); stats[item.id] = premiumWallStats(item.id);
    scene.remove(prop);
  }
  window.wallThumbResult = { images, stats };
} catch (error) { window.wallThumbError = String(error.stack || error); }
