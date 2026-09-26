// Club lighting: moving colored spotlights with visible beams, LED strips and a floor grid that cycle through hues
// on a 124 BPM pulse. update(t, off) fades everything out (off = 1 → pitch black) for the despair ending.
import * as THREE from 'three';

const BPM = 124;
const RIGS = [ // ceiling position, sweep phase
  { pos: [-4, 7.5, -3.5], phase: 0 },
  { pos: [5.5, 7.5, -3.5], phase: 1.6 },
  { pos: [-3.5, 7.5, 3], phase: 3.1 },
  { pos: [5, 7.5, 3.5], phase: 4.7 },
];

export function buildClub(scene, { grid, flyPos, deskTop, deskSpan, stoolPos }) {
  const beamMat = () => new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const beamGeo = new THREE.ConeGeometry(0.9, 1, 32, 1, true).translate(0, -0.5, 0); // apex at the origin, base at y = -1
  const down = new THREE.Vector3(0, -1, 0);

  const rigs = RIGS.map(({ pos, phase }) => {
    const light = new THREE.SpotLight(0xffffff, 0, 16, 0.3, 0.5, 1);
    light.position.set(...pos);
    scene.add(light, light.target);
    const beam = new THREE.Mesh(beamGeo, beamMat());
    beam.position.copy(light.position);
    scene.add(beam);
    return { light, beam, phase };
  });

  // LED strips: under the desk's front edge, along its back edge, and a ring around the stool base
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, toneMapped: false });
  const leds = new THREE.Group();
  const [x0, x1, zHalf] = deskSpan;
  for (const z of [zHalf + 0.01, -zHalf - 0.01]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.035, 0.035), ledMat);
    strip.position.set((x0 + x1) / 2, deskTop - 0.12, z);
    leds.add(strip);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.025, 8, 64), ledMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(stoolPos.x, 0.03, stoolPos.z);
  leds.add(ring);
  scene.add(leds);
  const ledLight = new THREE.PointLight(0xff00ff, 0, 5, 1.5); // spill from the strips onto the floor
  ledLight.position.set((x0 + x1) / 2, 0.4, zHalf + 0.3);
  scene.add(ledLight);

  grid.material.vertexColors = false;
  grid.material.needsUpdate = true;
  const gridOpacity = grid.material.opacity;

  const c = new THREE.Color();
  return {
    update(t, off) {
      const on = 1 - off;
      const beat = Math.exp(-((t * BPM) / 60 % 1) * 5); // kick on every beat, decays fast
      rigs.forEach(({ light, beam, phase }, i) => {
        c.setHSL((t * 0.12 + i * 0.25) % 1, 1, 0.55);
        const aim = new THREE.Vector3(
          flyPos.x + 1 + 2.6 * Math.sin(t * 0.55 + phase),
          0,
          flyPos.z + 2.2 * Math.cos(t * 0.8 + phase * 1.3),
        );
        light.target.position.copy(aim);
        light.color.copy(c);
        light.intensity = on * (22 + 30 * beat);
        const dir = aim.clone().sub(light.position);
        beam.scale.set(1, dir.length(), 1);
        beam.quaternion.setFromUnitVectors(down, dir.normalize());
        beam.material.color.copy(c);
        beam.material.opacity = on * (0.07 + 0.09 * beat);
        beam.visible = on > 0.01;
      });
      c.setHSL((t * 0.2) % 1, 1, 0.5);
      ledMat.color.copy(c).multiplyScalar(on * (0.7 + 0.5 * beat));
      ledLight.color.copy(c);
      ledLight.intensity = on * 3;
      grid.material.color.setHSL((t * 0.12 + 0.5) % 1, 0.9, 0.45 + 0.2 * beat);
      grid.material.opacity = gridOpacity * on;
    },
  };
}
