import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Fly } from './fly.js';
import { buildRoom, FLY_POS } from './scene.js';

const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(-0.6, 3.5, 8.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(1.15, 1.85, 0);
controls.enableDamping = true;

// placeholder screen until the trading monitor is wired up
const screenCanvas = document.createElement('canvas');
screenCanvas.width = 1024; screenCanvas.height = 590;
const sg = screenCanvas.getContext('2d');
sg.fillStyle = '#0c1020'; sg.fillRect(0, 0, 1024, 590);
sg.strokeStyle = '#28dc78'; sg.lineWidth = 6; sg.beginPath();
for (let i = 0; i < 40; i++) sg.lineTo(60 + i * 23, 420 - i * 7 + Math.sin(i * 1.3) * 40);
sg.stroke();
sg.fillStyle = '#fff'; sg.font = 'bold 56px system-ui'; sg.fillText('NVDA  $224.58', 60, 90);

const room = buildRoom(scene, screenCanvas);
const fly = new Fly();
fly.group.position.copy(FLY_POS);
fly.keyboard.copy(room.keyboard);
fly.seatY = room.seatY;
scene.add(fly.group);

function resize() {
  const { clientWidth: w, clientHeight: h } = stage;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// demo loop: idle → buy → idle → sell
const CYCLE = [['idle', 3], ['buy', 3], ['idle', 3], ['sell', 3]];
const params = new URLSearchParams(location.search);
let clock = new THREE.Clock(), elapsed = 0;
function modeAt(t) {
  const total = CYCLE.reduce((s, [, d]) => s + d, 0);
  let x = t % total;
  for (const [m, d] of CYCLE) { if (x < d) return [m, x / d]; x -= d; }
}

window.__debug = { camera, controls, fly, scene }; // inspection only

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  const [mode, p] = params.get('mode') ? [params.get('mode'), 0.5] : modeAt(elapsed);
  fly.setMode(mode);
  const tasting = mode === 'buy' || mode === 'sell';
  room.drop.visible = tasting;
  room.dropMat.color.set(mode === 'sell' ? 0xb050ff : 0x40ff90);
  room.dropMat.emissive.set(mode === 'sell' ? 0x7020c0 : 0x20c060);
  room.dropLight.color.copy(room.dropMat.color);
  room.dropLight.intensity = tasting ? 0.35 : 0;
  room.drop.scale.setScalar(mode === 'buy' ? Math.max(0.05, 1 - p) : 1);
  fly.update(dt);
  controls.update();
  renderer.render(scene, camera);
});
