import * as GPU from "three/webgpu";

// Keep GPU camera/material/light state separate from the legacy map renderer.
// Geometry, instanced attributes and source textures are borrowed, never cloned
// or disposed here. In particular, rendering must not change the source
// camera's coordinate system or replace the source scene's GLSL materials.
export function createVillageGpuMirror(materials) {
  const objects = new Map(), ownedGeometry = new Set();
  const scene = new GPU.Scene(), camera = new GPU.PerspectiveCamera();
  let mirrorCount = 0;
  function create(source) {
    let object, descriptor = materials.convertObject?.(source);
    if (descriptor) {
      object = new GPU.Mesh(descriptor.geometry, descriptor.material);
      if (descriptor.kind === "instanced-quads") object = new GPU.Mesh(descriptor.geometry, descriptor.material);
      object.userData.presentationDescriptor = descriptor;
    } else if (source.isInstancedMesh) {
      object = new GPU.InstancedMesh(source.geometry, convert(source), source.instanceMatrix.count);
      object.instanceMatrix = source.instanceMatrix; object.instanceColor = source.instanceColor;
    } else if (source.isMesh) object = new GPU.Mesh(source.geometry, convert(source));
    else if (source.isSprite) object = new GPU.Sprite(materials.convert(source.material, source));
    else if (source.isPoints) throw new Error(`Unported village Points: ${source.name || source.uuid}`);
    else if (source.isLineLoop) {
      const geometry = source.geometry.clone(), position = geometry.getAttribute("position"), index = Array.from({ length: position.count }, (_, i) => i); index.push(0);
      geometry.setIndex(index); ownedGeometry.add(geometry);
      object = new GPU.Line(geometry, materials.convert(source.material, source));
    } else if (source.isLineSegments) object = new GPU.LineSegments(source.geometry, materials.convert(source.material, source));
    else if (source.isLine) object = new GPU.Line(source.geometry, materials.convert(source.material, source));
    else if (source.isHemisphereLight) object = new GPU.HemisphereLight();
    else if (source.isDirectionalLight) object = new GPU.DirectionalLight();
    else if (source.isPointLight) object = new GPU.PointLight();
    else if (source.isAmbientLight) object = new GPU.AmbientLight();
    else if (source.isLight) throw new Error(`Unported village light: ${source.type}`);
    else object = new GPU.Group();
    object.matrixAutoUpdate = false; object.name = source.name; object.userData.sourceUuid = source.uuid;
    objects.set(source, object); mirrorCount++; return object;
  }
  function convert(source) { return Array.isArray(source.material) ? source.material.map(m => materials.convert(m, source)) : materials.convert(source.material, source); }
  function synchronize(source, parent, seen) {
    let object = objects.get(source) ?? create(source); seen.add(source);
    if (object.parent !== parent) parent.add(object);
    if (source.matrixAutoUpdate) source.updateMatrix(); object.matrix.copy(source.matrix);
    object.matrixWorldNeedsUpdate = true; object.visible = source.visible;
    object.layers.mask = source.layers.mask; object.frustumCulled = source.frustumCulled; object.renderOrder = source.renderOrder;
    object.castShadow = source.castShadow; object.receiveShadow = source.receiveShadow;
    if (source.isLight) {
      object.color.copy(source.color); object.intensity = source.intensity;
      if (source.isHemisphereLight) object.groundColor.copy(source.groundColor);
      if (source.isPointLight) { object.distance = source.distance; object.decay = source.decay; }
      if (source.shadow) {
        const a = object.shadow, b = source.shadow;
        a.mapSize.copy(b.mapSize); a.bias = b.bias; a.normalBias = b.normalBias; a.radius = b.radius;
        a.autoUpdate = b.autoUpdate; a.needsUpdate = a.needsUpdate || b.needsUpdate;
        for (const key of ["left", "right", "top", "bottom", "near", "far", "fov", "aspect"]) if (key in b.camera) a.camera[key] = b.camera[key];
        a.camera.updateProjectionMatrix();
      }
    }
    const descriptor = object.userData.presentationDescriptor;
    if (descriptor) descriptor.sync?.(object);
    else if (source.isMesh || source.isSprite || source.isLine) {
      if (!source.isLineLoop) object.geometry = source.geometry;
      object.material = convert(source);
      if (source.isInstancedMesh) {
        object.count = source.count; object.instanceMatrix = source.instanceMatrix; object.instanceColor = source.instanceColor;
        object.boundingBox = source.boundingBox; object.boundingSphere = source.boundingSphere;
      }
      if (source.isSprite) object.center.copy(source.center);
    }
    for (const child of source.children) synchronize(child, object, seen);
    return object;
  }
  return {
    scene, camera,
    sync(source, sourceCamera) {
      source.updateMatrixWorld(); sourceCamera.updateMatrixWorld();
      scene.background = source.background; scene.environment = source.environment;
      scene.fog = source.fog?.clone() ?? null;
      const seen = new Set(); for (const child of source.children) synchronize(child, scene, seen);
      for (const [original, object] of objects) if (!seen.has(original)) {
        object.removeFromParent(); objects.delete(original); mirrorCount--;
        // Selection outlines are rebuilt repeatedly. Their closed-loop GPU
        // geometry is owned here and must retire with the removed outline,
        // rather than accumulating until the entire renderer is disposed.
        if (ownedGeometry.delete(object.geometry)) object.geometry.dispose();
      }
      for (const [original, object] of objects) if (original.isDirectionalLight) {
        const target = objects.get(original.target);
        if (target) object.target = target;
        else { original.target.getWorldPosition(object.target.position); if (!object.target.parent) scene.add(object.target); }
      }
      camera.position.copy(sourceCamera.position); camera.quaternion.copy(sourceCamera.quaternion); camera.scale.copy(sourceCamera.scale);
      for (const key of ["fov", "aspect", "near", "far", "zoom", "filmGauge", "filmOffset"]) camera[key] = sourceCamera[key];
      camera.view = sourceCamera.view ? { ...sourceCamera.view } : null; camera.layers.mask = sourceCamera.layers.mask;
      camera.coordinateSystem = GPU.WebGPUCoordinateSystem; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      materials.sync(); scene.updateMatrixWorld();
    },
    afterRender() { for (const [source] of objects) if (source.isLight && source.shadow) source.shadow.needsUpdate = false; },
    stats() { return { mirroredObjects: mirrorCount, ownedLineGeometries: ownedGeometry.size }; },
    dispose() { ownedGeometry.forEach(g => g.dispose()); ownedGeometry.clear(); scene.clear(); objects.clear(); mirrorCount = 0; },
  };
}
