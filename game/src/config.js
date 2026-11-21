// GO RIO RIO — shared world constants, geography and tuning.
// One unit is one metre everywhere (house physics standard).
export const WORLD = {
  // City grid (downtown plateau). Avenues run north-south, streets east-west.
  avenues: [-90, -45, 0, 45, 90],
  streets: [-10, 35, 80, 125],
  roadHalf: 7,
  walkHalf: 10.5, // sidewalk outer edge from road centre
  city: { x0: -125, x1: 125, z0: -38, z1: 168 },
  park: { x0: -32, x1: 32, z0: 48, z1: 112 }, // traffic never enters this lawn
  islandRadius: 305, // beyond this the player respawns on the beach
};
export const WATER_Y = 0.25;
// The shoreline is ONE function: the coast mesh, the sand blend, the swim
// depth and the physics check all read shoreZ so they can never disagree.
export function shoreZ(x) {
  return 198 + 12 * Math.sin(x * 0.02) + 6 * Math.sin(x * 0.05 + 1.3);
}
export function groundY(x, z) {
  const s = shoreZ(x);
  if (z > s) return 0.4 - (z - s) * 0.085; // seabed falls away under the water
  let y = 0.8;
  const mx = x + 150, mz = z + 175;
  y += 30 * Math.exp(-(mx * mx + mz * mz) / 2200); // the big northern mountain
  const hx = x - 175, hz = z + 150;
  y += 9 * Math.exp(-(hx * hx + hz * hz) / 2600); // eastern hill
  return y;
}
export function waterDepth(x, z) {
  return Math.max(0, WATER_Y - groundY(x, z));
}
export function isWater(x, z) {
  return z > shoreZ(x) - 2;
}
export const TUNING = {
  walk: 5.2, sprint: 8.6, swim: 3.1, playerRadius: 0.42,
  heatMax: 500, starHeat: 100,
  heatDecay: [30, 45, 60, 75, 90], // seconds unseen per star level
};
export const CAR_TYPES = {
  sedan:  { len: 4.7, wid: 1.9, hgt: 1.45, accel: 15, max: 27, mass: 1300, hp: 120, explode: 34, seat: { x: -0.42, y: 0.4, z: 0.25 } },
  taxi:   { len: 4.7, wid: 1.9, hgt: 1.5,  accel: 15, max: 27, mass: 1320, hp: 120, explode: 34, seat: { x: -0.42, y: 0.4, z: 0.25 } },
  coupe:  { len: 4.4, wid: 1.85, hgt: 1.32, accel: 19, max: 34, mass: 1250, hp: 110, explode: 36, seat: { x: -0.4, y: 0.26, z: 0.2 } },
  sport:  { len: 4.5, wid: 1.95, hgt: 1.24, accel: 25, max: 43, mass: 1200, hp: 105, explode: 38, seat: { x: -0.4, y: 0.2, z: 0.15 } },
  van:    { len: 5.2, wid: 2.0, hgt: 2.0,  accel: 12, max: 23, mass: 1900, hp: 160, explode: 30, seat: { x: -0.45, y: 0.72, z: 0.9 } },
  truck:  { len: 6.4, wid: 2.2, hgt: 2.6,  accel: 10, max: 21, mass: 3200, hp: 200, explode: 28, seat: { x: -0.5, y: 1.0, z: 1.4 } },
  police: { len: 4.8, wid: 1.95, hgt: 1.5, accel: 21, max: 37, mass: 1450, hp: 150, explode: 36, seat: { x: -0.42, y: 0.4, z: 0.25 } },
  suv:    { len: 4.9, wid: 2.0, hgt: 1.78, accel: 14, max: 25, mass: 1750, hp: 150, explode: 32, seat: { x: -0.45, y: 0.55, z: 0.3 } },
  hatch:  { len: 4.1, wid: 1.8, hgt: 1.5,  accel: 16, max: 28, mass: 1150, hp: 110, explode: 34, seat: { x: -0.4, y: 0.4, z: 0.2 } },
  city:   { len: 3.6, wid: 1.7, hgt: 1.55, accel: 13, max: 24, mass: 950,  hp: 100, explode: 32, seat: { x: -0.38, y: 0.42, z: 0.15 } },
  roadster:{ len: 4.3, wid: 1.85, hgt: 1.18, accel: 23, max: 40, mass: 1100, hp: 100, explode: 36, seat: { x: -0.4, y: 0.16, z: 0.1 } },
  limo:   { len: 6.2, wid: 2.0, hgt: 1.52, accel: 12, max: 26, mass: 2100, hp: 170, explode: 30, seat: { x: -0.42, y: 0.4, z: 0.3 } },
  swat:   { len: 5.6, wid: 2.2, hgt: 2.3,  accel: 13, max: 26, mass: 3400, hp: 260, explode: 26, seat: { x: -0.5, y: 0.85, z: 0.9 } },
  moto:   { len: 2.2, wid: 0.7, hgt: 1.15, accel: 22, max: 36, mass: 220, hp: 60, explode: 30, seat: { x: 0, y: 0.72, z: -0.1 } },
};
// Seated figure bounding box (local, metres) used by the seat-socket check:
// a 1.78 m figure sitting occupies roughly this box above the seat point.
export const SEATED_BOX = { dx: 0.34, dz: 0.42, below: 0.1, above: 1.02 };
export const SHOPS = [
  { name: 'FRESH FISH',   color: 0x3f8fbf, keeper: 0x9fd8e8, x: -104, z: 168 },
  { name: 'TACKLE & BAIT', color: 0x7a5c2e, keeper: 0xd8b25c, x: -78, z: 168 },
  { name: 'DONUT BAY',    color: 0xe87fa8, keeper: 0xffc2d4, x: -52, z: 168 },
  { name: 'KAVA COFFEE',  color: 0x6b4a2f, keeper: 0xe8d8b0, x: -26, z: 168 },
  { name: 'SCOOPS',       color: 0xf2e3a0, keeper: 0xfff3c9, x: 0, z: 168 },
  { name: 'CANDY CLOUD',  color: 0xc99fe8, keeper: 0xeedcff, x: 26, z: 168 },
  { name: 'JUICE PALM',   color: 0x7fc95e, keeper: 0xd6f2b8, x: 52, z: 168 },
  { name: 'MINI MART 24', color: 0x4fbf7a, keeper: 0xb8f2cd, x: 78, z: 168 },
  { name: 'BAY GIFTS',    color: 0xe0a33e, keeper: 0xffe1a8, x: 104, z: 168 },
];
export const WEAPONS = {
  fists:  { name: 'FISTS',  dmg: 34, rate: 0.38, range: 2.3, mag: Infinity, reserve: Infinity, auto: false },
  pistol: { name: 'PISTOL', dmg: 50, rate: 0.32, range: 65, mag: 12, reserve: 96, auto: false, price: 0, rep: 0 },
  smg:    { name: 'SMG',    dmg: 26, rate: 0.09, range: 55, mag: 30, reserve: 240, auto: true, price: 900, rep: 2 },
  rifle:  { name: 'RIFLE',  dmg: 80, rate: 0.55, range: 95, mag: 20, reserve: 160, auto: false, price: 2200, rep: 4 },
};
export const DISTRICTS = [
  { name: 'DOWNTOWN', x: 0, z: 60 }, { name: 'OCEAN DRIVE', x: 0, z: 160 },
  { name: 'PALM PARK', x: 0, z: 80 }, { name: 'THE MARINA', x: 150, z: 150 },
  { name: 'BAY AIRPORT', x: -185, z: 120 }, { name: 'FORT SOL', x: 185, z: -60 },
  { name: 'NORTH HILLS', x: -140, z: -160 },
];
export function districtAt(x, z) {
  if (isWater(x, z)) return 'PALMERA BAY';
  let best = 'PALMERA BAY', bd = 1e9;
  for (const d of DISTRICTS) { const dd = (d.x - x) ** 2 + (d.z - z) ** 2; if (dd < bd) { bd = dd; best = d.name; } }
  return best;
}
