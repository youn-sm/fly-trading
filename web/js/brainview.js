// Corner view of the real fly brain: 40k neurons as a dim cloud, with the sugar path (gold),
// bitter path (green) and MN9 (pink) lighting up as strongly as the simulation fired that day.
import * as THREE from 'three';

const SCALE = 1 / 330; // µm → scene units

function glowSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function cloud(points, color, size, opacity, sprite) {
  const pos = new Float32Array(points.length * 3);
  points.forEach(([x, y, z], i) => pos.set([x * SCALE, -y * SCALE, z * SCALE], i * 3)); // FlyWire y points down
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const colors = new Float32Array(points.length * 3).fill(1);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    color, size, map: sprite, transparent: true, opacity, vertexColors: true,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

export class BrainView {
  constructor(canvas, brain) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.camera.position.set(0, 0.12, 2.75);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    const sprite = glowSprite();
    this.bg = cloud(brain.background, 0x4a8cff, 0.03, 0.3, sprite);
    this.sugar = cloud(brain.sugar, 0xffc440, 0.24, 1, sprite);
    this.bitter = cloud(brain.bitter, 0x78ff78, 0.24, 1, sprite);
    this.mn9 = cloud(brain.mn9, 0xff46a0, 0.5, 1, sprite);
    this.root.add(this.bg, this.sugar, this.bitter, this.mn9);
    this.sugarMs = brain.sugar_ms;
    this.bitterPhase = brain.bitter.map((_, i) => (i * 2.39) % (2 * Math.PI));
    this.wave = 0; // ms of simulated time since today's taste arrived
    this.lastDay = -1;
    this.resize();
  }

  resize() {
    const c = this.renderer.domElement;
    this.renderer.setSize(c.clientWidth, c.clientHeight, false);
    this.camera.aspect = c.clientWidth / c.clientHeight;
    this.camera.updateProjectionMatrix();
  }

  // today: {sugar_hz, bitter_hz, mn9_hz}; event: true while a BUY/SELL is playing
  update(dt, t, dayIndex, today, event) {
    if (dayIndex !== this.lastDay) { this.wave = 0; this.lastDay = dayIndex; }
    this.wave += dt * (event ? 60 : 300); // replay the spike wave slowly during trades
    this.root.rotation.y = 0.45 * Math.sin(t * 0.25);

    const sweet = Math.min(today.sugar_hz / 200, 1), bitter = Math.min(today.bitter_hz / 200, 1);
    const mn9 = Math.min(today.mn9_hz / 100, 1.2);
    const sc = this.sugar.geometry.attributes.color;
    this.sugarMs.forEach((ms, i) => {
      const since = this.wave - ms;
      const v = since < 0 ? 0 : sweet * (0.55 + 0.45 * Math.exp(-since / 8)) * (0.8 + 0.2 * Math.sin(t * 20 + i));
      sc.setXYZ(i, v, v, v);
    });
    sc.needsUpdate = true;
    const bc = this.bitter.geometry.attributes.color;
    this.bitterPhase.forEach((ph, i) => {
      const v = bitter * bitter * (0.6 + 0.4 * Math.sin(t * 14 + ph)); // squared: weak bitter stays faint
      bc.setXYZ(i, v, v, v);
    });
    bc.needsUpdate = true;
    const pulse = mn9 * (0.75 + 0.25 * Math.sin(t * 25)) * (this.wave > 25 ? 1 : 0);
    this.mn9.material.size = 0.3 + 0.9 * pulse;
    this.mn9.material.opacity = Math.min(1, pulse * 1.3);
    this.renderer.render(this.scene, this.camera);
  }
}
