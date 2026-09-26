// Desk clutter for the degenerate-trader look: a pile of energy-drink cans, whiskey and vodka bottles,
// and an overflowing ashtray. Generic look-alikes only, no real brand logos.
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

  // back of the desk, behind the keyboard: can pyramid flanked by bottles
  const pile = new THREE.Group();
  const H = 0.25, D = 0.145;
  [[3, 0], [2, 1], [1, 2]].forEach(([n, row]) => {
    for (let i = 0; i < n; i++) {
      const c = can(tex, metal);
      c.position.set((i - (n - 1) / 2) * D, row * H, 0);
      c.rotation.y = i * 1.3 + row;
      pile.add(c);
    }
  });
  place(pile, 1.95, -1.05, 0.2);
  place(whiskey(0.6), 1.2, -0.9, -0.3);
  place(vodka(0), 1.45, -1.45, 1);
  place(whiskey(0.35), 2.45, -1.5, 0.5);
  place(vodka(0.2), 2.75, -1.1);

  // front of the desk: empties and the ashtray, kept low so the hands and the chart stay visible
  place(lying(whiskey(0), 0.1), 1.7, 1.45, 0.3);
  place(lying(can(tex, metal), 0.07), 2.35, 1.2, 0.9);
  place(lying(can(tex, metal), 0.07), 1.0, 1.55, -0.3);
  const crushed = can(tex, metal);
  crushed.scale.set(1.15, 0.5, 0.8);
  crushed.rotation.z = 0.25;
  place(crushed, 2.6, 1.6, 0.6);
  place(ashtray(), 1.1, 1.15);
  return root;
}
