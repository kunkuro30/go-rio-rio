

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
  p.x = 2.8; p.z = 34; p.angle = Math.PI;
  p.fig.group.position.set(p.x, groundY(p.x, p.z), p.z);
  p.fig.group.rotation.y = Math.PI;
  G.hud.setObjective('STREET HEAT — Hit every checkpoint across town');
  G.beaconTarget = { x: 45, z: -10 };
  cam(7.5, 3.1, 47, -3, 6, -20);
 } else if (name === 'mission') {
  G.shotMode = true;
  p.x = 140; p.z = 130; p.angle = Math.PI / 2;
  p.fig.group.position.set(p.x, groundY(p.x, p.z), p.z);
  p.fig.group.rotation.y = Math.PI / 2;
  const c1 = createVehicle(G, 'police', 152, 124, 2.2); c1.isBlock = true;
  const c2 = createVehicle(G, 'police', 162, 130, -2.8); c2.isBlock = true;
  G.police.units.push(c1, c2); G.police.heat = 400;
  G.missions.hasCase = true;
  G.hud.setObjective('CASE GRAB — Lose the police');
  G.beaconTarget = { x: 30, z: 176 };
  cam(130, 3.2, 138, 168, 1.4, 122);
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
