// Desk clutter for the passed-out look: a row of energy-drink cans in front of the screen, whiskey and vodka
// bottles (one knocked over and leaking), an overflowing ashtray with a cigarette still burning, a crumpled pack.
// Generic look-alikes only, no real brand logos.
import * as THREE from 'three';

function label(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// black can with three neon-green claw scratches
const canTexture = () => label(512, 256, (g, w, h) => {
  g.fillStyle = '#0b0d0b';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#7dff2e';
  g.lineCap = g.lineJoin = 'round';
  for (const cx of [60, 316]) { // twice around the can
    for (let k = 0; k < 3; k++) {
      g.lineWidth = 14 - k * 2;
      g.beginPath();
      let x = cx + k * 34, y = 40;
      g.moveTo(x, y);
      while (y < h - 40) { y += 22; x += (Math.random() - 0.5) * 16; g.lineTo(x, y); }
      g.stroke();
    }
  }
  g.fillStyle = '#7dff2e';
  g.font = 'bold 30px system-ui';
  g.fillText('ENERGY', 200, h - 24);
});

const bottleLabel = (bg, fg, text, sub) => label(512, 256, (g, w, h) => {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = fg;
  g.lineWidth = 6;
  g.strokeRect(14, 14, w / 2 - 28, h - 28);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.font = 'bold 64px Georgia, serif';
  g.fillText(text, w / 4, h / 2 + 10);
  g.font = '28px Georgia, serif';
  g.fillText(sub, w / 4, h / 2 + 56);
});

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...extra });
const glass = (color, extra = {}) => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.08, metalness: 0, clearcoat: 1, emissive: color, emissiveIntensity: 0.12,
  transparent: true, opacity: 0.6, ...extra,
});

function shadowed(m) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function can(tex, metal) {
  const g = new THREE.Group();
  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.24, 28, 1, true),
    std(0xffffff, { map: tex, metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide })));
  body.position.y = 0.12;
  g.add(body);
  for (const [y, r] of [[0.245, 0.062], [0.005, 0.064]]) {
    const cap = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, 0.07, 0.012, 28), metal));
    cap.position.y = y;
    g.add(cap);
  }
  return g;
}

// round bottle turned from a profile: [radius, height] pairs from the base up
function lathe(profile, material) {
  return shadowed(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32), material));
}

function whiskey(fill) {
  const g = new THREE.Group();
  const w = 0.2, h = 0.34;
  const bottle = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, w), glass(0xd9a066)));
  bottle.position.y = h / 2;
  g.add(bottle);
  if (fill > 0) {
    const liquid = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h * fill, w - 0.02),
      std(0xa0520f, { roughness: 0.1, transparent: true, opacity: 0.85 }));
    liquid.position.y = 0.01 + (h * fill) / 2;
    g.add(liquid);
  }
  const tex = bottleLabel('#141414', '#f2efe6', 'WHISKEY', 'Old No. 60');
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, 0.16), std(0xffffff, { map: tex, roughness: 0.8 }));
  tex.repeat.set(0.5, 1);
  lbl.position.set(0, h * 0.45, w / 2 + 0.002);
  g.add(lbl);
  g.add(lathe([[0.07, h - 0.01], [0.04, h + 0.05], [0.035, h + 0.14]], glass(0xd9a066)));
  const cap = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), std(0x111111)));
  cap.position.y = h + 0.16;
  g.add(cap);
  return g;
}

function vodka(fill) {
  const g = new THREE.Group();
  const profile = [[0.001, 0], [0.09, 0], [0.095, 0.02], [0.095, 0.36], [0.07, 0.43], [0.035, 0.5], [0.033, 0.6]];
  g.add(lathe(profile, glass(0xdff0ff, { opacity: 0.45 })));
  if (fill > 0) g.add(lathe([[0.001, 0.01], [0.088, 0.01], [0.088, 0.01 + 0.34 * fill], [0.001, 0.01 + 0.34 * fill]],
    glass(0xbfe0ff, { opacity: 0.5 })));
  const tex = bottleLabel('#f4f7fb', '#1d3f8c', 'VODKA', 'triple distilled');
  tex.repeat.set(0.5, 1);
  const lbl = new THREE.Mesh(new THREE.CylinderGeometry(0.097, 0.097, 0.15, 32, 1, true, -0.9, 1.8),
    std(0xffffff, { map: tex, roughness: 0.7, side: THREE.DoubleSide }));
  lbl.position.y = 0.2;
  g.add(lbl);
  const cap = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 16), std(0xc8ccd4, { metalness: 0.8, roughness: 0.3 })));
  cap.position.y = 0.63;
  g.add(cap);
  return g;
}

function ashtray() {
  const g = new THREE.Group();
  g.add(lathe([[0.001, 0], [0.16, 0], [0.18, 0.05], [0.15, 0.06], [0.13, 0.02], [0.001, 0.02]],
    std(0x3a3f4a, { roughness: 0.2, metalness: 0.2, flatShading: true })));
  const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.012, 20), std(0x8c8a86, { roughness: 1 }));
  ash.position.y = 0.028;
  g.add(ash);
  const paper = std(0xf2eee6), filter = std(0xd98c3a);
  for (let i = 0; i < 7; i++) {
    const butt = new THREE.Group();
    const a = i * 2.2, r = 0.05 + 0.05 * ((i * 37) % 10) / 10;
    butt.position.set(Math.cos(a) * r, 0.045, Math.sin(a) * r);
    butt.rotation.set(0.15 * (i % 3), a, 0.35 + 0.1 * (i % 2));
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10), filter);
    f.rotation.z = Math.PI / 2;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 10), paper);
    p.rotation.z = Math.PI / 2;
    p.position.x = 0.04;
    butt.add(f, p);
    g.add(butt);
  }
  return g;
}

function smokeSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(240,240,245,1)');
  grad.addColorStop(0.45, 'rgba(220,222,230,0.6)');
  grad.addColorStop(1, 'rgba(200,200,210,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// a cigarette left burning on the ashtray rim; returns its ember tip so smoke can rise from it
function cigarette() {
  const g = new THREE.Group();
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.055, 12), std(0xd98c3a, { roughness: 0.8 }));
  f.rotation.z = Math.PI / 2;
  f.position.x = 0.028;
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 12), std(0xf4f1ea, { roughness: 0.9 }));
  p.rotation.z = Math.PI / 2;
  p.position.x = 0.105;
  const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.015, 0.05, 12), std(0x77736e, { roughness: 1 }));
  ash.rotation.z = Math.PI / 2;
  ash.position.x = 0.18;
  const emberMat = new THREE.MeshStandardMaterial({ color: 0x3a2a22, emissive: 0xff5a10, emissiveIntensity: 2, roughness: 1 });
  const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.012, 12), emberMat);
  ember.rotation.z = Math.PI / 2;
  ember.position.x = 0.15;
  const tip = new THREE.Object3D();
  tip.position.x = 0.2;
  g.add(f, p, ash, ember, tip);
  return { g, tip, emberMat };
}

const SMOKE = 70;

// a thin wisp curling up from the ember, in world space so it rises straight up
function smokeWisp(scene, tip) {
  const tex = smokeSprite();
  const puffs = Array.from({ length: SMOKE }, () => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xb8bcc6, transparent: true, depthWrite: false, opacity: 0 }));
    sp.visible = false;
    scene.add(sp);
    return { sp, age: 1, life: 1, vel: new THREE.Vector3(), size: 0.1 };
  });
  let next = 0, acc = 0;
  const from = new THREE.Vector3();
  return (dt, t) => {
    if (dt <= 0) return;
    tip.getWorldPosition(from);
    acc += dt * 12;
    while (acc >= 1) {
      acc -= 1;
      const p = puffs[next];
      next = (next + 1) % SMOKE;
      const j = () => (Math.random() - 0.5) * 0.04;
      p.sp.position.copy(from);
      p.vel.set(j(), 0.28, j());
      Object.assign(p, { age: 0, life: 3.2, size: 0.07 + Math.random() * 0.03 });
      p.sp.visible = true;
    }
    for (const p of puffs) {
      if (!p.sp.visible) continue;
      p.age += dt;
      const a = p.age / p.life;
      if (a >= 1) { p.sp.visible = false; continue; }
      // lazy S-curl as it rises
      p.vel.multiplyScalar(1 - dt * 0.4).add(new THREE.Vector3(0.09 * Math.sin(t * 1.3 + p.sp.position.y * 3), 0.05, 0.06 * Math.cos(t * 0.9 + p.sp.position.y * 2)).multiplyScalar(dt));
      p.sp.position.addScaledVector(p.vel, dt);
      p.sp.scale.setScalar(p.size * (1 + 4 * a));
      p.sp.material.opacity = 0.45 * Math.min(1, a * 6) * (1 - a) ** 1.4;
    }
  };
}

function cigPack() {
  const tex = label(256, 256, (g, w, h) => {
    g.fillStyle = '#f2f0ea';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b3161b';
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h * 0.35); g.lineTo(w / 2, h * 0.55); g.lineTo(0, h * 0.35);
    g.fill();
    g.fillStyle = '#111';
    g.textAlign = 'center';
    g.font = 'bold 40px Georgia, serif';
    g.fillText('SMOKES', w / 2, h * 0.8);
  });
  const g = new THREE.Group();
  const box = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.16), [
    std(0xf2f0ea), std(0xf2f0ea), std(0xffffff, { map: tex }), std(0xf2f0ea), std(0xf2f0ea), std(0xf2f0ea),
  ]));
  box.position.y = 0.015;
  box.rotation.z = 0.04; // a little crumpled
  g.add(box);
  return g;
}

// a flat glossy puddle where a bottle has leaked
function spill(color, sx, sz) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24),
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55 }));
  m.rotation.x = -Math.PI / 2;
  m.scale.set(sx, sz, 1);
  m.position.y = 0.002;
  m.receiveShadow = true;
  return m;
}

// Layout in desk coordinates: x runs from the fly (small x) toward the screen (large x), z is left(-)/right(+)
// as seen from behind the fly.
export function buildClutter(scene, deskTop) {
  const root = new THREE.Group();
  root.position.y = deskTop;
  scene.add(root);
  const tex = canTexture();
  const metal = std(0xb8bec8, { metalness: 0.9, roughness: 0.25 });
  const SIZE = 1.5; // bigger than life so it reads next to a fly this size
  const place = (obj, x, z, ry = 0) => {
    const w = new THREE.Group();
    w.add(obj);
    w.position.set(x, 0, z);
    w.rotation.y = ry;
    w.scale.setScalar(SIZE);
    root.add(w);
    return w;
  };
  const lying = (obj, lift) => { obj.rotation.set(0, 0, Math.PI / 2); obj.position.y = lift; return obj; };

  // a row of cans lined up along the foot of the screen, like trophies
  for (let i = 0; i < 9; i++) place(can(tex, metal), 2.72, -1.95 + i * 0.235, i * 1.7);
  // second row, a few stacked
  for (let i = 0; i < 5; i++) place(can(tex, metal), 2.45, -1.85 + i * 0.235, i * 2.3);
  const top = can(tex, metal);
  top.position.y = 0.25;
  place(top, 2.45, -1.62, 0.4);

  // bottles on the right, beside the PC
  place(whiskey(0.25), 2.55, 1.2, -0.5);
  place(vodka(0), 2.75, 0.7, 0.3);
  place(vodka(0.15), 2.3, 1.55, 1.2);

  // around the fly's head: knocked-over whiskey leaking toward the edge, ashtray, empties
  place(lying(whiskey(0.1), 0.1), 1.55, 1.05, 2.4);
  const puddle = spill(0x8a4a10, 2.2, 1.4);
  puddle.position.set(1.2, 0.002, 1.25);
  root.add(puddle);
  const tray = ashtray();
  place(tray, 1.55, -0.75);
  const cig = cigarette(); // resting on the rim, burning end over the ash
  cig.g.position.set(0.12, 0.06, 0);
  cig.g.rotation.set(0, 0.5, 0.12);
  tray.add(cig.g);
  place(cigPack(), 1.9, -1.3, 0.6);
  place(lying(can(tex, metal), 0.07), 2.0, 0.55, 0.9);
  place(lying(can(tex, metal), 0.07), 1.05, -1.45, -0.3);
  const crushed = can(tex, metal);
  crushed.scale.set(1.15, 0.5, 0.8);
  crushed.rotation.z = 0.25;
  place(crushed, 1.25, 1.75, 0.6);
  const crushed2 = crushed.clone();
  place(crushed2, 2.05, -0.55, 2);

  return { root, update: smokeWisp(scene, cig.tip), ember: cig.emberMat };
}
