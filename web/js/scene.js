// The room: grid floor, back wall, desk, stool, keyboard, a big TV, an RGB PC tower and the desk clutter.
import * as THREE from 'three';
import { buildClutter } from './props.js';
import { buildClub } from './club.js';

export const FLY_POS = new THREE.Vector3(0.55, 2.05, 0.3);
const DESK_TOP = 1.65;
const DESK = { x0: 0.55, x1: 3.95, z: 2.3 }; // near edge, far edge, half width
const SEAT_TOP = 1.02;
export const SCREEN = { w: 3.4, h: 3.4 * 9 / 16 };

const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true, ...extra });

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildRoom(scene) {
  scene.background = new THREE.Color(0x05060b);
  scene.fog = new THREE.Fog(0x05060b, 14, 34);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x0b0c16, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(80, 80, 0x7a4fe0, 0x2c2558);
  grid.position.y = 0.002;
  grid.material.transparent = true;
  grid.material.opacity = 0.7;
  scene.add(grid);

  // back wall behind the TV, so the club colors wash over something
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 9), new THREE.MeshStandardMaterial({ color: 0x3a3d4a, roughness: 0.95 }));
  wall.rotation.y = -Math.PI / 2;
  wall.position.set(DESK.x1 + 0.9, 4.5, 0);
  wall.receiveShadow = true;
  scene.add(wall);

  // desk
  const deskMat = flat(0x2b2f3a, { roughness: 0.55 });
  const desk = new THREE.Group();
  const cx = (DESK.x0 + DESK.x1) / 2;
  desk.add(box(DESK.x1 - DESK.x0, 0.1, DESK.z * 2, deskMat, cx, DESK_TOP - 0.05, 0));
  for (const x of [DESK.x0 + 0.15, DESK.x1 - 0.15]) for (const z of [DESK.z - 0.15, -DESK.z + 0.15]) {
    desk.add(box(0.12, DESK_TOP - 0.1, 0.12, deskMat, x, (DESK_TOP - 0.1) / 2, z));
  }
  scene.add(desk);

  // stool, pulled in under the fly's abdomen
  const stoolMat = flat(0x3b4050);
  const stool = new THREE.Group();
  stool.position.set(FLY_POS.x - 0.75, 0, FLY_POS.z);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.12, 40), stoolMat);
  seat.position.y = SEAT_TOP - 0.06;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, SEAT_TOP - 0.1, 16), flat(0x8f99ad));
  post.position.y = (SEAT_TOP - 0.1) / 2;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.08, 32), stoolMat);
  base.position.y = 0.04;
  for (const m of [seat, post, base]) { m.castShadow = m.receiveShadow = true; stool.add(m); }
  scene.add(stool);

  // keyboard shoved aside by the fly's head, mouse beside it
  const kbMat = flat(0x1a1d24);
  const kb = new THREE.Group();
  kb.position.set(2.05, DESK_TOP, -0.1);
  kb.rotation.y = 0.18;
  kb.add(box(0.5, 0.07, 1.3, kbMat, 0, 0.035, 0));
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.065, 0.025, 0.07), flat(0x2c313b), 5 * 15);
  const m4 = new THREE.Matrix4();
  let n = 0;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) {
    m4.makeTranslation(-0.18 + r * 0.09, 0.08, -0.58 + c * 0.083);
    keys.setMatrixAt(n++, m4);
  }
  keys.castShadow = true;
  kb.add(keys);
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12), kbMat);
  mouse.scale.set(1.3, 0.45, 0.8);
  mouse.position.set(0.1, 0.04, 0.95);
  mouse.castShadow = true;
  kb.add(mouse);
  scene.add(kb);

  // big TV facing the fly; the screen itself is a see-through hole that the YouTube player shows through
  const tv = new THREE.Group();
  tv.position.set(3.45, DESK_TOP, -0.35);
  const dark = flat(0x14161c, { roughness: 0.4 });
  tv.add(box(0.5, 0.04, 1.0, dark, 0, 0.02, 0));
  tv.add(box(0.1, 0.4, 0.16, dark, 0.05, 0.2, 0));
  const screenY = 0.35 + SCREEN.h / 2;
  tv.add(box(0.08, SCREEN.h + 0.1, SCREEN.w + 0.1, dark, 0.04, screenY, 0));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
    new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, blending: THREE.NoBlending, fog: false, toneMapped: false }));
  screen.rotation.y = -Math.PI / 2;
  screen.position.set(-0.002, screenY, 0);
  tv.add(screen);
  scene.add(tv);

  // PC tower with a glass side and three RGB fan rings, to the right of the TV
  const pc = new THREE.Group();
  pc.position.set(3.2, DESK_TOP, 1.75);
  pc.add(box(1.1, 1.45, 0.55, flat(0x101217, { roughness: 0.35 }), 0, 0.725, 0));
  const glassSide = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.35),
    new THREE.MeshPhysicalMaterial({ color: 0x223344, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.35 }));
  glassSide.rotation.y = -Math.PI / 2;
  glassSide.position.set(-0.556, 0.725, 0);
  pc.add(glassSide);
  const rgbMats = [];
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, toneMapped: false });
    rgbMats.push(mat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 8, 40), mat);
    ring.position.set(0.5, 0.3 + i * 0.42, -0.284);
    pc.add(ring);
    const side = ring.clone();
    side.rotation.y = Math.PI / 2;
    side.position.set(-0.54, 0.3 + i * 0.42, 0);
    pc.add(side);
  }
  const pcLight = new THREE.PointLight(0xff00ff, 2, 3, 1.5);
  pcLight.position.set(2.6, DESK_TOP + 0.8, 1.6);
  pc.userData.light = pcLight;
  scene.add(pc, pcLight);

  const clutter = buildClutter(scene, DESK_TOP);

  // lights: dim room, the TV is the main light on the fly
  const hemi = new THREE.HemisphereLight(0xb8c6ff, 0x1a1420, 0.45);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 0.6);
  key.position.set(-3, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
  key.shadow.bias = -0.0005;
  scene.add(key);
  const tvLight = new THREE.SpotLight(0xffffff, 0, 8, 0.75, 0.9, 1); // spill from the screen onto the fly and desk
  tvLight.position.set(3.3, DESK_TOP + screenY, -0.35);
  tvLight.target.position.set(FLY_POS.x, DESK_TOP, FLY_POS.z);
  scene.add(tvLight, tvLight.target);
  const tvGlow = new THREE.PointLight(0xffffff, 0, 6, 1.2);
  tvGlow.position.set(2.4, DESK_TOP + 1.2, -0.3);
  scene.add(tvGlow);

  return {
    screen, clutter,
    lights: { tvLight, tvGlow },
    club: buildClub(scene, {
      grid, flyPos: FLY_POS, deskTop: DESK_TOP, deskSpan: [DESK.x0, DESK.x1, DESK.z], stoolPos: stool.position,
      rgbMats, rgbLight: pcLight,
    }),
    // positions the fly needs, relative to the fly
    deskY: DESK_TOP - FLY_POS.y,
    seatY: SEAT_TOP - FLY_POS.y,
  };
}
