// The last touch on a finished frame, for places that ask for it (the village): a little more colour and
// contrast, shadows leaning to indigo and lights to peach, and the corners drawn down so the eye rests on the
// middle. It works on the picture as displayed, after tone mapping, and costs one pass.
import * as THREE from "three";

export const VILLAGE_GRADE = Object.freeze({ saturation: 1.1, contrast: 1.07, vignette: .26, shadows: [-.012, -.004, .026], lights: [.022, .008, -.016] });

export const GradeShader = {
  name: "GradeShader",
  uniforms: { tDiffuse: { value: null }, saturation: { value: 1 }, contrast: { value: 1 }, vignette: { value: 0 }, shadows: { value: new THREE.Vector3() }, lights: { value: new THREE.Vector3() } },
  vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float saturation, contrast, vignette; uniform vec3 shadows, lights; varying vec2 vUv;
    void main() { vec4 c = texture2D(tDiffuse, vUv); vec3 rgb = c.rgb; float l = dot(rgb, vec3(.2126, .7152, .0722));
      rgb = mix(vec3(l), rgb, saturation); rgb = (rgb - .5) * contrast + .5;
      rgb += shadows * (1. - smoothstep(0., .5, l)) + lights * smoothstep(.5, 1., l);
      vec2 p = (vUv - .5) * vec2(1., .92); rgb *= 1. - vignette * smoothstep(.34, .86, length(p));
      gl_FragColor = vec4(clamp(rgb, 0., 1.), c.a); }`,
};

// Set a grade pass from a place's settings, or switch it off for a place with none.
export function applyGrade(pass, grade) {
  pass.enabled = !!grade; if (!grade) return;
  const u = pass.uniforms; u.saturation.value = grade.saturation ?? 1; u.contrast.value = grade.contrast ?? 1; u.vignette.value = grade.vignette ?? 0;
  u.shadows.value.fromArray(grade.shadows ?? [0, 0, 0]); u.lights.value.fromArray(grade.lights ?? [0, 0, 0]);
}
