// Procedural fruit fly. Faces +x, +y up. Every joint is a Group so it can be animated.
import * as THREE from 'three';

const COLOR = {
  amber: 0xd98a22, amberDeep: 0xb0621a, band: 0x5a2c0a,
  tarsus: 0x3a220c, eye: 0xd0121e, hair: 0x2b1707,
};
const SIT_PITCH = 0.9; // body pitch while sitting (rad), head up

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });

function mesh(geometry, material) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function ellipsoid(r, sx, sy, sz, material) {
  const m = mesh(new THREE.SphereGeometry(r, 40, 24), material);
  m.scale.set(sx, sy, sz);
  return m;
}

// tapered rod from the origin along +x
function rod(len, r0, r1, material, radial = 10) {
  const g = new THREE.CylinderGeometry(r1, r0, len, radial);
  g.rotateZ(-Math.PI / 2);
  g.translate(len / 2, 0, 0);
  return mesh(g, material);
}

function wingTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const g = c.getContext('2d');
  const outline = () => {
    g.beginPath();
    g.moveTo(8, 96);
    g.bezierCurveTo(110, 30, 380, 18, 498, 82);
    g.bezierCurveTo(512, 122, 380, 178, 130, 150);
    g.bezierCurveTo(60, 140, 22, 118, 8, 96);
    g.closePath();
  };
  outline();
  g.fillStyle = 'rgba(235,242,255,0.38)';
  g.fill();
  g.save();
  outline();
  g.clip();
  g.strokeStyle = 'rgba(70,50,30,0.85)';
  g.lineWidth = 2.5;
  for (const [y0, cx, cy, x1, y1] of [[92, 250, 50, 500, 84], [98, 260, 88, 505, 104], [104, 260, 120, 470, 136], [110, 230, 150, 360, 162], [96, 150, 70, 300, 44]]) {
    g.beginPath(); g.moveTo(10, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
  }
  g.lineWidth = 2;
  for (const [x0, y0, x1, y1] of [[190, 66, 200, 112], [300, 84, 310, 128]]) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.restore();
  outline();
  g.strokeStyle = 'rgba(60,40,25,0.9)';
  g.lineWidth = 3;
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// femur / tibia / tarsus chain solved with planar two-bone IK
class Leg {
  constructor([a, b, c], material, tipMaterial) {
    Object.assign(this, { a, b, c });
    this.root = new THREE.Group();
    this.femur = new THREE.Group();
    this.root.add(this.femur);
    this.femur.add(rod(a, 0.06, 0.05, material));
    this.femur.add(mesh(new THREE.SphereGeometry(0.065, 12, 8), material));
    this.tibia = new THREE.Group();
    this.tibia.position.x = a;
    this.femur.add(this.tibia);
    this.tibia.add(rod(b, 0.045, 0.034, material));
    this.tibia.add(mesh(new THREE.SphereGeometry(0.052, 12, 8), material));
    this.tarsus = new THREE.Group();
    this.tarsus.position.x = b;
    this.tibia.add(this.tarsus);
    this.tarsus.add(rod(c, 0.032, 0.018, tipMaterial, 8));
    // a wider "palm" at the tip, only grown while the fly buries its face in its hands
    this.pad = new THREE.Group();
    this.pad.position.x = c * 0.72;
    this.pad.scale.setScalar(0);
    this.tarsus.add(this.pad);
    const palm = mesh(new THREE.SphereGeometry(0.07, 14, 10), tipMaterial);
    palm.scale.set(2.4, 1.3, 1.6);
    this.pad.add(palm);
  }

  // place the tarsus tip on `target` with the tarsus at absolute pitch `phi` (both in the parent frame)
  reach(origin, target, phi) {
    this.root.position.copy(origin);
    const dx = target.x - origin.x, dy = target.y - origin.y, dz = target.z - origin.z;
    this.root.rotation.set(0, Math.atan2(-dz, dx), 0);
    const pu = Math.hypot(dx, dz) - this.c * Math.cos(phi);
    const pv = dy - this.c * Math.sin(phi);
    const { a, b } = this;
    const d = THREE.MathUtils.clamp(Math.hypot(pu, pv), Math.abs(a - b) + 1e-3, a + b - 1e-3);
    const t1 = Math.atan2(pv, pu) + Math.acos((a * a + d * d - b * b) / (2 * a * d));
    const t2 = -(Math.PI - Math.acos((a * a + b * b - d * d) / (2 * a * b)));
    this.femur.rotation.z = t1;
    this.tibia.rotation.z = t2;
    this.tarsus.rotation.z = phi - t1 - t2;
  }

  // same chain, but the knee bends toward `pole` (a direction) and the tarsus points along `tdir`,
  // so the elbows can stick out sideways (e.g. hands on the head)
  reachPole(origin, target, tdir, pole) {
    const { a, b, c } = this;
    const ankle = target.clone().addScaledVector(tdir, -c);
    const u = ankle.clone().sub(origin);
    const d = THREE.MathUtils.clamp(u.length(), Math.abs(a - b) + 1e-3, a + b - 1e-3);
    u.normalize();
    const w = pole.clone().addScaledVector(u, -pole.dot(u)).normalize();
    const alpha = Math.acos((a * a + d * d - b * b) / (2 * a * d));
    const femurDir = u.clone().multiplyScalar(Math.cos(alpha)).addScaledVector(w, Math.sin(alpha));
    const n = new THREE.Vector3().crossVectors(u, w).normalize();
    const y = new THREE.Vector3().crossVectors(n, femurDir);
    this.root.position.copy(origin);
    this.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(femurDir, y, n));
    this.femur.rotation.set(0, 0, 0);
    this.tibia.rotation.set(0, 0, -(Math.PI - Math.acos((a * a + b * b - d * d) / (2 * a * b))));
    this.tibia.updateMatrix();
    const inv = this.root.quaternion.clone().multiply(this.tibia.quaternion).invert();
    this.tarsus.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tdir.clone().applyQuaternion(inv).normalize());
  }
}

const POSE = { typing: 0, feed: 0, groom: 0, buzz: 0, droop: 0, lean: 0, shock: 0, despair: 0 };
const MODES = {
  idle: { ...POSE, typing: 1 },
  buy: { ...POSE, feed: 1, buzz: 1 },
  sell: { ...POSE, groom: 1 },
  lose: { ...POSE, droop: 1 },
  // ending on a loss: lean in to read the result → jolt back → clutch the head and sob
  check: { ...POSE, lean: 1 },
  shock: { ...POSE, shock: 1 },
  despair: { ...POSE, despair: 1 },
};
const TEARS = 10;
const TEAR_CYCLE = 0.9; // s for one tear to roll off and fall

export class Fly {
  constructor() {
    this.group = new THREE.Group();
    this.pivot = new THREE.Group(); // yaw for turning away from the screen
    this.group.add(this.pivot);
    this.t = 0;
    this.state = { ...MODES.idle };
    this.target = { ...MODES.idle };

    const amber = std(COLOR.amber, { roughness: 0.42 });
    const deep = std(COLOR.amberDeep, { roughness: 0.5 });
    const band = std(COLOR.band, { roughness: 0.6 });
    const tarsus = std(COLOR.tarsus, { roughness: 0.6 });
    const hair = std(COLOR.hair, { roughness: 0.8 });

    this.body = new THREE.Group();
    this.pivot.add(this.body);
    this.body.add(ellipsoid(0.5, 1.2, 0.95, 0.9, amber));
    const scutellum = ellipsoid(0.2, 1.2, 0.6, 1.2, deep);
    scutellum.position.set(-0.5, 0.3, 0);
    this.body.add(scutellum);
    for (let i = 0; i < 8; i++) {
      const s = i % 2 ? 1 : -1, k = Math.floor(i / 2) / 3;
      const bristle = rod(0.16, 0.01, 0.002, hair, 5);
      bristle.position.set(0.3 - 0.6 * k, 0.4 + 0.06 * Math.sin(k * Math.PI), s * (i % 4 < 2 ? 0.28 : 0.14));
      bristle.rotation.set(s * 0.35, 0, Math.PI - 0.55);
      this.body.add(bristle);
    }

    // abdomen: stacked tergites with a dark band at the back of each
    this.abdomen = new THREE.Group();
    this.abdomen.position.set(-0.42, -0.12, 0);
    this.abdomen.rotation.z = -0.62; // lies back along the seat
    this.body.add(this.abdomen);
    let x = -0.1;
    for (const r of [0.4, 0.44, 0.44, 0.4, 0.32, 0.2]) {
      const seg = ellipsoid(r, 0.62, 1, 1.05, amber);
      seg.position.x = x - r * 0.5;
      this.abdomen.add(seg);
      const ring = ellipsoid(r * 1.015, 0.16, 0.96, 1.02, band);
      ring.position.x = x - r * 0.82;
      this.abdomen.add(ring);
      x -= r * 0.72;
    }

    // head
    this.head = new THREE.Group();
    this.head.position.set(0.62, 0.12, 0);
    this.body.add(this.head);
    const neck = rod(0.24, 0.16, 0.14, deep);
    neck.position.x = -0.14;
    this.head.add(neck);
    const skull = ellipsoid(0.34, 0.75, 1, 1.15, amber);
    skull.position.x = 0.12;
    this.head.add(skull);
    const eyeMat = new THREE.MeshPhysicalMaterial({
      color: COLOR.eye, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.15, flatShading: true,
    });
    this.antennae = [];
    for (const s of [1, -1]) {
      const eye = mesh(new THREE.IcosahedronGeometry(0.3, 3), eyeMat);
      eye.scale.set(0.85, 1.12, 0.72);
      eye.position.set(0.15, 0.03, s * 0.27);
      this.head.add(eye);

      const ant = new THREE.Group();
      ant.position.set(0.4, 0.1, s * 0.07);
      this.head.add(ant);
      ant.add(ellipsoid(0.055, 1, 1.3, 1, deep));
      const club = ellipsoid(0.07, 0.8, 1.6, 0.9, amber);
      club.position.set(0.03, -0.09, 0);
      ant.add(club);
      const arista = rod(0.32, 0.012, 0.003, hair, 4);
      arista.position.set(0.04, -0.07, s * 0.04);
      arista.rotation.set(0, -s * 0.6, 0.7);
      ant.add(arista);
      this.antennae.push(ant);

      for (let k = 0; k < 3; k++) {
        const bristle = rod(0.2, 0.014, 0.003, hair, 4);
        bristle.position.set(0.02 + 0.08 * k, 0.3, s * 0.1);
        bristle.rotation.set(s * 0.4, 0, Math.PI - 0.8);
        this.head.add(bristle);
      }
    }

    // proboscis: rostrum → haustellum → labellum, folded under the head until feeding
    this.proboscis = new THREE.Group();
    this.proboscis.position.set(0.28, -0.24, 0);
    this.head.add(this.proboscis);
    this.rostrum = rod(0.22, 0.06, 0.05, amber);
    this.proboscis.add(this.rostrum);
    this.haustellum = new THREE.Group();
    this.proboscis.add(this.haustellum);
    this.haustellumRod = rod(0.3, 0.042, 0.034, amber);
    this.haustellum.add(this.haustellumRod);
    this.labellum = new THREE.Group();
    this.haustellum.add(this.labellum);
    for (const s of [1, -1]) {
      const lobe = ellipsoid(0.11, 1.1, 0.55, 0.8, deep);
      lobe.position.set(0.06, 0, s * 0.055);
      this.labellum.add(lobe);
    }

    // wings folded back over the abdomen
    const wingMat = new THREE.MeshPhysicalMaterial({
      map: wingTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false,
      roughness: 0.2, iridescence: 1, iridescenceIOR: 1.4, iridescenceThicknessRange: [200, 500],
    });
    this.wings = [1, -1].map((s) => {
      const hinge = new THREE.Group();
      hinge.position.set(-0.05, 0.36, s * 0.2);
      hinge.rotation.order = 'YZX';
      this.body.add(hinge);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.7), wingMat);
      plane.geometry.translate(0.95, 0, 0);
      plane.rotation.x = -Math.PI / 2;
      plane.scale.y = s;
      hinge.add(plane);
      return { hinge, s };
    });

    // tears roll off the bottom of each eye while sobbing
    const tearMat = new THREE.MeshPhysicalMaterial({
      color: 0x9fd8ff, emissive: 0x2a6fb0, emissiveIntensity: 0.5, roughness: 0.05, transmission: 0.3, transparent: true, opacity: 0.9,
    });
    this.tears = Array.from({ length: TEARS }, (_, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), tearMat);
      m.scale.set(1, 1.35, 1);
      m.visible = false;
      this.pivot.add(m);
      return { m, s: i % 2 ? 1 : -1, phase: (Math.floor(i / 2) / (TEARS / 2)) * TEAR_CYCLE };
    });

    // legs hang off the pivot so their targets can live in a stable frame
    const LEN = { front: [0.6, 0.55, 0.38], mid: [0.62, 0.6, 0.4], hind: [0.66, 0.62, 0.42] };
    const ATTACH = { front: [0.28, -0.35, 0.18], mid: [0.02, -0.42, 0.24], hind: [-0.25, -0.38, 0.22] };
    this.legs = [];
    for (const pair of ['front', 'mid', 'hind']) {
      for (const s of [1, -1]) {
        const leg = new Leg(LEN[pair], amber, tarsus);
        this.pivot.add(leg.root);
        const [ax, ay, az] = ATTACH[pair];
        this.legs.push({ leg, pair, s, attach: new THREE.Vector3(ax, ay, s * az) });
      }
    }
    // where the front legs type and where the other legs stand, relative to the fly (set by the scene)
    this.keyboard = new THREE.Vector3(1.2, -0.35, 0);
    this.seatY = -0.95;
    this.update(0);
  }

  setMode(mode) {
    this.target = { ...MODES[mode] };
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    const k = 1 - Math.exp(-dt * 10);
    for (const key in this.state) this.state[key] += (this.target[key] - this.state[key]) * k;
    const { typing, feed, groom, buzz, droop, lean, shock, despair } = this.state;
    const sob = despair * Math.max(0, Math.sin(t * 9)) * (0.6 + 0.4 * Math.sin(t * 1.3)); // shaky breaths
    const wail = despair * Math.max(0, Math.sin(t * 2.2)) ** 3; // every ~3 s the head flings further back in a wail

    this.pivot.rotation.y = 0.35 * groom - 0.95 * despair; // can't bear to look: turn from the screen toward the camera
    this.pivot.rotation.x = despair * (0.07 * Math.sin(t * 1.4) + 0.02 * sob); // rocking side to side
    this.body.rotation.z = SIT_PITCH - 0.3 * feed - 0.4 * droop - 0.28 * lean + 0.3 * shock + 0.3 * despair
      + 0.12 * wail + 0.015 * Math.sin(t * 1.6) + 0.035 * sob;
    this.body.position.y = 0.04 * shock * Math.abs(Math.sin(t * 40)) + 0.03 * wail + 0.02 * sob;
    this.abdomen.scale.setScalar(1 + 0.012 * Math.sin(t * 2.2) + 0.03 * sob + 0.04 * wail);

    // despair: head thrown back to the sky, face buried in both hands
    this.head.rotation.z = -SIT_PITCH - 0.15 - 0.2 * feed + 0.45 * groom - 0.3 * droop - 0.12 * lean + 0.35 * shock
      + 0.55 * despair + 0.3 * wail + 0.03 * Math.sin(t * 0.9);
    this.head.rotation.y = 0.08 * Math.sin(t * 0.7) * typing + 0.22 * Math.sin(t * 1.7) * despair; // "no, no, no"

    // proboscis: tucked (e=0) → reaching down-forward (e=1), pumping while feeding
    const e = THREE.MathUtils.clamp(feed + 0.06 * Math.sin(t * 16) * feed, 0, 1.1);
    const stretch = 1 + 1.0 * e;
    this.proboscis.rotation.z = THREE.MathUtils.lerp(-2.4, -0.15, e);
    this.rostrum.scale.x = stretch;
    this.haustellum.position.x = 0.22 * stretch;
    this.haustellum.rotation.z = THREE.MathUtils.lerp(1.6, 0.05, e);
    this.haustellumRod.scale.x = stretch;
    this.labellum.position.x = 0.3 * stretch;
    this.labellum.rotation.z = 0.3 * Math.sin(t * 16) * feed;

    this.antennae.forEach((a, i) => {
      const calm = 1 - shock - despair;
      a.rotation.z = (0.15 * Math.sin(t * 3.1 + i * 1.7) + 0.1 * Math.sin(t * 7.3 + i)) * Math.max(calm, 0.2)
        + 0.5 * shock - 0.55 * despair + 0.5 * wail; // spring up in shock, go limp in despair
    });

    for (const { hinge, s } of this.wings) {
      const flap = buzz * Math.sin(t * 90) + 0.5 * shock * Math.sin(t * 70);
      hinge.rotation.y = Math.PI + s * (0.2 + 0.1 * droop + 0.35 * buzz + 0.45 * shock + 0.25 * flap - 0.08 * despair);
      hinge.rotation.z = 0.78 + 0.3 * (buzz + shock) * Math.abs(flap) - 0.1 * droop - 0.12 * despair; // lie along the abdomen
      hinge.rotation.x = s * 0.45; // roof-like tilt so a wing is never seen edge-on
    }

    this.body.updateMatrix();
    this.head.updateMatrix();
    const toPivot = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(this.head.matrix).applyMatrix4(this.body.matrix);
    const dirToPivot = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(this.head.quaternion).applyQuaternion(this.body.quaternion).normalize();
    const mouth = toPivot(0.3, -0.25, 0);

    for (const { m, s, phase } of this.tears) {
      const age = (t + phase) % TEAR_CYCLE / TEAR_CYCLE;
      m.visible = despair > 0.5;
      if (!m.visible) continue;
      const eye = toPivot(0.3, -0.16, s * 0.4); // leaking out from under the hands
      const fall = Math.max(0, age - 0.25) / 0.75;
      m.position.copy(eye).add(new THREE.Vector3(0.12 * fall, -1.6 * fall * fall, s * 0.08 * fall));
      m.scale.setScalar(THREE.MathUtils.smoothstep(age, 0, 0.25) * (1 - 0.5 * fall));
      m.scale.y *= 1.35;
    }
    for (const { leg, pair, s, attach } of this.legs) {
      const origin = attach.clone().applyMatrix4(this.body.matrix);
      let target, phi;
      if (pair === 'front') {
        const phase = s > 0 ? 0 : Math.PI;
        const type = this.keyboard.clone().add(new THREE.Vector3(0.05 * Math.sin(t * 2 + phase), 0.1 * Math.max(0, Math.sin(t * 15 + phase)), s * 0.22));
        const rest = this.keyboard.clone().add(new THREE.Vector3(-0.15, 0, s * 0.38));
        const rub = mouth.clone().add(new THREE.Vector3(0.1 + 0.08 * Math.sin(t * 13 + phase), -0.05 + 0.06 * Math.cos(t * 13 + phase), s * 0.1));
        const hang = new THREE.Vector3(0.55, -0.95, s * 0.45);
        const grip = rest.clone().add(new THREE.Vector3(0.2, 0.02, -s * 0.12)); // lean in, hands on the desk
        const up = toPivot(-0.05, 0.75, s * 0.55); // hands thrown up beside the head
        const clutch = toPivot(0.46 + 0.02 * Math.sin(t * 9 + phase), 0.1 + 0.03 * sob, s * 0.2); // palms pressed over the eyes
        const w = [typing, feed, groom, droop, lean, shock, despair];
        target = [type, rest, rub, hang, grip, up, clutch]
          .reduce((acc, v, i) => acc.add(v.clone().multiplyScalar(w[i])), new THREE.Vector3())
          .divideScalar(w.reduce((a, b) => a + b, 0) || 1);
        const rest6 = typing + feed + droop + lean + groom + shock;
        phi = (-1.2 * (typing + feed + droop + lean) + 0.4 * groom + 0.9 * shock) / (rest6 || 1);
        // blend from the usual upright-knee pose into elbows-out, palms-up-the-sides-of-the-head
        const horiz = new THREE.Vector3(target.x - origin.x, 0, target.z - origin.z).normalize();
        const tdir = horiz.multiplyScalar(Math.cos(phi)).add(new THREE.Vector3(0, Math.sin(phi), 0))
          .lerp(dirToPivot(0.1, 1, -s * 0.6), despair).normalize(); // fingers up and across the eyes
        const pole = new THREE.Vector3(0, 1, 0).lerp(new THREE.Vector3(0.2, -0.5, s).normalize(), despair).normalize(); // elbows out and down
        leg.reachPole(origin, target, tdir, pole);
        leg.pad.scale.setScalar(despair);
        continue;
      } else {
        // dangle over the front edge of the seat
        target = new THREE.Vector3(pair === 'mid' ? 0.45 : 0.1, this.seatY - (pair === 'mid' ? 0.5 : 0.65), s * (pair === 'mid' ? 0.5 : 0.72));
        phi = -1.45;
      }
      leg.reach(origin, target, phi);
    }
  }
}
