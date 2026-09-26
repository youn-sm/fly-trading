import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { Fly } from './fly.js';
import { buildRoom, FLY_POS, SCREEN } from './scene.js';
import { youtubeScreen } from './tv.js';

const VIDEO_ID = '6-8E4Nirh9s'; // Caramella Girls - Caramelldansen

// WebGL on top (transparent where the TV screen is), the YouTube player underneath
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.appendChild(renderer.domElement);
const css = new CSS3DRenderer();
document.getElementById('video').appendChild(css.domElement);

const scene = new THREE.Scene();
const cssScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

// over the fly's shoulder, looking past it at the TV
const HOME = { pos: new THREE.Vector3(-3.9, 4.2, -2.3), target: new THREE.Vector3(2.1, 2.25, -0.05) };
camera.position.copy(HOME.pos);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;

const room = buildRoom(scene);
const fly = new Fly();
fly.group.position.copy(FLY_POS);
fly.deskY = room.deskY;
fly.seatY = room.seatY;
scene.add(fly.group);

const tv = youtubeScreen(room.screen, SCREEN, VIDEO_ID);
cssScene.add(tv.object);
const unmute = () => tv.unmute();
addEventListener('pointerdown', unmute);
addEventListener('keydown', unmute);

// keep the same horizontal field of view in a tall (phone-shaped) window
const H_FOV = 50;
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  css.setSize(w, h);
  camera.aspect = w / h;
  const vFromH = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(H_FOV / 2)) / camera.aspect));
  camera.fov = Math.max(40, vFromH);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

let paused = false;
addEventListener('keydown', (e) => {
  if (e.code === 'Space') paused = !paused;
  if (e.key === 'r') { camera.position.copy(HOME.pos); controls.target.copy(HOME.target); }
});

let t = 0;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = paused ? 0 : Math.min(clock.getDelta(), 0.05);
  if (paused) clock.getDelta();
  t += dt;
  fly.update(dt);
  room.clutter.update(dt, t);
  room.club.update(t, room.lights);
  controls.update();
  renderer.render(scene, camera);
  css.render(cssScene, camera);
});

window.__debug = { camera, controls, fly, scene }; // inspection only
