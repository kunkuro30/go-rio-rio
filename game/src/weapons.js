

const THREE = window.THREE;
import { WEAPONS } from './config.js';
import { damageCar } from './vehicles.js';
export function createWeapons(G) {
 const w = {
  current: 'fists', mag: {}, reloading: 0, cool: 0, dryT: 0,
  owned: { fists: true, pistol: !!G.save.weapons.pistol, smg: !!G.save.weapons.smg, rifle: !!G.save.weapons.rifle },
 };
 for (const k of Object.keys(WEAPONS)) w.mag[k] = WEAPONS[k].mag === Infinity ? Infinity : WEAPONS[k].mag;
 const order = ['fists', 'pistol', 'smg', 'rifle'];

 const gun = new THREE.Group();
 const gBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.42), new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.4, metalness: 0.5 }));
 gun.add(gBody);
 const gBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.3, metalness: 0.6 }));
 gBar.rotation.x = Math.PI / 2; gBar.position.set(0, 0.03, 0.3); gun.add(gBar);
 gun.position.set(0, -0.05, 0.08); gun.visible = false;
 G.player.fig.elbowR.add(gun);
 gun.position.set(0, -0.3, 0.05);
 w.gun = gun;
 function syncGun() { gun.visible = w.current !== 'fists'; const s = w.current === 'rifle' ? 1.35 : w.current === 'smg' ? 1.15 : 1; gun.scale.setScalar(s); }
 w.select = (name) => {
  if (!w.owned[name] || w.current === name) return;
  w.current = name; w.reloading = 0; syncGun();
  G.hud.toast(WEAPONS[name].name);
 };
 w.cycle = (dir) => {
  let i = order.indexOf(w.current);
  for (let n = 0; n < 4; n++) { i = (i + dir + 4) % 4; if (w.owned[order[i]]) { w.select(order[i]); return; } }
 };
 w.startReload = () => {
  const spec = WEAPONS[w.current];
  if (spec.mag === Infinity || w.reloading > 0) return;
  if (w.mag[w.current] >= spec.mag || (G.save.ammo[w.current] || 0) <= 0) return;
  w.reloading = 1.15; G.audio.reload();
 };
 function hurtPed(ped, dmg) {
  ped.hp -= dmg;
  if (ped.hp <= 0 && ped.down <= 0) { ped.down = 6; G.addHeat(50, ped.x, ped.z); }
 }
 w.update = (dt) => {
  w.cool -= dt; w.dryT -= dt;
  if (w.reloading > 0) {
   w.reloading -= dt;
   if (w.reloading <= 0) {
    const spec = WEAPONS[w.current];
    const need = spec.mag - w.mag[w.current];
    const take = Math.min(need, G.save.ammo[w.current] || 0);
    w.mag[w.current] += take; G.save.ammo[w.current] -= take;
   }
   return;
  }
  const inp = G.input;
  if (inp.pressed['Digit1']) w.select('fists');
  if (inp.pressed['Digit2']) w.select('pistol');
  if (inp.pressed['Digit3']) w.select('smg');
  if (inp.pressed['Digit4']) w.select('rifle');
  if (inp.wheel) { w.cycle(inp.wheel > 0 ? 1 : -1); inp.wheel = 0; }
  if (inp.pressed['KeyQ']) w.cycle(1);
  if (inp.pressed['KeyR']) w.startReload();
  if (!inp.firing || G.player.car || !G.started || G.paused) return;
  const spec = WEAPONS[w.current];
  if (w.cool > 0) return;
  if (w.current !== 'fists' && !inp.aiming) return;
  if (w.mag[w.current] <= 0) {
   if (w.dryT <= 0) { G.audio.dryFire(); G.hud.toast('OUT OF AMMO — R TO RELOAD'); w.dryT = 0.8; }
   w.cool = 0.25; return;
  }
  w.cool = spec.rate;
  if (w.current !== 'fists') w.mag[w.current]--;
  G.audio.shot(w.current);
  G.player.fig.recoil = 1;

  const dir = new THREE.Vector3(); G.camera.getWorldDirection(dir);
  const origin = G.camera.position.clone();
  if (w.current === 'fists') {
   const p = G.player;
   for (const ped of G.peds) {
    if (ped.down > 0) continue;
    if (Math.hypot(ped.x - p.x, ped.z - p.z) < spec.range) { hurtPed(ped, spec.dmg); G.fx.sparks(ped.fig.group.position.x, 1.2, ped.fig.group.position.z, 3); break; }
   }
   return;
  }

  const tip = new THREE.Vector3(); gun.getWorldPosition(tip); tip.add(dir.clone().multiplyScalar(0.5));
  G.fx.muzzle(tip.x, tip.y, tip.z);
  let bestT = spec.range, bestPed = null, bestCar = null;
  for (const ped of G.peds) {
   if (ped.down > 0) continue;
   const c = ped.fig.group.position.clone(); c.y += 1.1;
   const t = c.clone().sub(origin).dot(dir);
   if (t < 1 || t > bestT) continue;
   if (c.clone().sub(origin.clone().add(dir.clone().multiplyScalar(t))).length() < 0.55) { bestT = t; bestPed = ped; bestCar = null; }
  }
  for (const car of G.cars) {
   if (car === G.player.car) continue;
   const c = car.mesh.position.clone(); c.y += 0.8;
   const t = c.clone().sub(origin).dot(dir);
   if (t < 1 || t > bestT) continue;
   if (c.clone().sub(origin.clone().add(dir.clone().multiplyScalar(t))).length() < 1.6) { bestT = t; bestCar = car; bestPed = null; }
  }
  const hitP = origin.clone().add(dir.clone().multiplyScalar(bestT));
  if (bestPed) { hurtPed(bestPed, spec.dmg); G.fx.sparks(hitP.x, hitP.y, hitP.z, 4); }
  else if (bestCar) { damageCar(G, bestCar, spec.dmg * 0.22, 900); G.fx.sparks(hitP.x, hitP.y, hitP.z, 5); }
  G.addHeat(28, G.player.x, G.player.z);
 };
 syncGun();
 return w;
}
