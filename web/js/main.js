import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Fly } from './fly.js';
import { buildRoom, FLY_POS } from './scene.js';
import { Monitor } from './monitor.js';
import { BrainView } from './brainview.js';
import { buildSegments, stateAt, ENDING_SEC, LOSS_ENDING_SEC } from './timeline.js';

const [timeline, brain] = await Promise.all(['data/timeline.json', 'data/brain.json'].map((f) => fetch(f).then((r) => r.json())));
const { days, summary, ticker, params } = timeline;
const lost = summary.fly_return < 0;
const schedule = buildSegments(days, lost ? LOSS_ENDING_SEC : ENDING_SEC);

// 3D scene
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0.3, 3.4, 7.3);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(1.2, 2.15, 0);
controls.enableDamping = true;

const monitor = new Monitor(days, ticker, summary, schedule.segs.at(-1).dur);
document.getElementById('account').classList.toggle('win', !lost);
const room = buildRoom(scene, monitor.canvas);
const fly = new Fly();
fly.group.position.copy(FLY_POS);
fly.keyboard.copy(room.keyboard);
fly.seatY = room.seatY;
scene.add(fly.group);

const brainView = new BrainView(document.getElementById('brain-canvas'), brain);
document.getElementById('brain-sub').textContent =
  `${brain.n_neurons.toLocaleString()} neurons · ${(brain.n_synapses / 1e6).toFixed(1)}M synapses · FlyWire`;

function resize() {
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
  brainView.resize();
}
addEventListener('resize', resize);
resize();

// HUD
const $ = (id) => document.getElementById(id);
const pct = (x) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;
const setPct = (el, x) => { el.textContent = pct(x); el.classList.toggle('up', x >= 0); el.classList.toggle('down', x < 0); };
const meters = ['sugar', 'bitter', 'mn9'].map((k) => document.querySelector(`.meter.${k}`));
let shownDay = -1;

function updateHud(s) {
  const today = days[s.dayIndex];
  [[today.sugar_hz, 200], [today.bitter_hz, 200], [today.mn9_hz, 120]].forEach(([hz, full], i) => {
    meters[i].querySelector('b').style.width = `${Math.min(hz / full, 1) * 100}%`;
    meters[i].querySelector('em').textContent = `${hz.toFixed(0)}Hz`;
  });
  const eat = today.mn9_hz >= params.mn9_threshold_hz;
  $('decision').innerHTML = s.kind === 'event'
    ? `<span class="${s.action === 'BUY' ? 'up' : 'down'}">MN9 ${today.mn9_hz.toFixed(0)}Hz → ${s.action === 'BUY' ? 'yum, BUY!' : 'yuck! SELL'}</span>`
    : `MN9 ${eat ? 'firing → eating (holding)' : 'quiet → not eating (cash)'}`;
  if (s.dayIndex === shownDay) return;
  shownDay = s.dayIndex;
  setPct($('fly-return'), today.equity / summary.start_cash - 1);
  $('equity').textContent = `$${today.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  setPct($('hold-return'), today.close / days[0].close - 1);
  $('day-label').textContent = `Day ${s.dayIndex + 1} / ${days.length} · ${today.date.slice(5)}`;
  const trades = days.slice(0, s.dayIndex + 1).filter((d) => d.action === 'BUY' || d.action === 'SELL');
  $('trades').textContent = `${trades.length} trade${trades.length === 1 ? '' : 's'}`;
  $('log').innerHTML = trades.slice(-3).reverse()
    .map((d) => `<li><span>${d.date.slice(5)}</span><b class="${d.action.toLowerCase()}">${d.action}</b><span>$${d.close.toFixed(2)}</span></li>`).join('');
}

// playback
const url = new URLSearchParams(location.search);
const speed = Number(url.get('speed') ?? 1);
let t = Number(url.get('t') ?? 0), paused = false;
addEventListener('keydown', (e) => {
  if (e.code === 'Space') paused = !paused;
  if (e.key === 'r') t = 0;
});

const MOTION_END = 0.7; // fraction of an event spent on the motion before settling back

// loss ending, in seconds since the last candle: read the result → jolt → clutch the head and sob → reset for the loop
function endingMode(sec) {
  if (sec < 0.4) return 'idle';
  if (sec < 1.9) return 'check';
  if (sec < 2.7) return 'shock';
  if (sec < LOSS_ENDING_SEC - 0.5) return 'despair';
  return 'idle';
}

// slow push-in on the fly during the loss ending; applied as an offset so mouse orbiting/panning still works
const baseZoom = camera.zoom;
const PUSH_TARGET = new THREE.Vector3(-0.55, 0.15, 0);
const pushOffset = new THREE.Vector3();
function cameraPush(s) {
  const sec = s.kind === 'ending' ? s.p * LOSS_ENDING_SEC : 0;
  const k = lost ? THREE.MathUtils.smoothstep(sec, 1.5, 4.5) * (1 - THREE.MathUtils.smoothstep(sec, LOSS_ENDING_SEC - 0.7, LOSS_ENDING_SEC)) : 0;
  controls.target.sub(pushOffset);
  pushOffset.copy(PUSH_TARGET).multiplyScalar(k);
  controls.target.add(pushOffset);
  camera.zoom = baseZoom * (1 + 0.45 * k);
  camera.updateProjectionMatrix();
}
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!paused) t += dt * speed;
  const s = stateAt(schedule, t);
  const acting = s.kind === 'event' && s.p < MOTION_END;

  let mode = 'idle';
  if (acting) mode = s.action === 'BUY' ? 'buy' : 'sell';
  if (s.kind === 'ending' && lost) mode = endingMode(s.p * LOSS_ENDING_SEC);
  $('account').classList.toggle('final', s.kind === 'ending' && s.p * (lost ? LOSS_ENDING_SEC : ENDING_SEC) > 0.4);
  fly.setMode(mode);

  room.drop.visible = acting;
  if (acting) {
    const buy = s.action === 'BUY';
    room.dropMat.color.set(buy ? 0x40ff90 : 0xb050ff);
    room.dropMat.emissive.set(buy ? 0x20c060 : 0x7020c0);
    room.dropLight.color.copy(room.dropMat.color);
    room.dropLight.intensity = 0.35;
    const q = s.p / MOTION_END;
    room.drop.scale.setScalar(buy ? 1 - THREE.MathUtils.smoothstep(q, 0.3, 0.95) * 0.95 : 1 - THREE.MathUtils.smoothstep(q, 0.8, 1));
  }

  monitor.draw(s);
  room.texture.needsUpdate = true;
  fly.update(paused ? 0 : dt);
  brainView.update(paused ? 0 : dt, t, s.dayIndex, days[s.dayIndex], s.kind === 'event');
  updateHud(s);
  cameraPush(s);
  controls.update();
  renderer.render(scene, camera);
});

window.__debug = { camera, controls, fly, schedule, setT: (x) => { t = x; } }; // inspection only
