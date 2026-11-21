

import { groundY } from './config.js';
import { createVehicle } from './vehicles.js';
export function stageShot(G, name) {
 const p = G.player;
 G.started = true;
 document.getElementById('start').style.display = 'none';
 G.hud.showHud(true);
 const cam = (x, y, z, lx, ly, lz) => { G.camOverride = { x, y, z, lx, ly, lz }; };
 if (name === 'chase') {
  G.shotMode = true;
  const sport = createVehicle(G, 'sport', 48.4, 62, Math.PI, 0xd8232a);
  p.enterCar(sport);
  const c1 = createVehicle(G, 'police', 43.5, 73, Math.PI); c1.isBlock = true;
  const c2 = createVehicle(G, 'police', 53.5, 68.5, Math.PI); c2.isBlock = true;
  G.police.units.push(c1, c2); G.police.heat = 300;

  createVehicle(G, 'suv', 41.5, 57, 0);
  createVehicle(G, 'hatch', 52.8, 50, Math.PI);
  createVehicle(G, 'limo', 38.5, 68, 0);
  G.hud.setObjective('HOT GOODS — Deliver it to the west lockup');

  G.hud.dialogue('MARINA SOL', [
   'The bay is watching, Rio.',
   'Every cruiser in Palmera is rolling — shake them, or run it straight to the west lockup!',
   'Every cruiser in Palmera is rolling — shake them, or run it straight to the west lockup!',
   'Every cruiser in Palmera is rolling — shake them, or run it straight to the west lockup!',
  ]);
  G.beaconTarget = { x: -150, z: 60 };
  cam(56, 4.6, 82, 46, 1.3, 57);
 } else if (name === 'beach') {
  p.x = 30; p.z = 188; p.angle = Math.PI * 0.9;
  p.fig.group.position.set(p.x, groundY(p.x, p.z), p.z);
  p.fig.group.rotation.y = p.angle;
  G.hud.setObjective('BEACH RUN — Reach the end of the pier');
  G.beaconTarget = { x: 24, z: 262 };
  cam(66, 6.5, 240, -14, 2, 170);
 } else if (name === 'city') {
  p.x = 8.5; p.z = 43.5; p.angle = 2.7;
  p.fig.group.position.set(p.x, groundY(p.x, p.z), p.z);
  p.fig.group.rotation.y = p.angle;
  createVehicle(G, 'taxi', -16, 38.4, Math.PI / 2);
  createVehicle(G, 'sedan', -3.4, 28, 0, 0x3c78d8);
  const spots = [[4,39,0.9],[11,47.5,2.4],[-2,42,-1.6],[6.5,36.5,3],[13,38.5,-2.8]];
  let n = 0;
  for (const ped of G.peds) {
   if (n >= spots.length || ped.role !== 'citizen' || ped.mode !== 'walk') continue;
   const [sx, sz, ry] = spots[n++];
   ped.mode = 'stand'; ped.x = ped.tx = sx; ped.z = ped.tz = sz;
   ped.fig.group.position.set(sx, groundY(sx, sz), sz);
   ped.fig.group.rotation.y = ry;
  }
  G.hud.setObjective('STREET HEAT — Hit every checkpoint across town');
  G.beaconTarget = { x: 45, z: -10 };
  cam(16, 3.1, 54, -6, 1.8, 26);
 } else if (name === 'mission') {
  G.shotMode = true;
  p.x = 147; p.z = 137; p.angle = 2.6;
  p.fig.group.position.set(p.x, groundY(p.x, p.z), p.z);
  p.fig.group.rotation.y = 2.6;
  const c1 = createVehicle(G, 'police', 143, 124, 0.7); c1.isBlock = true;
  const c2 = createVehicle(G, 'police', 166, 112, -2.2); c2.isBlock = true;
  G.police.units.push(c1, c2); G.police.heat = 400;
  G.missions.hasCase = true;
  G.hud.setObjective('CASE GRAB — Lose the police');
  G.beaconTarget = { x: 30, z: 176 };
  cam(133, 3, 140, 170, 1.5, 120);
 } else if (name.startsWith('char')) {

  p.x = 34; p.z = 190;
  p.fig.group.position.set(34, groundY(34, 190), 190);
  const views = { 'char-front': [34, 1.5, 186.2, 34, 1.15, 190], 'char-side': [37.6, 1.5, 190, 34, 1.15, 190], 'char-threeq': [36.6, 1.8, 187.2, 34, 1.1, 190] };
  const v = views[name] || views['char-front'];
  p.fig.group.rotation.y = name === 'char-side' ? Math.PI / 2 : Math.PI;
  cam(...v);
  G.hud.showHud(false);
  G.beaconTarget = null;
 }
}
