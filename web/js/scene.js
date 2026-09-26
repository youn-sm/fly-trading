// The office: grid floor, low-poly desk, stool, keyboard, monitor, and the taste droplet.
import * as THREE from 'three';
import { buildClutter } from './props.js';

export const FLY_POS = new THREE.Vector3(0, 2.0, 0);
const DESK_TOP = 1.65;
const KEYBOARD = new THREE.Vector3(1.35, DESK_TOP + 0.07, 0);
const SEAT_TOP = 1.02;

const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true, ...extra });

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildRoom(scene, screenCanvas) {
  scene.background = new THREE.Color(0x06070d);
  scene.fog = new THREE.Fog(0x06070d, 14, 34);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x0b0c16, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(80, 80, 0x7a4fe0, 0x2c2558);
  grid.position.y = 0.002;
  grid.material.transparent = true;
  grid.material.opacity = 0.7;
  scene.add(grid);

  // desk
  const deskMat = flat(0xa7c7ec);
  const desk = new THREE.Group();
  desk.add(box(2.9, 0.1, 3.6, deskMat, 2.25, DESK_TOP - 0.05, 0));
  for (const [x, z] of [[0.95, 1.65], [0.95, -1.65], [3.55, 1.65], [3.55, -1.65]]) {
    desk.add(box(0.14, DESK_TOP - 0.1, 0.14, deskMat, x, (DESK_TOP - 0.1) / 2, z));
  }
  scene.add(desk);

  // stool
  const stoolMat = flat(0xd4dcea);
  const stool = new THREE.Group();
  stool.position.set(-0.75, 0, 0);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.12, 40), stoolMat);
  seat.position.y = SEAT_TOP - 0.06;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, SEAT_TOP - 0.1, 16), flat(0x8f99ad));
  post.position.y = (SEAT_TOP - 0.1) / 2;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.08, 32), stoolMat);
  base.position.y = 0.04;
  for (const m of [seat, post, base]) { m.castShadow = m.receiveShadow = true; stool.add(m); }
  scene.add(stool);

  // keyboard + mouse
  const kbMat = flat(0xe9eef6);
  scene.add(box(0.5, 0.07, 1.3, kbMat, KEYBOARD.x, DESK_TOP + 0.035, 0));
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.065, 0.025, 0.07), flat(0xc9d2e0), 5 * 15);
  const m4 = new THREE.Matrix4();
  let n = 0;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) {
    m4.makeTranslation(KEYBOARD.x - 0.18 + r * 0.09, DESK_TOP + 0.08, -0.58 + c * 0.083);
    keys.setMatrixAt(n++, m4);
  }
  keys.castShadow = true;
  scene.add(keys);
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12), kbMat);
  mouse.scale.set(1.3, 0.45, 0.8);
  mouse.position.set(KEYBOARD.x, DESK_TOP + 0.04, 0.95);
  mouse.castShadow = true;
  scene.add(mouse);

  // monitor, turned a little toward the camera
  const monitor = new THREE.Group();
  monitor.position.set(2.75, DESK_TOP, 0.05);
  monitor.rotation.y = 0.3;
  const dark = flat(0x2a3140);
  monitor.add(box(0.45, 0.04, 0.7, dark, 0, 0.02, 0));
  monitor.add(box(0.08, 0.5, 0.12, dark, 0.05, 0.27, 0));
  monitor.add(box(0.07, 1.34, 2.24, flat(0x9fb4cf), 0, 1.12, 0));
  const texture = new THREE.CanvasTexture(screenCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.12, 1.22), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  screen.rotation.y = -Math.PI / 2;
  screen.position.set(-0.04, 1.12, 0);
  monitor.add(screen);
  scene.add(monitor);

  buildClutter(scene, DESK_TOP);

  // the taste droplet on the desk in front of the keyboard
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x40ff90, emissive: 0x20c060, emissiveIntensity: 1.6, roughness: 0.05, transparent: true, opacity: 0.9 });
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), dropMat);
  drop.scale.set(1, 0.6, 1);
  drop.position.set(1.0, DESK_TOP + 0.05, 0);
  const dropLight = new THREE.PointLight(0x40ff90, 0, 2.5);
  drop.add(dropLight);
  scene.add(drop);

  // lights
  const hemi = new THREE.HemisphereLight(0xb8c6ff, 0x1a1420, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-3, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
  key.shadow.bias = -0.0005;
  scene.add(key);
  const glow = new THREE.PointLight(0x6fd0ff, 5, 5);
  glow.position.set(2.2, 2.7, 0.3);
  scene.add(glow);
  const rim = new THREE.DirectionalLight(0x9a6bff, 1.4);
  rim.position.set(-5, 3, -4);
  scene.add(rim);
  // cold spotlight straight down on the fly, only lit for the despair ending
  const spot = new THREE.SpotLight(0xa8c8ff, 0, 9, 0.32, 0.6, 1);
  spot.position.set(FLY_POS.x - 0.3, FLY_POS.y + 6, FLY_POS.z + 0.6);
  spot.target.position.copy(FLY_POS);
  scene.add(spot, spot.target);

  return {
    texture, drop, dropMat, dropLight,
    lights: { hemi, key, glow, rim, spot },
    // positions the fly needs, relative to the fly
    keyboard: KEYBOARD.clone().sub(FLY_POS),
    seatY: SEAT_TOP - FLY_POS.y,
  };
}
