

const THREE = window.THREE;
import { TUNING, groundY } from './config.js';
import { createVehicle, damageCar } from './vehicles.js';
import { buildFigure, poseFigure } from './characters.js';
export function createPolice(G) {
 const pol = { heat: 0, stars: 0, seen: false, unseenT: 0, blockT: 8, units: [], officers: [], heli: null, heliLight: null };
 G.addHeat = (amount, x, z) => {

  pol.heat = Math.min(TUNING.heatMax, pol.heat + amount);
 };
 G.clearHeat = () => { pol.heat = 0; };
 function spawnCruiser() {
  const a = Math.random() * Math.PI * 2, d = 75 + Math.random() * 20;
  const x = G.player.x + Math.cos(a) * d, z = G.player.z + Math.sin(a) * d;
  const car = createVehicle(G, pol.stars >= 5 && Math.random() < 0.6 ? 'swat' : 'police', x, z, a);
  pol.units.push(car);
  return car;
 }
 function spawnOfficer(x, z) {
  const fig = buildFigure({ skin: 0xb97a4e, shirt: 0x24406e, pants: 0x1d2f52, shoes: 0x14161a, hair: 0x14100c, cap: true, accent: 0x24406e });
  fig.group.position.set(x, groundY(x, z), z);
  G.scene.add(fig.group);
  const off = { fig, x, z, cool: 0, hp: 100, down: 0, mode: 'stand', role: 'officer', wait: 0, speed: 0, tx: x, tz: z };
  pol.officers.push(off); G.peds.push(off);
  return off;
 }
 function makeRoadblock() {
  const p = G.player;
  const dirx = Math.sin(p.car ? p.car.angle : p.angle), dirz = Math.cos(p.car ? p.car.angle : p.angle);
  const bx = p.x + dirx * 52, bz = p.z + dirz * 52;
  for (const side of [-1, 1]) {
   const car = createVehicle(G, 'police', bx + Math.cos(p.angle) * side * 3.4, bz - Math.sin(p.angle) * side * 3.4, p.angle + side * 0.6);
   car.isBlock = true; pol.units.push(car);
   spawnOfficer(car.x + 2, car.z + 2);
  }
  G.hud.toast('POLICE ROADBLOCK AHEAD');
 }
 function despawnFar() {
  for (let i = pol.units.length - 1; i >= 0; i--) {
   const u = pol.units[i];
   const d = Math.hypot(u.x - G.player.x, u.z - G.player.z);
   if ((d > 130 && !u.isBlock) || (u.isBlock && d > 110) || u.wrecked) {
    G.scene.remove(u.mesh);
    G.cars.splice(G.cars.indexOf(u), 1);
    pol.units.splice(i, 1);
   }
  }
 }
 pol.update = (dt) => {
  pol.stars = Math.ceil(pol.heat / TUNING.starHeat);
  if (G.shotMode) { pol.seen = pol.stars > 0; return; }
  const p = G.player;
  let seen = false;
  for (const u of pol.units) if (Math.hypot(u.x - p.x, u.z - p.z) < 55) seen = true;
  for (const o of pol.officers) if (o.down <= 0 && Math.hypot(o.x - p.x, o.z - p.z) < 42) seen = true;
  if (pol.heli && pol.stars >= 4) seen = seen || Math.hypot(p.x - pol.heli.position.x, p.z - pol.heli.position.z) < 60;
  pol.seen = seen;
  if (!seen && pol.heat > 0) {
   pol.unseenT += dt;
   const need = TUNING.heatDecay[Math.max(0, pol.stars - 1)] || 30;
   pol.heat = Math.max(0, pol.heat - (TUNING.starHeat / need) * dt * (pol.stars >= 4 && pol.heli ? 0.35 : 1));
  } else pol.unseenT = 0;
  const wantUnits = pol.stars === 0 ? 0 : Math.min(6, 1 + pol.stars);
  if (pol.units.filter((u) => !u.isBlock).length < wantUnits && pol.stars > 0) spawnCruiser();
  despawnFar();

  for (const u of pol.units) {
   if (u.wrecked || u.isBlock) continue;
   const dx = p.x - u.x, dz = p.z - u.z, d = Math.hypot(dx, dz);
   const targetAngle = Math.atan2(dx, dz);
   let diff = targetAngle - u.angle;
   while (diff > Math.PI) diff -= Math.PI * 2;
   while (diff < -Math.PI) diff += Math.PI * 2;
   u.angle += Math.max(-1.9 * dt, Math.min(1.9 * dt, diff));
   const want = d > 7 ? u.spec.max * 0.92 : d * 0.8;
   u.speed += Math.sign(want - u.speed) * Math.min(Math.abs(want - u.speed), 16 * dt);
   const nx = u.x + Math.sin(u.angle) * u.speed * dt, nz = u.z + Math.cos(u.angle) * u.speed * dt;
   u.x = nx; u.z = nz;
   u.mesh.position.set(u.x, groundY(u.x, u.z), u.z);
   u.mesh.rotation.y = u.angle;
   if (d < 3.4 && !p.car) {
    p.hurt(14 * dt * 10 * 0.26);
    if (p.speed < 1) { p.bustTimer += dt; if (p.bustTimer > 1.2) { p.bustTimer = 0; G.onBusted('BUSTED'); } }
   }
   if (d < 26 && u.speed < 2 && !u.officerOut && pol.stars >= 2) { u.officerOut = true; spawnOfficer(u.x + 2, u.z + 1); }
  }

  for (const o of pol.officers) {
   if (o.down > 0) continue;
   const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
   if (d > 3) {
    const sp = 4.4;
    o.x += (dx / d) * sp * dt; o.z += (dz / d) * sp * dt;
    o.fig.group.position.set(o.x, groundY(o.x, o.z), o.z);
    o.fig.group.rotation.y = Math.atan2(dx, dz);
    poseFigure(o.fig, 'walk', dt, sp);
   } else {
    poseFigure(o.fig, 'aim', dt, 0, 0);
    o.fig.group.rotation.y = Math.atan2(dx, dz);
    if (!p.car) { p.bustTimer += dt; if (p.bustTimer > 1.2) { p.bustTimer = 0; G.onBusted('BUSTED'); } }
   }
   o.cool -= dt;
   if (d < 34 && d > 3 && o.cool <= 0) { o.cool = 0.9; if (Math.random() < 0.55) p.hurt(7); G.audio.shot('pistol'); }
  }
  if (p.speed >= 1 || p.car) p.bustTimer = Math.max(0, p.bustTimer - dt * 2);

  if (pol.stars >= 3) {
   pol.blockT -= dt;
   if (pol.blockT <= 0) { pol.blockT = 15; if (!pol.units.some((u) => u.isBlock)) makeRoadblock(); }
  }

  if (pol.stars >= 4 && !pol.heli) {

   const grp = new THREE.Group();
   const hm = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.35, metalness: 0.35 });
   const dm = new THREE.MeshStandardMaterial({ color: 0x24406e, roughness: 0.4, metalness: 0.3 });
   const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), hm); body.scale.set(0.85, 0.75, 1.9); grp.add(body);
   const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2c4256, roughness: 0.12, metalness: 0.5 })); canopy.scale.set(0.8, 0.7, 1); canopy.position.set(0, 0.15, 1.6); grp.add(canopy);
   const cheat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.34, 3.4), dm); cheat.position.y = -0.25; grp.add(cheat);
   const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 4.8, 8), hm); tail.rotation.x = Math.PI / 2; tail.position.z = -4.4; grp.add(tail);
   const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.7), dm); fin.position.set(0, 0.55, -6.6); grp.add(fin);
   const tr = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.18), dm); tr.position.set(0.22, 0.55, -6.6); grp.add(tr); grp.userData.tailRotor = tr;
   for (const sx of [-1, 1]) { const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), dm); skid.rotation.x = Math.PI / 2; skid.position.set(sx * 0.95, -1.25, 0.2); grp.add(skid); }
   const flir = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), dm); flir.position.set(0, -0.85, 1.9); grp.add(flir);
   const rotor = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.07, 0.42), dm); rotor.position.y = 1.35; grp.add(rotor);
   grp.userData.rotor = rotor;
   G.scene.add(grp); pol.heli = grp;
   pol.heliLight = new THREE.SpotLight(0xfff6cc, 2.2, 90, 0.32, 0.5);
   G.scene.add(pol.heliLight); G.scene.add(pol.heliLight.target);
  }
  if (pol.heli) {
   if (pol.stars < 4) { G.scene.remove(pol.heli); G.scene.remove(pol.heliLight); pol.heli = null; }
   else {
    const a = G.time * 0.35;
    pol.heli.position.set(p.x + Math.cos(a) * 26, 30, p.z + Math.sin(a) * 26);
    pol.heli.userData.rotor.rotation.y += dt * 22;
    if (pol.heli.userData.tailRotor) pol.heli.userData.tailRotor.rotation.x += dt * 30;
    pol.heliLight.position.copy(pol.heli.position);
    pol.heliLight.target.position.set(p.x, 0, p.z);
   }
  }
  if (pol.stars > 0) G.audio.siren(pol.units.length ? Math.hypot(pol.units[0].x - p.x, pol.units[0].z - p.z) : 99);
 };
 return pol;
}
