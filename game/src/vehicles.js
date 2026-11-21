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
export function buildVehicleMesh(type, color) {
  const spec = CAR_TYPES[type];
  const g = new THREE.Group();
  const paint = std(color, 0.32, { metalness: 0.5 });
  const glass = std(0x9fd4e8, 0.12, { metalness: 0.6 });
  const dark = std(0x1c1e22, 0.7);
  const L = spec.len, W = spec.wid, H = spec.hgt;
  const bodyMats = [paint];
  if (type === 'moto') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, L * 0.7), paint); frame.position.y = 0.55; g.add(frame);
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), paint); tank.position.set(0, 0.78, 0.15); tank.scale.set(0.8, 0.6, 1.6); g.add(tank);
  } else {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.52, L), paint);
    lower.position.y = H * 0.42; g.add(lower);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, H * 0.3, L * 0.2), paint);
    nose.position.set(0, H * 0.36, L * 0.55); nose.rotation.x = 0.18; g.add(nose);
    if (type === 'truck') {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.62, L * 0.3), paint); cab.position.set(0, H * 0.75, L * 0.32); g.add(cab);
      const box = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, H * 0.95, L * 0.58), std(0xe8e6e0, 0.7)); box.position.set(0, H * 0.62, -L * 0.2); g.add(box);
      bodyMats.push(box.material);
    } else if (type === 'van') {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, H * 0.55, L * 0.85), paint); cab.position.set(0, H * 0.72, -L * 0.02); g.add(cab);
      const win = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, H * 0.22, L * 0.2), glass); win.position.set(0, H * 0.82, L * 0.38); g.add(win);
    } else {
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, H * 0.42, L * 0.46), glass);
      cabin.position.set(0, H * 0.78, -L * 0.04); g.add(cabin);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.07, L * 0.4), paint);
      roof.position.set(0, H * 1.0, -L * 0.04); g.add(roof);
    }
    const lightM = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
    const tailM = new THREE.MeshBasicMaterial({ color: 0xff4b3e });
    for (const sx of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.06), lightM); hl.position.set(sx * W * 0.32, H * 0.45, L / 2 + 0.1); g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.06), tailM); tl.position.set(sx * W * 0.32, H * 0.5, -L / 2 - 0.02); g.add(tl);
    }
    if (type === 'taxi') {
      const sgn = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3), new THREE.MeshBasicMaterial({ color: 0xffe14c }));
      sgn.position.set(0, H + 0.12, 0); g.add(sgn);
    }
    if (type === 'police') {
      // lightbar: distinct RED and BLUE emissive segments — never white ovals
      const bar = new THREE.Group(); bar.position.set(0, H + 0.1, 0);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 0.34), dark); bar.add(base);
      const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2a20 })); red.position.x = -0.28; bar.add(red);
      const blu = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0x2255ff })); blu.position.x = 0.28; bar.add(blu);
      g.add(bar); g.userData.lightbar = { red, blu };
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.22, L * 0.7), std(0xf2f2f2, 0.4)); stripe.position.y = H * 0.45; g.add(stripe);
    }
  }
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(type === 'moto' ? 0.33 : 0.36, type === 'moto' ? 0.33 : 0.36, 0.24, 12);
  const wheelMat = std(0x14161a, 0.9);
  const wpos = type === 'moto' ? [[0, 0.85], [0, -0.85]] : [[-spec.wid / 2 + 0.1, spec.len * 0.32], [spec.wid / 2 - 0.1, spec.len * 0.32], [-spec.wid / 2 + 0.1, -spec.len * 0.32], [spec.wid / 2 - 0.1, -spec.len * 0.32]];
  for (const [wx, wz] of wpos) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.36, wz); g.add(w); wheels.push(w);
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
