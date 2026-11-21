

const THREE = window.THREE;
import { createInput } from './input.js';
import { loadSave, storeSave } from './save.js';
import { createAudio } from './audio.js';
import { createFx } from './fx.js';
import { buildWorld } from './world.js';
import { createFleet } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPlayer } from './player.js';
import { createWeapons } from './weapons.js';
import { createPolice } from './police.js';
import { createHud, renderPause } from './hud.js';
import { createMissions } from './missions.js';
import { stageShot } from './shots.js';
import { mulberry32 } from './random.js';
import { groundY } from './config.js';
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputEncoding = THREE.sRGBEncoding;
let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(pixelRatio);
function resize() { renderer.setSize(window.innerWidth, window.innerHeight); }
window.addEventListener('resize', resize); resize();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1600);
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); });
const G = {
 scene, camera, time: 0, started: false, paused: false, shake: 0,
 rng: mulberry32(20261121), save: loadSave(), clock: { minutes: 15 * 60 + 20 },
 beaconTarget: null, camOverride: null,
};
G.input = createInput(canvas);
G.audio = createAudio();
G.fx = createFx(scene);
G.onEnterCar = () => {}; G.onBusted = () => {}; G.onStunt = () => {}; G.onExplosion = () => {};
G.addHeat = () => {}; G.clearHeat = () => {};
const world = buildWorld(scene, G);
const fleet = createFleet(G);
const peds = createPedestrians(G);
createPlayer(G);
G.weapons = createWeapons(G);
G.police = createPolice(G);
G.hud = createHud(G);
G.missions = createMissions(G);
G.hud.setObjective('Talk to Marina Sol by the pier');
window.__game = G;

const startEl = document.getElementById('start');
function startGame() {
 if (G.started) return;
 G.started = true;
 startEl.style.display = 'none';
 G.hud.showHud(true);
 G.audio.unlock();
 G.missions.activate();
 canvas.requestPointerLock?.();
}
startEl.addEventListener('click', startGame);
const pauseEl = document.getElementById('pause');
let pauseTab = 'MAP';
function setPaused(on) {
 G.paused = on;
 pauseEl.style.display = on ? 'flex' : 'none';
 if (on) renderPause(G, pauseTab);
 document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === pauseTab));
}
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => { pauseTab = b.dataset.tab; setPaused(true); }));

const camPos = new THREE.Vector3(55, 14, 208), camLook = new THREE.Vector3();
function updateCamera(dt) {
 const p = G.player;
 if (G.camOverride) {
  const o = G.camOverride;
  camera.position.set(o.x, o.y, o.z); camera.lookAt(o.lx, o.ly, o.lz);
  return;
 }
 if (!G.started) {

  const t = G.time * 0.03;
  camPos.set(26 + Math.sin(t) * 20, 9.5 + Math.sin(t * 0.7) * 1.6, 268 - Math.cos(t) * 8);
  camera.position.lerp(camPos, Math.min(1, dt * 2));
  camera.lookAt(-6, 4, 158);
  return;
 }
 const inp = G.input;
 let target, look;
 if (p.car) {
  const a = p.car.angle, back = 10.5 + Math.abs(p.car.speed) * 0.16;
  target = new THREE.Vector3(p.car.x - Math.sin(a) * back, groundY(p.car.x, p.car.z) + 4.4 + Math.abs(p.car.speed) * 0.03, p.car.z - Math.cos(a) * back);
  look = new THREE.Vector3(p.car.x + Math.sin(a) * 8, 1.6, p.car.z + Math.cos(a) * 8);
  camera.fov += ((62 + Math.min(11, Math.abs(p.car.speed) * 0.3)) - camera.fov) * Math.min(1, dt * 3);
 } else if (inp.aiming) {
  const sy = Math.sin(inp.yaw), cy = Math.cos(inp.yaw);
  target = new THREE.Vector3(p.x + sy * 3.4 + cy * 0.85, p.y + 1.75, p.z + cy * 3.4);
  look = new THREE.Vector3(p.x - sy * 22, p.y + 1.55 + Math.sin(inp.pitch) * 22, p.z - cy * 22);
  camera.fov += (52 - camera.fov) * Math.min(1, dt * 6);
 } else {
  const sy = Math.sin(inp.yaw), cy = Math.cos(inp.yaw);
  target = new THREE.Vector3(p.x + sy * 6.4, p.y + 2.9 + Math.sin(inp.pitch) * 3, p.z + cy * 6.4);
  look = new THREE.Vector3(p.x - sy * 6, p.y + 1.5, p.z - cy * 6);
  camera.fov += (60 - camera.fov) * Math.min(1, dt * 3);
 }
 camera.updateProjectionMatrix();
 camera.position.lerp(target, Math.min(1, dt * (p.car ? 5 : 9)));
 if (G.shake > 0) {
  G.shake = Math.max(0, G.shake - dt * 1.6);
  camera.position.x += (Math.random() - 0.5) * G.shake * 0.7;
  camera.position.y += (Math.random() - 0.5) * G.shake * 0.7;
 }
 camLook.lerp(look, Math.min(1, dt * 10));
 camera.lookAt(camLook);
}

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
let shotFrames = 0;
if (shotName) { stageShot(G, shotName); if (shotName === 'chase' || shotName === 'mission') G.police.heat = shotName === 'chase' ? 300 : 400; }

let last = performance.now(), acc = 0, fpsFrames = 0, fpsTime = 0, saveT = 0;
const STEP = 1 / 60;
function stepWorld(dt) {
 G.time += dt;
 G.clock.minutes = 15 * 60 + 20 + G.time * 0.35;
 if (G.input.pressed['KeyP']) setPaused(!G.paused);
 if (G.input.pressed['KeyM']) G.hud.toast(G.audio.toggleMute() ? 'SOUND OFF' : 'SOUND ON');
 if (G.input.pressed['KeyC'] && G.started) { const st = G.audio.radioNext(!!G.player.car); G.hud.toast(st ? `RADIO — ${st}` : 'RADIO OFF'); }
 if (!G.paused) {
  if (G.started) { G.player.update(dt); G.weapons.update(dt); }
  world.update(dt); fleet.update(dt); peds.update(dt);
  if (G.started) { G.police.update(dt); G.missions.update(dt); }
  G.fx.update(dt);
  if (G.beaconTarget) {
   const b = G.beacon, t = G.beaconTarget;
   b.visible = true;
   b.position.set(t.x, groundY(t.x, t.z) + 30, t.z);
   const d = Math.hypot(G.player.x - t.x, G.player.z - t.z);
   b.material.opacity = Math.max(0.05, Math.min(0.26, 18 / Math.max(20, d)));
  } else G.beacon.visible = false;
 }
 G.input.pollEdges();
}
function frame(now) {
 requestAnimationFrame(frame);
 let dt = (now - last) / 1000; last = now;
 if (dt > 0.3) dt = 0.3;
 acc += dt;
 let steps = 0;
 while (acc >= STEP && steps < 5) { stepWorld(STEP); acc -= STEP; steps++; }
 if (steps === 5) acc = 0;
 updateCamera(dt);
 if (G.started && !G.paused) G.hud.update(dt);
 renderer.render(scene, camera);
 if (shotName) { shotFrames++; if (shotFrames > 35) window.__shotReady = true; }
 fpsFrames++; fpsTime += dt;
 if (fpsTime >= 1) {
  const fps = fpsFrames / fpsTime;
  if (fps < 42 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); }
  else if (fps > 57 && pixelRatio < 1.5) { pixelRatio = Math.min(1.5, pixelRatio + 0.25); renderer.setPixelRatio(pixelRatio); }
  fpsFrames = 0; fpsTime = 0;
 }
 saveT += dt;
 if (saveT > 10 && G.started) { saveT = 0; storeSave(G.save); }
}
requestAnimationFrame(frame);
