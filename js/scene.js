import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

export let scene;
export let camera;
export let renderer;

let sun;
let moonLight;
let ambient;
let sunVisual;
let moonVisual;

export function syncRendererSize() {
  if (!renderer || !camera) return;
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  if (renderer.domElement.width !== Math.floor(w * renderer.getPixelRatio()) || renderer.domElement.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

export function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd0ff);
  scene.fog = new THREE.Fog(0x8fd0ff, 40, 150);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  sun = new THREE.DirectionalLight(0xfff5cf, 1.1);
  sun.position.set(20, 35, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  moonLight = new THREE.DirectionalLight(0x8ba7ff, 0.2);
  moonLight.position.set(-20, -35, -8);
  scene.add(moonLight);

  ambient = new THREE.AmbientLight(0x86a9bf, 0.65);
  scene.add(ambient);

  sunVisual = new THREE.Mesh(
    new THREE.SphereGeometry(2.3, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe08a })
  );
  moonVisual = new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xdce6ff })
  );
  scene.add(sunVisual);
  scene.add(moonVisual);

  window.addEventListener("resize", syncRendererSize);

  return { scene, camera, renderer, sun, moonLight, ambient, sunVisual, moonVisual };
}
