// HUD: brand, stars, cash, clock, bars, weapon + vehicle chips (with the
// durability PHASE chip), objective, prompts, toasts, portrait dialogue,
// island minimap and the pause suite (map / missions / stats / controls).
import { PHASE_COLORS } from './durability.js';
import { WEAPONS, districtAt, WORLD } from './config.js';
const $ = (id) => document.getElementById(id);
export function createHud(G) {
  const els = {
    hud: $('hud'), cash: $('cash'), stars: $('stars'), clock: $('clock'), hp: $('hpfill'),
    armour: $('armfill'), weapon: $('weapon'), veh: $('vehchip'), phase: $('phasechip'),
    objective: $('objective'), prompt: $('prompt'), toast: $('toast'), district: $('district'),
    minimap: $('minimap'), cross: $('crosshair'), dlg: $('dialogue'), dlgName: $('dlg-name'),
    dlgText: $('dlg-text'), dlgFace: $('dlg-face'), hint: $('hint'),
  };
  const mm = els.minimap.getContext('2d');
  let toastT = 0, dlgQueue = [], dlgT = 0;
  const hud = {
    els,
    toast(msg) { els.toast.textContent = msg; els.toast.style.opacity = 1; toastT = 3.2; },
    setObjective(t) { els.objective.textContent = t; },
    setPrompt(t) { els.prompt.textContent = t; },
    dialogue(name, lines) { dlgQueue.push(...lines.filter(Boolean).map((text) => ({ name, text }))); },
    showHud(on) { els.hud.style.display = on ? 'block' : 'none'; els.hint.style.display = on ? 'block' : 'none'; },
    drawFace(name) {
      const g = els.dlgFace.getContext('2d');
      g.fillStyle = '#f2b13c'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#b97a4e'; g.beginPath(); g.arc(32, 30, 15, 0, 7); g.fill();
      g.fillStyle = '#14100c'; g.fillRect(17, 12, 30, 9);
      g.fillStyle = '#14161c'; g.fillRect(24, 28, 4, 5); g.fillRect(37, 28, 4, 5);
      g.fillStyle = '#7a3b26'; g.fillRect(27, 40, 10, 3);
      g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(0, 52, 64, 12);
      g.fillStyle = '#fff'; g.font = 'bold 8px Arial'; g.textAlign = 'center';
      g.fillText(name.split(' ')[0], 32, 61);
    },
    update(dt) {
      const p = G.player, save = G.save;
      els.cash.textContent = '$' + save.cash.toLocaleString('en-US');
      const stars = G.police.stars;
      els.stars.textContent = '★★★★★'.slice(0, stars) + '☆☆☆☆☆'.slice(0, 5 - stars);
      els.stars.style.opacity = G.police.seen ? 1 : (Math.sin(G.time * 6) > 0 ? 1 : 0.35);
      const mins = Math.floor(G.clock.minutes);
      els.clock.textContent = `DAY ${save.day} · ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      els.hp.style.width = Math.max(0, p.hp) + '%';
      els.armour.style.width = Math.max(0, p.armour) + '%';
      els.district.textContent = districtAt(p.x, p.z);
      const w = G.weapons, spec = WEAPONS[w.current];
      els.weapon.textContent = w.reloading > 0 ? `${spec.name} · RELOADING…`
        : spec.mag === Infinity ? spec.name
        : `${spec.name} · ${w.mag[w.current]} / ${save.ammo[w.current] ?? 0}`;
      if (p.car) {
        els.veh.style.display = 'block';
        const d = p.car.dur;
        els.veh.textContent = `${p.car.type.toUpperCase()} · HP ${Math.max(0, Math.round(d.hp))}/${d.maxHp} · ${Math.round(Math.abs(p.car.speed) * 3.6)} km/h`;
        els.phase.style.display = 'inline-block';
        els.phase.textContent = d.isJobCar ? 'JOB CAR · ARMOURED' : d.state;
        els.phase.style.background = d.isJobCar ? '#3c78d8' : PHASE_COLORS[d.state];
      } else { els.veh.style.display = 'none'; els.phase.style.display = 'none'; }
      els.cross.style.display = G.input.aiming && !p.car ? 'block' : 'none';
      if (toastT > 0) { toastT -= dt; if (toastT <= 0) els.toast.style.opacity = 0; }
      // dialogue queue
      if (dlgQueue.length) {
        els.dlg.style.display = 'flex';
        const cur = dlgQueue[0];
        if (els.dlgName.textContent !== cur.name) { els.dlgName.textContent = cur.name; hud.drawFace(cur.name); }
        els.dlgText.textContent = cur.text;
        dlgT -= dt;
        if (dlgT <= 0 || G.input.pressed['Enter']) { dlgQueue.shift(); dlgT = 3.4; }
      } else els.dlg.style.display = 'none';
      drawMinimap();
    },
  };
  function world2map(x, z, S) { return [ (x / 640 + 0.5) * S, (z / 640 + 0.5) * S ]; }
  function drawMinimap() {
    const S = els.minimap.width, g = mm;
    g.fillStyle = '#2e8fb8'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#7fae56';
    g.beginPath(); g.ellipse(S / 2, S / 2, S * 0.44, S * 0.4, 0, 0, 7); g.fill();
    g.fillStyle = '#e8cf9a';
    g.beginPath(); g.ellipse(S / 2, S * 0.86, S * 0.42, S * 0.07, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(40,40,44,0.8)'; g.lineWidth = 2;
    for (const ax of WORLD.avenues) { const [x] = world2map(ax, 0, S); g.beginPath(); g.moveTo(x, S * 0.28); g.lineTo(x, S * 0.78); g.stroke(); }
    for (const sz of WORLD.streets) { const [, y] = world2map(0, sz, S); g.beginPath(); g.moveTo(S * 0.22, y); g.lineTo(S * 0.78, y); g.stroke(); }
    const dot = (x, z, color, r = 3) => { const [mx, my] = world2map(x, z, S); g.fillStyle = color; g.beginPath(); g.arc(mx, my, r, 0, 7); g.fill(); };
    G.shellSpots.forEach((s, i) => { if (!s.taken && !G.save.shells.includes(i)) dot(s.x, s.z, '#ffc93e', 2); });
    for (const car of G.cars) if (Math.hypot(car.x - G.player.x, car.z - G.player.z) < 95) dot(car.x, car.z, '#d8d8d8', 2);
    for (const u of G.police.units) dot(u.x, u.z, '#3c78ff', 3);
    if (G.beaconTarget) dot(G.beaconTarget.x, G.beaconTarget.z, '#ffd23e', 4);
    const p = G.player, [px, py] = world2map(p.x, p.z, S);
    g.save(); g.translate(px, py); g.rotate(p.car ? p.car.angle : p.angle);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill(); g.restore();
    if (G.police.seen) { els.minimap.style.borderColor = Math.sin(G.time * 6) > 0 ? '#ff3b30' : '#2255ff'; }
    else els.minimap.style.borderColor = 'rgba(255,255,255,0.5)';
  }
  hud.showHud(false);
  return hud;
}
// Pause suite: tabs rendered into #pause-body; the map tab draws districts
// with their standing percentages.
export function renderPause(G, tab) {
  const body = document.getElementById('pause-body');
  const save = G.save;
  if (tab === 'MAP') {
    body.innerHTML = '<canvas id="bigmap" width="520" height="380"></canvas><div class="prow" id="standrow"></div>';
    const g = body.querySelector('#bigmap').getContext('2d');
    g.fillStyle = '#2e8fb8'; g.fillRect(0, 0, 520, 380);
    g.fillStyle = '#7fae56'; g.beginPath(); g.ellipse(260, 190, 225, 175, 0, 0, 7); g.fill();
    g.fillStyle = '#e8cf9a'; g.beginPath(); g.ellipse(260, 330, 215, 26, 0, 0, 7); g.fill();
    g.strokeStyle = '#33373c'; g.lineWidth = 3;
    for (const ax of [-90, -45, 0, 45, 90]) { const x = (ax / 640 + 0.5) * 520; g.beginPath(); g.moveTo(x, 90); g.lineTo(x, 300); g.stroke(); }
    for (const sz of [-10, 35, 80, 125]) { const y = (sz / 640 + 0.5) * 380; g.beginPath(); g.moveTo(110, y); g.lineTo(410, y); g.stroke(); }
    g.fillStyle = '#ffd23e'; g.font = 'bold 12px Arial';
    const stands = Object.entries(save.standing);
    body.querySelector('#standrow').textContent = stands.length ? stands.map(([k, v]) => `${k} ${Math.round(v)}%`).join(' · ') : 'No district standing yet — finish jobs to earn it.';
    const p = G.player;
    g.fillStyle = '#fff'; g.beginPath(); g.arc((p.x / 640 + 0.5) * 520, (p.z / 640 + 0.5) * 380, 6, 0, 7); g.fill();
    if (G.beaconTarget) { g.fillStyle = '#ffd23e'; g.beginPath(); g.arc((G.beaconTarget.x / 640 + 0.5) * 520, (G.beaconTarget.z / 640 + 0.5) * 380, 5, 0, 7); g.fill(); }
  } else if (tab === 'MISSIONS') {
    body.innerHTML = G.missions.jobsState().map((j) => `<div class="mrow ${j.state}"><span>CH${j.ch} · ${j.title}</span><span>${j.state === 'done' ? 'DONE' : j.state === 'current' ? 'ACTIVE' : 'LOCKED'} · $${j.pay}</span></div>`).join('');
  } else if (tab === 'STATS') {
    const rows = [
      ['Cash', '$' + save.cash], ['Respect', save.respect], ['Bay Rep Lv', 1 + Math.floor(save.respect / 60)],
      ['Day', save.day], ['Jobs done', save.jobsDone + ' / 8'], ['Golden shells', save.shells.length + ' / 15'],
      ['Safehouse', save.safehouse ? 'owned' : '—'], ['Garage', `ENGINE Lv${save.garage.engine} · ARMOUR Lv${save.garage.armour} · NITRO ${save.garage.nitro ? 'yes' : 'no'}`],
      ['Best Street Heat', save.bestRace.heat ? save.bestRace.heat + 's' : '—'],
    ];
    body.innerHTML = rows.map(([k, v]) => `<div class="mrow"><span>${k}</span><span>${v}</span></div>`).join('');
  } else {
    body.innerHTML = `<div class="mrow"><span>Move / drive</span><span>W A S D</span></div>
      <div class="mrow"><span>Sprint / nitro</span><span>SHIFT</span></div>
      <div class="mrow"><span>Enter / exit car</span><span>E</span></div>
      <div class="mrow"><span>Aim (hold) + shoot</span><span>RIGHT MOUSE + LEFT MOUSE</span></div>
      <div class="mrow"><span>Weapons</span><span>1-4 · Q · WHEEL</span></div>
      <div class="mrow"><span>Reload</span><span>R</span></div>
      <div class="mrow"><span>Interact (shops, garage, courier)</span><span>T</span></div>
      <div class="mrow"><span>Radio</span><span>C</span></div>
      <div class="mrow"><span>Pause</span><span>P or ESC</span></div>
      <div class="mrow"><span>Mute</span><span>M</span></div>`;
  }
}
