// Vehicles: smooth home-designed bodies at real sizes, traffic AI,
// the island train, boats/jetski/planes — and the 5-phase durability
// system wired into every impact.
const THREE = window.THREE;
import { CAR_TYPES, WORLD, groundY, shoreZ, WATER_Y } from './config.js';
import { createDurability, applyImpact, tickDurability, powerFactor } from './durability.js';
import { mulberry32, pick, range } from './random.js';
const std = (color, rough = 0.5, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.25, ...extra });
const PALETTE = [0xd84f3c, 0x3c78d8, 0xf2f0e8, 0x30343c, 0xf2b13c, 0x63b06b, 0x9a5fc0, 0xd87fb0];
let carSeq = 0;
// ---- realistic detail kit (visual patch) ----
// Design language translated from the user's realistic fleet render:
// dark reflective glasshouses with raked panes and painted pillars,
// chrome brightwork, emissive head/tail lenses, panel seams and handles,
// multi-part wheels (tyre + rim + hub + spoke cross) seated in dark
// wheel-arch discs, and full emergency liveries. Shared materials are
// created once here and reused by every vehicle, so the detail pass
// costs geometry, not shader programs. Nothing in this section touches
// a dimension, a seat socket or a physics value: CAR_TYPES is law.
const GLASS_D = std(0x2c4256, 0.1, { metalness: 0.55 });
const CHROME_D = std(0xd9dee4, 0.18, { metalness: 0.85 });
const TRIM_D = std(0x23262b, 0.7, { metalness: 0.3 });
const ARCH_D = std(0x0b0b0d, 0.95);
const TIRE_D = std(0x17171c, 0.92, { metalness: 0.02 });
const RIM_D = std(0xc9d1da, 0.26, { metalness: 0.78 });
const HUB_D = std(0x878f99, 0.32, { metalness: 0.85 });
const ENGINE_D = std(0x3a3f46, 0.42, { metalness: 0.72 });
const RIB_D = std(0xcac7be, 0.7);
const WHITE_D = std(0xf4f6f8, 0.35, { metalness: 0.3 });
const PLATE_D = std(0xe8e8e2, 0.5);
const HEAD_D = new THREE.MeshStandardMaterial({ color: 0xfff3cf, roughness: 0.25, metalness: 0.1, emissive: 0xffeeb8, emissiveIntensity: 0.7 });
const TAIL_D = new THREE.MeshStandardMaterial({ color: 0xd8232a, roughness: 0.25, metalness: 0.1, emissive: 0xff2a20, emissiveIntensity: 0.55 });
let policeTex = null;
function policeDoorTex() {
  if (policeTex) return policeTex;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#f4f6f8'; cx.fillRect(0, 0, 512, 128);
  cx.fillStyle = '#16233c'; cx.font = '900 82px Arial, sans-serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText('P O L I C E', 256, 68);
  policeTex = new THREE.CanvasTexture(cv);
  return policeTex;
}
// One detailed wheel assembly, grouped so the fleet updater can spin
// the whole thing on its axle (the local x axis) exactly as before.
function makeWheel(r, w) {
  const wg = new THREE.Group();
  const cyl = (rad, wid, m) => {
    const q = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, wid, 18), m);
    q.rotation.z = Math.PI / 2; wg.add(q); return q;
  };
  cyl(r, w, TIRE_D); cyl(r * 0.58, w * 1.06, RIM_D); cyl(r * 0.17, w * 1.16, HUB_D);
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, r * 1.02, r * 0.15), RIM_D); wg.add(s1);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, r * 0.15, r * 1.02), RIM_D); wg.add(s2);
  return wg;
}
export function buildVehicleMesh(type, color) {
  const spec = CAR_TYPES[type];
  const g = new THREE.Group();
  const paint = std(color, 0.32, { metalness: 0.5 });
  const glass = GLASS_D;
  const dark = TRIM_D;
  const L = spec.len, W = spec.wid, H = spec.hgt;
  const bodyMats = [paint];
  const B = (w, h, d, m, x, y, z, rx = 0) => {
    const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    q.position.set(x, y, z); if (rx) q.rotation.x = rx; g.add(q); return q;
  };
  const CYL = (r, len, m, x, y, z, axis = 'z') => {
    const q = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), m);
    if (axis === 'z') q.rotation.x = Math.PI / 2; else if (axis === 'x') q.rotation.z = Math.PI / 2;
    q.position.set(x, y, z); g.add(q); return q;
  };
  const wheels = [];
  const addWheel = (r, w, x, z) => {
    if (type !== 'moto') { // dark arch disc on the body side, behind the tyre
      const a = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.27, r * 1.27, 0.03, 18), ARCH_D);
      a.rotation.z = Math.PI / 2; a.position.set(Math.sign(x) * (W / 2 + 0.004), 0.37, z); g.add(a);
    }
    const wg = makeWheel(r, w); wg.position.set(x, 0.36, z); g.add(wg); wheels.push(wg);
  };
  const mirrorPair = (y, z) => {
    for (const sx of [-1, 1]) {
      B(0.15, 0.04, 0.04, dark, sx * (W / 2 + 0.05), y, z);
      B(0.045, 0.12, 0.19, paint, sx * (W / 2 + 0.13), y + 0.02, z);
    }
  };
  // Panel seams, chrome handles, a short waist brightline and a sill
  // skirt for the closed car bodies.
  const doorDetail = (waist) => {
    for (const sx of [-1, 1]) {
      const fx = sx * (W / 2 + 0.006);
      B(0.02, H * 0.36, 0.025, dark, fx, H * 0.44, L * 0.03);
      B(0.02, H * 0.36, 0.025, dark, fx, H * 0.44, -L * 0.21);
      B(0.025, 0.04, 0.17, CHROME_D, fx, H * 0.6, L * 0.11);
      B(0.025, 0.04, 0.17, CHROME_D, fx, H * 0.6, -L * 0.13);
      if (waist) B(0.015, 0.03, L * 0.42, CHROME_D, fx, H * 0.56, 0);
      B(0.04, 0.09, L * 0.52, dark, sx * (W / 2 - 0.02), H * 0.13, 0);
    }
  };
  // Glasshouse inside the SAME footprint the seat-socket check models:
  // glass centred z=-0.04L, roof slab at 1.0H. A dark tub hides the
  // gaps between raked panes; pillars carry the body colour.
  const glasshouse = (rakeR, roofMat) => {
    B(W * 0.84, H * 0.4, L * 0.44, dark, 0, H * 0.78, -L * 0.04);
    B(W * 0.8, H * 0.5, 0.04, glass, 0, H * 0.79, L * 0.145, -0.42);
    B(W * 0.8, H * 0.46, 0.04, glass, 0, H * 0.79, -L * 0.225, rakeR);
    for (const sx of [-1, 1]) {
      B(0.03, H * 0.3, L * 0.16, glass, sx * W * 0.425, H * 0.8, L * 0.055);
      B(0.03, H * 0.3, L * 0.14, glass, sx * W * 0.425, H * 0.8, -L * 0.15);
      B(0.045, H * 0.34, 0.06, paint, sx * W * 0.425, H * 0.8, -L * 0.028);
      const ap = B(0.045, H * 0.44, 0.055, paint, sx * W * 0.42, H * 0.79, L * 0.148); ap.rotation.x = -0.42;
    }
    B(W * 0.8, 0.07, L * 0.34, roofMat, 0, H * 1.0, -L * 0.05);
  };
  // Face detail shared by every four-wheeled body: emissive lenses on
  // the sloped nose, a slatted grille with a chrome brow, bumpers,
  // a rear plate and a chrome exhaust tip.
  const faceDetail = () => {
    for (const sx of [-1, 1]) {
      const hl = B(0.4, 0.11, 0.05, HEAD_D, sx * W * 0.32, H * 0.37, L * 0.638); hl.rotation.x = 0.18;
      B(0.4, 0.1, 0.05, TAIL_D, sx * W * 0.32, H * 0.44, -L / 2 - 0.02);
    }
    const gr = B(W * 0.5, 0.13, 0.04, dark, 0, H * 0.3, L * 0.645); gr.rotation.x = 0.18;
    const gs = B(W * 0.5, 0.03, 0.045, CHROME_D, 0, H * 0.375, L * 0.63); gs.rotation.x = 0.18;
    B(W * 0.96, 0.15, 0.12, dark, 0, H * 0.15, L * 0.585);
    B(W * 0.96, 0.15, 0.12, dark, 0, H * 0.15, -L * 0.53);
    B(0.44, 0.12, 0.02, PLATE_D, 0, H * 0.32, -L / 2 - 0.03);
    CYL(0.045, 0.22, CHROME_D, W * 0.28, H * 0.11, -L * 0.53);
  };
  if (type === 'moto') {
    const frame = B(0.32, 0.4, L * 0.7, paint, 0, 0.55, 0);
    bodyMats.push(frame.material);
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), paint); tank.position.set(0, 0.78, 0.15); tank.scale.set(0.8, 0.6, 1.6); g.add(tank);
    B(0.3, 0.26, 0.44, ENGINE_D, 0, 0.4, 0.02);                       // engine block
    B(0.3, 0.09, 0.62, dark, 0, 0.84, -0.4);                          // stepped seat
    for (const sx of [-1, 1]) {                                       // raked fork legs + swingarm
      const fk = CYL(0.028, 0.8, CHROME_D, sx * 0.08, 0.62, 0.72, 'y'); fk.rotation.x = -0.42;
      B(0.06, 0.08, 0.78, dark, sx * 0.12, 0.36, -0.44);
      const gr2 = CYL(0.032, 0.15, dark, sx * 0.31, 1.0, 0.52, 'x');   // grips
    }
    CYL(0.025, 0.56, CHROME_D, 0, 1.0, 0.52, 'x');                    // handlebar
    CYL(0.085, 0.1, dark, 0, 0.86, 0.66);                             // headlight bucket
    CYL(0.068, 0.03, HEAD_D, 0, 0.86, 0.72);                          // headlight lens
    CYL(0.035, 0.42, CHROME_D, 0.15, 0.34, 0.28);                     // exhaust header
    CYL(0.055, 0.72, CHROME_D, 0.17, 0.3, -0.4);                      // muffler
    B(0.3, 0.04, 0.46, paint, 0, 0.72, 0.84, -0.2);                   // front fender
    B(0.28, 0.04, 0.42, paint, 0, 0.7, -0.92, 0.25);                  // rear fender
    B(0.13, 0.07, 0.03, TAIL_D, 0, 0.74, -1.1);                       // taillight
    B(0.19, 0.14, 0.02, PLATE_D, 0, 0.56, -1.13, 0.3);                // plate
    addWheel(0.33, 0.15, 0, 0.85); addWheel(0.33, 0.19, 0, -0.85);
  } else {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.52, L), paint);
    lower.position.y = H * 0.42; g.add(lower);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, H * 0.3, L * 0.2), paint);
    nose.position.set(0, H * 0.36, L * 0.55); nose.rotation.x = 0.18; g.add(nose);
    if (type === 'truck') {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.62, L * 0.3), paint); cab.position.set(0, H * 0.75, L * 0.32); g.add(cab);
      const box = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, H * 0.95, L * 0.58), std(0xe8e6e0, 0.7)); box.position.set(0, H * 0.62, -L * 0.2); g.add(box);
      bodyMats.push(box.material);
      B(W * 0.86, H * 0.24, 0.05, glass, 0, H * 0.84, L * 0.475, -0.12);   // cab windshield
      for (const sx of [-1, 1]) {
        B(0.03, H * 0.2, L * 0.18, glass, sx * (W / 2 + 0.005), H * 0.84, L * 0.36);
        B(0.02, H * 0.4, 0.025, dark, sx * (W / 2 + 0.006), H * 0.58, L * 0.28);
      }
      mirrorPair(H * 0.88, L * 0.44);
      const cg = B(W * 0.6, H * 0.2, 0.05, CHROME_D, 0, H * 0.4, L * 0.635); cg.rotation.x = 0.18;
      B(W * 0.98, 0.18, 0.1, CHROME_D, 0, H * 0.13, L * 0.6);              // chrome bumper
      CYL(0.055, H * 0.85, CHROME_D, W / 2 - 0.16, H * 0.72, L * 0.13, 'y'); // exhaust stack
      for (const ry of [0.35, 0.58, 0.81]) B(W * 1.03, 0.05, L * 0.57, RIB_D, 0, H * ry, -L * 0.2); // cargo ribs
      B(0.03, H * 0.8, 0.03, dark, 0, H * 0.6, -L * 0.495);                // rear door seam
      faceDetail();
    } else if (type === 'van') {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, H * 0.55, L * 0.85), paint); cab.position.set(0, H * 0.72, -L * 0.02); g.add(cab);
      B(W * 0.88, H * 0.3, 0.05, glass, 0, H * 0.8, L * 0.415, -0.28);     // sloped windshield
      for (const sx of [-1, 1]) {
        B(0.03, H * 0.2, L * 0.15, glass, sx * W * 0.495, H * 0.82, L * 0.29);
        B(0.02, H * 0.52, 0.025, dark, sx * (W / 2 + 0.006), H * 0.5, -L * 0.02);  // sliding-door seam
        B(0.025, 0.04, 0.16, CHROME_D, sx * (W / 2 + 0.006), H * 0.62, L * 0.03);
        B(W * 0.3, H * 0.18, 0.03, glass, sx * W * 0.2, H * 0.78, -L / 2 - 0.01);  // rear windows
      }
      B(0.03, H * 0.6, 0.03, dark, 0, H * 0.55, -L / 2 - 0.01);            // rear door split
      mirrorPair(H * 0.84, L * 0.36);
      faceDetail();
    } else {
      glasshouse(type === 'coupe' ? 0.62 : type === 'sport' ? 0.55 : 0.45, type === 'police' ? WHITE_D : paint);
      faceDetail();
      doorDetail(type !== 'police');
      mirrorPair(H * 0.84, L * 0.16);
      if (type === 'sport') {
        for (const sx of [-1, 1]) B(0.07, 0.16, 0.07, dark, sx * W * 0.28, H * 0.72, -L * 0.44);
        const sp = B(W * 0.78, 0.045, 0.3, dark, 0, H * 0.81, -L * 0.45); sp.rotation.x = -0.1;  // rear wing
        B(W * 0.9, 0.06, 0.3, dark, 0, H * 0.1, L * 0.52);                                        // front splitter
        CYL(0.045, 0.22, CHROME_D, -W * 0.28, H * 0.11, -L * 0.53);                               // second exhaust
      }
      if (type === 'coupe') {
        const lip = B(W * 0.7, 0.04, 0.22, dark, 0, H * 0.72, -L * 0.46); lip.rotation.x = -0.2;   // decklid lip
        CYL(0.045, 0.22, CHROME_D, -W * 0.28, H * 0.11, -L * 0.53);
      }
      if (type === 'taxi') {
        const sgn = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3), new THREE.MeshBasicMaterial({ color: 0xffe14c }));
        sgn.position.set(0, H + 0.12, 0); g.add(sgn);
        for (const sx of [-1, 1]) B(0.02, 0.09, L * 0.6, dark, sx * (W / 2 + 0.005), H * 0.33, 0); // checker band base
      }
      if (type === 'police') {
        // lightbar: distinct RED and BLUE emissive segments — never white ovals
        const bar = new THREE.Group(); bar.position.set(0, H + 0.1, 0);
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 0.34), dark); bar.add(base);
        const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2a20 })); red.position.x = -0.28; bar.add(red);
        const blu = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0x2255ff })); blu.position.x = 0.28; bar.add(blu);
        g.add(bar); g.userData.lightbar = { red, blu };
        for (const sx of [-1, 1]) {
          B(0.03, H * 0.3, L * 0.46, WHITE_D, sx * (W / 2 + 0.006), H * 0.47, -L * 0.03);  // white door band
          const plate = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.4, H * 0.2), new THREE.MeshBasicMaterial({ map: policeDoorTex() }));
          plate.position.set(sx * (W / 2 + 0.028), H * 0.47, -L * 0.03); plate.rotation.y = sx * Math.PI / 2; g.add(plate);
          B(0.08, 0.42, 0.07, dark, sx * W * 0.26, H * 0.3, L * 0.68);                     // push-bar uprights
        }
        B(W * 0.66, 0.08, 0.06, CHROME_D, 0, H * 0.42, L * 0.7);                          // push-bar crossbars
        B(W * 0.66, 0.08, 0.06, CHROME_D, 0, H * 0.2, L * 0.7);
        const spot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), CHROME_D);    // A-pillar spotlight
        spot.position.set(-W / 2 - 0.04, H * 0.92, L * 0.19); g.add(spot);
      }
    }
    const ww = type === 'truck' ? 0.28 : 0.24;
    for (const [wx, wz] of [[-W / 2 + 0.1, L * 0.32], [W / 2 - 0.1, L * 0.32], [-W / 2 + 0.1, -L * 0.32], [W / 2 - 0.1, -L * 0.32]]) addWheel(0.36, ww, wx, wz);
  }
  g.userData.wheels = wheels;
  g.userData.bodyMats = bodyMats;
  return g;
}
export function createVehicle(G, type, x, z, angle, color) {
  const spec = CAR_TYPES[type];
  if (type === 'police' && color === undefined) color = 0x24406e; // cruisers are always navy
  if (type === 'taxi' && color === undefined) color = 0xf2b13c; // taxis are always yellow
  const mesh = buildVehicleMesh(type, color ?? pick(G.rng, PALETTE));
  mesh.position.set(x, groundY(x, z), z); mesh.rotation.y = angle;
  G.scene.add(mesh);
  const car = {
    id: carSeq++, type, spec, mesh, x, z, angle, speed: 0,
    dur: createDurability(spec), wheels: mesh.userData.wheels,
    bodyMats: mesh.userData.bodyMats, smokeT: 0, fireT: 0, traffic: null,
    driverFig: null, wrecked: false, trainHitDone: false,
  };
  mesh.userData.car = car;
  G.cars.push(car);
  return car;
}
// Two-circle collision vs building AABBs (front + rear), never a centre point.
export function carHitsBuilding(G, car, nx, nz, nAngle) {
  const spec = car.spec, r = spec.wid * 0.62;
  for (const off of [-spec.len * 0.27, spec.len * 0.27]) {
    const cx = nx + Math.sin(nAngle) * off, cz = nz + Math.cos(nAngle) * off;
    for (const c of G.colliders) {
      if (Math.abs(cx - c.x) < c.hx + r && Math.abs(cz - c.z) < c.hz + r) return c;
    }
  }
  return null;
}
export function damageCar(G, car, relSpeed, otherMass, opts = {}) {
  if (!car || car.wrecked) return 0;
  const before = car.dur.state;
  const dmg = applyImpact(car.dur, relSpeed, otherMass, opts);
  if (dmg > 0) {
    const p = car.mesh.position;
    if (relSpeed > 6) G.audio.crash();
    if (car.dur.state !== before && car.dur.state === 'LIGHT') G.fx.sparks(p.x, p.y + 0.8, p.z, 8);
    if (car.dur.exploded) explodeCar(G, car);
    else if (dmg > 4) G.fx.sparks(p.x, p.y + 0.7, p.z, 5);
  }
  return dmg;
}
export function explodeCar(G, car) {
  if (car.wrecked) return;
  car.wrecked = true; car.speed = 0;
  const p = car.mesh.position;
  G.fx.explosion(p.x, p.y + 0.5, p.z);
  G.audio.boom();
  G.shake = Math.min(1, (G.shake || 0) + 0.7);
  for (const m of car.bodyMats) { m.color.set(0x17181c); m.roughness = 0.95; }
  if (car.driverFig) { // eject whoever was driving
    car.driverFig.group.position.set(p.x + 2.4, groundY(p.x + 2.4, p.z + 1), p.z + 1);
    car.driverFig = null;
  }
  if (G.player.car === car) G.player.eject();
  // area damage: neighbours can chain-explode
  for (const other of G.cars) {
    if (other === car || other.wrecked) continue;
    const d = other.mesh.position.distanceTo(p);
    if (d < 7) setTimeout(() => damageCar(G, other, 16 * (1 - d / 9), 2000), 220);
  }
  if (G.onExplosion) G.onExplosion(car);
}
function seedTraffic(G) {
  const types = ['sedan', 'taxi', 'coupe', 'van', 'sedan', 'taxi', 'truck', 'sedan', 'coupe', 'van', 'sedan', 'moto', 'taxi', 'sedan'];
  const loops = [];
  for (let i = 0; i < WORLD.avenues.length - 1; i++) for (let j = 0; j < WORLD.streets.length - 1; j++)
    loops.push([WORLD.avenues[i], WORLD.avenues[i + 1], WORLD.streets[j], WORLD.streets[j + 1]]);
  types.forEach((t, i) => {
    const loop = loops[i % loops.length];
    const car = createVehicle(G, t, loop[0] + 3.4, loop[2], 0);
    car.traffic = { loop, edge: i % 4, dist: range(G.rng, 0, 40), speedMax: range(G.rng, 9, 13) };
  });
  // parked cars along Ocean Drive and downtown
  const parkedTypes = ['sedan', 'coupe', 'van', 'sedan', 'sport', 'sedan', 'coupe', 'truck', 'sedan', 'van', 'sedan', 'coupe'];
  parkedTypes.forEach((t, i) => {
    const x = -120 + i * 21, z = 149.5;
    createVehicle(G, t, x, z, Math.PI / 2);
  });
  WORLD.avenues.forEach((ax, i) => { if (i % 2 === 0) createVehicle(G, 'sedan', ax - 3.4, 20 + i * 22, Math.PI); });
  // kerbside parking downtown (clear of the ±3.4 traffic lanes) + a second
  // Ocean Drive row, so the staged corridors read lived-in, not empty.
  const kerbTypes = ['sedan', 'coupe', 'sedan', 'van', 'coupe', 'sedan', 'taxi', 'sedan', 'coupe', 'sedan'];
  WORLD.avenues.forEach((ax, i) => {
    createVehicle(G, kerbTypes[i % kerbTypes.length], ax + 5.9, -22 + i * 27, Math.PI);
    createVehicle(G, kerbTypes[(i + 4) % kerbTypes.length], ax - 5.9, 138 - i * 6, 0);
  });
  [-96, -48, 60, 108].forEach((x, i) => createVehicle(G, kerbTypes[(i + 2) % kerbTypes.length], x, 162.6, -Math.PI / 2));
}
function trafficStep(G, car, dt) {
  const tr = car.traffic, [x0, x1, z0, z1] = tr.loop;
  const lane = 3.4;
  // Rectangle perimeter with lanes offset to the right; the park lawn block
  // (avenues -45..45 x streets 35..80) is never crossed: those loops are
  // simply not generated because park blocks sit inside, traffic stays on roads.
  const edges = [
    { from: [x0 + lane, z0], to: [x0 + lane, z1], ang: 0 },
    { from: [x0 + lane, z1 + lane], to: [x1, z1 + lane], ang: Math.PI / 2 },
    { from: [x1 - lane, z1], to: [x1 - lane, z0], ang: Math.PI },
    { from: [x1 - lane, z0 - lane], to: [x0, z0 - lane], ang: -Math.PI / 2 },
  ];
  const e = edges[tr.edge];
  const len = Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]);
  const want = car.wrecked ? 0 : tr.speedMax * powerFactor(car.dur);
  car.speed += Math.sign(want - car.speed) * Math.min(Math.abs(want - car.speed), 8 * dt);
  tr.dist += car.speed * dt;
  if (tr.dist >= len) { tr.dist = 0; tr.edge = (tr.edge + 1) % 4; }
  const f = len > 0 ? tr.dist / len : 0;
  car.x = e.from[0] + (e.to[0] - e.from[0]) * f;
  car.z = e.from[1] + (e.to[1] - e.from[1]) * f;
  car.angle = e.ang;
}
export function createFleet(G) {
  G.cars = [];
  seedTraffic(G);
  // train: locomotive + wagons on the island loop
  const train = { t: 0, speed: 13, cars: [] };
  const loco = new THREE.Group();
  const locoBody = new THREE.Mesh(new THREE.BoxGeometry(3, 3.2, 11), std(0xb03a2e, 0.45, { metalness: 0.4 })); locoBody.position.y = 2; loco.add(locoBody);
  const locoCab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 3), std(0x30343c, 0.4)); locoCab.position.set(0, 4.2, -3); loco.add(locoCab);
  G.scene.add(loco); train.cars.push(loco);
  for (let i = 0; i < 3; i++) {
    const wag = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.6, 9), std([0x3c78d8, 0x63b06b, 0xf2b13c][i], 0.6));
    wag.position.y = 1.8; const grp = new THREE.Group(); grp.add(wag); G.scene.add(grp); train.cars.push(grp);
  }
  G.train = train;
  // boats, jetski, planes: decorative but durable vehicles too
  G.boats = [];
  for (let i = 0; i < 3; i++) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 7 - i * 1.2), std(PALETTE[i * 2], 0.5));
    const grp = new THREE.Group(); grp.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), std(0xdddddd, 0.5)); mast.position.y = 2.4; grp.add(mast);
    G.scene.add(grp);
    G.boats.push({ mesh: grp, phase: i * 2.1, r: 235 + i * 26, speed: 0.014 + i * 0.004, dur: createDurability({ hp: 80, mass: 900, explode: 40 }) });
  }
  const jet = new THREE.Group();
  const jetBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 2.6), std(0xf2572c, 0.4)); jetBody.position.y = 0.3; jet.add(jetBody);
  G.scene.add(jet); G.jetski = { mesh: jet, phase: 0 };
  function planeMesh(scale = 1) {
    const grp = new THREE.Group();
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.8, 11, 10), std(0xf2f2f2, 0.35)); fus.rotation.x = Math.PI / 2; grp.add(fus);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.18, 2), std(0xd8d8d8, 0.4)); wing.position.z = 0.6; grp.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 1.4), std(0x3c78d8, 0.4)); tail.position.z = -5.2; grp.add(tail);
    grp.scale.setScalar(scale);
    return grp;
  }
  const parkedPlane = planeMesh(1); parkedPlane.position.set(-196, groundY(-196, 88) + 2.2, 88); parkedPlane.rotation.y = 0.5; G.scene.add(parkedPlane);
  G.skyPlane = { mesh: planeMesh(0.8), phase: 0 };
  G.scene.add(G.skyPlane.mesh);
  return {
    update(dt) {
      for (const car of G.cars) {
        tickDurability(car.dur, dt);
        if (car.traffic && !car.wrecked) trafficStep(G, car, dt);
        if (car.traffic || car === G.player.car) {
          car.mesh.position.set(car.x, groundY(car.x, car.z), car.z);
          car.mesh.rotation.y = car.angle;
        }
        for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.36;
        // phase effects
        const st = car.dur.state, p = car.mesh.position;
        if (st === 'MODERATE' || st === 'CRITICAL') {
          car.smokeT -= dt;
          if (car.smokeT <= 0) { G.fx.smoke(p.x, p.y + 1.1, p.z, st === 'CRITICAL'); car.smokeT = st === 'CRITICAL' ? 0.09 : 0.3; }
        }
        if (st === 'CRITICAL') {
          car.fireT -= dt;
          if (car.fireT <= 0) { G.fx.fire(p.x, p.y + 0.9, p.z, 2); car.fireT = 0.16; }
        }
        const lb = car.mesh.userData.lightbar;
        if (lb) { const on = Math.floor(G.time * 3) % 2 === 0; lb.red.material.color.set(on ? 0xff2a20 : 0x661008); lb.blu.material.color.set(on ? 0x1133aa : 0x2255ff); }
      }
      // train along the loop; anything it touches explodes instantly
      const train = G.train; train.t = (train.t + (train.speed * dt) / 1500) % 1;
      train.cars.forEach((grp, i) => {
        const tt = (train.t - i * 0.011 + 1) % 1;
        const p = G.trainCurve.getPointAt(tt), tan = G.trainCurve.getTangentAt(tt);
        grp.position.set(p.x, groundY(p.x, p.z) + 0.3, p.z);
        grp.rotation.y = Math.atan2(tan.x, tan.z);
      });
      const head = train.cars[0].position;
      for (const car of G.cars) {
        if (car.wrecked) continue;
        const d = Math.hypot(car.mesh.position.x - head.x, car.mesh.position.z - head.z);
        if (d < 5.2) damageCar(G, car, 99, 60000, { isTrain: true });
      }
      for (const b of G.boats) {
        b.phase += dt * b.speed;
        const x = Math.cos(b.phase) * b.r, z = 60 + Math.sin(b.phase) * b.r * 0.8;
        b.mesh.position.set(x, WATER_Y + 0.15 + Math.sin(G.time * 1.3 + b.phase * 8) * 0.12, z);
        b.mesh.rotation.y = -b.phase;
      }
      G.jetski.phase += dt * 0.11;
      const jx = Math.cos(G.jetski.phase) * 60 + 40, jz = shoreZ(jx) + 22 + Math.sin(G.jetski.phase * 3) * 6;
      G.jetski.mesh.position.set(jx, WATER_Y + 0.1, jz);
      G.jetski.mesh.rotation.y = -G.jetski.phase + Math.PI / 2;
      G.skyPlane.phase += dt * 0.02;
      const px = Math.cos(G.skyPlane.phase) * 260, pz = Math.sin(G.skyPlane.phase) * 260;
      G.skyPlane.mesh.position.set(px, 85, pz);
      G.skyPlane.mesh.rotation.y = -G.skyPlane.phase;
    },
  };
}
export { powerFactor };
