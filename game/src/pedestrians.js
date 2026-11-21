
import { SHOPS, WORLD, groundY, shoreZ, WATER_Y, waterDepth } from './config.js';
import { buildFigure, poseFigure } from './characters.js';
import { mulberry32, pick, range } from './random.js';
const SKINS = [0xd9a37e, 0xb97a4e, 0x8a5a34, 0xf0c8a0, 0x6e4525];
const CLOTH = [0xd84f3c, 0x3c78d8, 0xf2b13c, 0x63b06b, 0xf2f0e8, 0x9a5fc0, 0x2ea8a0, 0xe87fa8];
function outfit(rng, role) {
 const base = { skin: pick(rng, SKINS), shirt: pick(rng, CLOTH), pants: pick(rng, CLOTH), shoes: pick(rng, CLOTH), hair: pick(rng, [0x2a1d12, 0x4a3018, 0x14100c, 0x8a6a48, 0xd8d8d8]) };
 if (role === 'keeper') { base.apron = true; base.cap = true; }
 if (role === 'doctor') { base.shirt = 0xf4f6f8; base.accent = 0xd8342c; }
 if (role === 'nurse') { base.shirt = 0x7fd4c9; }
 if (role === 'fire') { base.shirt = 0xd8b13c; base.accent = 0xd8342c; base.cap = true; }
 if (role === 'swim') { base.pants = base.shirt; }
 if (rng() < 0.3) base.dress = true;
 return base;
}
export function createPedestrians(G) {
 const rng = G.rng;
 G.peds = [];
 function addPed(x, z, role, mode = 'walk') {
  const fig = buildFigure(outfit(rng, role));
  fig.group.position.set(x, groundY(x, z), z);
  fig.group.rotation.y = range(rng, 0, Math.PI * 2);
  G.scene.add(fig.group);
  const ped = { fig, role, mode, x, z, tx: x, tz: z, speed: range(rng, 1.1, 1.9), wait: 0, hp: 100, down: 0, shopIdx: Math.floor(range(rng, 0, SHOPS.length)) };
  G.peds.push(ped);
  return ped;
 }
 for (const shop of SHOPS) {
  const ped = addPed(shop.x + range(rng, -3, 3), shop.z + 1.5, 'keeper', 'stand');
  ped.fig.group.rotation.y = Math.PI;
 }
 addPed(-108, -8, 'doctor', 'stand'); addPed(-104, -6, 'nurse', 'stand');
 addPed(-106, 138, 'fire', 'stand'); addPed(-100, 140, 'fire', 'stand');
 const walkSpots = [];
 for (const ax of WORLD.avenues) for (const sz of WORLD.streets) walkSpots.push([ax + 10.5, sz + 8]);
 for (let i = 0; i < 46; i++) {
  const [x, z] = pick(rng, walkSpots);
  addPed(x + range(rng, -3, 3), z + range(rng, -3, 3), 'citizen');
 }
 for (let i = 0; i < 14; i++) {
  const s = SHOPS[i % SHOPS.length];
  const ped = addPed(s.x, s.z + 4, 'shopper');
  ped.mode = 'shop';
 }
 for (let i = 0; i < 20; i++) addPed(range(rng, -130, 130), range(rng, 140, 165), 'citizen');
 for (const spot of G.beachProps.slice(0, 10)) {
  const ped = addPed(spot.x, spot.z, 'swim', 'lie');
  ped.fig.group.rotation.x = -Math.PI / 2 + 0.06;
  ped.fig.group.position.y = groundY(spot.x, spot.z) + 0.18;
  ped.fig.blob.visible = false;
 }
 addPed(66, shoreZ(66) - 12, 'swim', 'stand'); addPed(74, shoreZ(74) - 12, 'swim', 'stand');
 G.swimmers = [];
 for (let i = 0; i < 9; i++) {
  const x = -120 + i * 28 + range(rng, -6, 6);
  let z = shoreZ(x) + 6;
  while (waterDepth(x, z) < 1.0 && z < shoreZ(x) + 40) z += 2;
  const fig = buildFigure(outfit(rng, 'swim'));
  fig.group.position.set(x, WATER_Y - 1.12, z);
  fig.blob.visible = false;
  G.scene.add(fig.group);
  G.swimmers.push({ fig, x, z, phase: range(rng, 0, 6) });
 }
 function newTarget(ped) {
  if (ped.mode === 'shop') {
   ped.shopIdx = (ped.shopIdx + 1 + Math.floor(range(rng, 0, 3))) % SHOPS.length;
   const s = SHOPS[ped.shopIdx];
   ped.tx = s.x + range(rng, -4, 4); ped.tz = s.z + 4;
  } else {
   const [x, z] = pick(rng, walkSpots);
   ped.tx = x + range(rng, -4, 4); ped.tz = z + range(rng, -4, 4);
   if (rng() < 0.25) { ped.tx = range(rng, -130, 130); ped.tz = range(rng, 140, 164); }
  }
 }
 return {
  update(dt) {
   for (const ped of G.peds) {
    const f = ped.fig;
    if (ped.down > 0) { ped.down -= dt; f.blob.visible = false; poseFigure(f, 'down', dt); if (ped.down <= 0) { ped.hp = 60; f.group.rotation.x = 0; f.blob.visible = true; } continue; }
    if (ped.mode === 'stand') { poseFigure(f, 'idle', dt); continue; }
    if (ped.mode === 'lie') continue;
    if (ped.wait > 0) { ped.wait -= dt; poseFigure(f, 'idle', dt); continue; }
    const dx = ped.tx - ped.x, dz = ped.tz - ped.z, d = Math.hypot(dx, dz);
    if (d < 1.2) { ped.wait = ped.mode === 'shop' ? range(rng, 2, 5) : range(rng, 0.4, 2); newTarget(ped); continue; }
    const vx = (dx / d) * ped.speed, vz = (dz / d) * ped.speed;
    ped.x += vx * dt; ped.z += vz * dt;
    f.group.position.set(ped.x, groundY(ped.x, ped.z), ped.z);
    f.group.rotation.y = Math.atan2(vx, vz);
    poseFigure(f, 'walk', dt, ped.speed);
   }
   for (const sw of G.swimmers) {
    sw.phase += dt;
    sw.fig.group.position.y = WATER_Y - 1.12 + Math.sin(sw.phase * 1.4) * 0.07;
    sw.fig.group.position.x = sw.x + Math.sin(sw.phase * 0.22) * 2.5;
    poseFigure(sw.fig, 'swim', dt);
   }
  },
 };
}
