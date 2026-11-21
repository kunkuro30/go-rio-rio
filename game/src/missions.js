// Story: 8 jobs in 3 chapters for Marina Sol, plus the side economy —
// races, courier runs, car sales, garage upgrades, the safehouse and
// the 15 golden shells. Story progress is RESTORED from the save:
// jobIdx starts at save.jobsDone (defect B-1), never at zero by default.
import { groundY, districtAt } from './config.js';
import { loadSave, storeSave } from './save.js';
import { buildFigure, poseFigure } from './characters.js';
import { createVehicle } from './vehicles.js';
const LOCKUP = { x: -150, z: 60 };
export const JOBS = [
  { title: 'BEACH RUN', ch: 1, pay: 150, rep: 10, brief: 'A warm-up from Marina: a sunset stroll to the end of the pier.', stages: [{ kind: 'goto', x: 24, z: 262, text: 'Reach the end of the pier' }] },
  { title: 'HOT GOODS', ch: 1, pay: 300, rep: 15, brief: 'Lift the red sports car off Palm Ave and cool it at the lockup.', stages: [{ kind: 'steal', car: 'sport', x: 48, z: 84, text: 'Steal the red sports car off Palm Ave' }, { kind: 'deliver', x: LOCKUP.x, z: LOCKUP.z, text: 'Deliver it to the west lockup' }] },
  { title: 'CASE GRAB', ch: 1, pay: 600, rep: 25, brief: 'Snatch the gold case at the marina — then shake the heat.', stages: [{ kind: 'grab', x: 152, z: 128, text: 'Grab the gold case at the marina warehouse' }, { kind: 'lose', text: 'Lose the police' }, { kind: 'goto', x: 30, z: 176, text: 'Bring the case back to Marina' }] },
  { title: 'AIRPORT RUN', ch: 2, pay: 800, rep: 20, brief: 'A van at Bay Airport needs to disappear downtown.', stages: [{ kind: 'steal', car: 'van', x: -168, z: 60, text: 'Take the van at Bay Airport' }, { kind: 'deliver', x: 60, z: 40, text: 'Drop the van downtown' }] },
  { title: 'STREET HEAT', ch: 2, pay: 1000, rep: 25, brief: 'Steal the coupe and thread every checkpoint across town.', stages: [{ kind: 'steal', car: 'coupe', x: -48, z: 40, text: 'Take the coupe by Palm Park' }, { kind: 'race', text: 'Hit every checkpoint across town' }] },
  { title: 'DOC RUN', ch: 2, pay: 1400, rep: 30, brief: 'Clinic pickup, Fort Sol drop — the meds ride with you.', stages: [{ kind: 'goto', x: -104, z: -6, text: 'Meet the doctor at Bay Clinic' }, { kind: 'goto', x: 186, z: -44, text: 'Carry the meds to Fort Sol' }] },
  { title: 'HARBOUR HAUL', ch: 3, pay: 2200, rep: 35, brief: 'Haul the marina truck all the way to Bay Airport.', stages: [{ kind: 'steal', car: 'truck', x: 150, z: 118, text: 'Take the truck at the marina' }, { kind: 'deliver', x: -180, z: 96, text: 'Haul it to Bay Airport' }] },
  { title: 'BAY DAY', ch: 3, pay: 3500, rep: 50, brief: 'The finale: a party van, a beach party, the whole bay watching.', stages: [{ kind: 'steal', car: 'van', x: 104, z: 74, text: 'Take the party van on Ocean Ave' }, { kind: 'deliver', x: -60, z: 178, text: 'Deliver it to the beach party' }] },
];
const RACE_POINTS = [[45, -10], [90, 35], [45, 80], [0, 125], [-45, 80], [-90, 35]];
export function createMissions(G) {
  const save = G.save;
  const m = {
    jobIdx: Math.min(JOBS.length, Math.max(0, save.jobsDone | 0)), // B-1: restore, clamped
    stageIdx: 0, jobCar: null, hasCase: false, raceIdx: -1, raceT: 0,
    courier: null, stuntCount: 0, giver: null,
  };
  const marinaFig = buildFigure({ skin: 0xb97a4e, shirt: 0xf2e14c, pants: 0x2ea8a0, shoes: 0xf2f2f2, hair: 0x14100c, dress: true, accent: 0xf2e14c });
  marinaFig.group.position.set(30, groundY(30, 176), 176);
  G.scene.add(marinaFig.group);
  m.giver = marinaFig;
  function stage() { const j = JOBS[m.jobIdx]; return j ? j.stages[m.stageIdx] : null; }
  function spawnJobCar(st) {
    if (m.jobCar) return;
    const car = createVehicle(G, st.car, st.x, st.z, Math.PI / 2, st.car === 'sport' ? 0xd8232a : undefined);
    car.dur.isJobCar = true; // B-2: a wrecked job car must never soft-lock the story
    m.jobCar = car;
  }
  function activateJob() {
    const j = JOBS[m.jobIdx];
    if (!j) { G.hud.setObjective('Free roam — Palmera Bay is yours'); return; }
    m.stageIdx = 0; m.hasCase = false;
    const st = stage();
    if (st && st.car) spawnJobCar(st);
    G.hud.dialogue('MARINA SOL', [
      `Job ${m.jobIdx + 1} of ${JOBS.length}: ${j.title}.`,
      st ? st.text + '.' : '',
      `Pays $${j.pay} and earns the bay's respect.`,
    ]);
    refreshObjective();
  }
  function refreshObjective() {
    const j = JOBS[m.jobIdx], st = stage();
    if (!j) { G.hud.setObjective('Free roam — Palmera Bay is yours'); G.beaconTarget = null; return; }
    G.hud.setObjective(`${j.title} — ${st.text}`);
    G.beaconTarget = st && st.x !== undefined ? { x: st.x, z: st.z } : (m.jobCar ? { x: m.jobCar.x, z: m.jobCar.z } : null);
    if (st && st.kind === 'race') G.beaconTarget = { x: RACE_POINTS[m.raceIdx < 0 ? 0 : m.raceIdx][0], z: RACE_POINTS[m.raceIdx < 0 ? 0 : m.raceIdx][1] };
  }
  function completeStage() {
    const j = JOBS[m.jobIdx];
    m.stageIdx++;
    if (m.stageIdx >= j.stages.length) { completeJob(); return; }
    const st = stage();
    if (st.car) spawnJobCar(st);
    if (st.kind === 'race') { m.raceIdx = 0; m.raceT = 0; }
    refreshObjective();
  }
  function completeJob() {
    const j = JOBS[m.jobIdx];
    save.cash += j.pay; save.respect += j.rep;
    save.jobsDone = Math.max(save.jobsDone, m.jobIdx + 1);
    const dist = districtAt(G.player.x, G.player.z);
    save.standing[dist] = Math.min(100, (save.standing[dist] || 0) + 12);
    storeSave(save);
    G.audio.cash(); G.audio.sting(true);
    G.hud.toast(`JOB DONE — ${j.title} · +$${j.pay} · +${j.rep} RESPECT`);
    G.player.hp = 100;
    m.jobCar = null;
    m.jobIdx++;
    if (m.jobIdx >= JOBS.length) { G.hud.dialogue('MARINA SOL', ['That was the last of it, Rio.', 'Palmera Bay runs on your name now. Free roam — enjoy it.']); G.hud.setObjective('Free roam — Palmera Bay is yours'); G.beaconTarget = null; }
    else activateJob();
  }
  G.onEnterCar = (car) => {
    const st = stage();
    if (st && st.kind === 'steal' && car === m.jobCar) {
      if (m.jobIdx === 1) G.addHeat(200, car.x, car.z); // Hot Goods pickup is scripted hot
      completeStage();
    }
  };
  G.onStunt = () => { m.stuntCount++; save.cash += 25; G.hud.toast(`STUNT JUMP ${m.stuntCount} — +$25`); G.audio.cash(); };
  G.onBusted = (kind) => {
    G.police.heat = 0;
    const fine = Math.min(save.cash, kind === 'BUSTED' ? 100 : Math.floor(save.cash * 0.1));
    save.cash -= fine; storeSave(save);
    const p = G.player;
    if (p.car) p.eject();
    p.hp = 100; p.x = -104; p.z = -4; p.y = groundY(p.x, p.z);
    G.hud.toast(kind === 'BUSTED' ? `BUSTED — fined $${fine}` : `WASTED — the clinic patched you up, $${fine}`);
    G.audio.sting(false);
  };
  G.onExplosion = () => { G.addHeat(120, G.player.x, G.player.z); };
  // side systems ------------------------------------------------------------
  const GARAGE = { x: 96, z: 118 }, SELL = { x: LOCKUP.x, z: LOCKUP.z + 8 }, COURIER_SPOT = { x: -26, z: 172 };
  G.landmarks = { garage: GARAGE, lockup: LOCKUP }; // pause-map icons read these
  function near(x, z, d) { return Math.hypot(G.player.x - x, G.player.z - z) < d; }
  m.update = (dt) => {
    poseFigure(marinaFig, 'idle', dt);
    const p = G.player, st = stage();
    // shells
    G.shellSpots.forEach((s, i) => {
      if (s.taken || save.shells.includes(i)) { s.mesh.visible = false; s.taken = true; return; }
      s.mesh.rotation.y += dt * 1.5;
      if (Math.hypot(p.x - s.x, p.z - s.z) < 1.8) {
        s.taken = true; s.mesh.visible = false; save.shells.push(i); save.cash += 100; storeSave(save);
        G.hud.toast(`GOLDEN SHELL ${save.shells.length}/15 — +$100`); G.audio.cash();
      }
    });
    // story stages
    if (st && G.started && !G.paused) {
      if (st.kind === 'goto' || st.kind === 'grab') {
        if (near(st.x, st.z, 3.2)) {
          if (st.kind === 'grab') { m.hasCase = true; G.addHeat(300, p.x, p.z); G.hud.toast('CASE TAKEN — EVERYONE SAW THAT'); }
          completeStage();
        }
      } else if (st.kind === 'deliver') {
        if (p.car === m.jobCar && near(st.x, st.z, 6)) { p.eject(); m.jobCar = null; completeStage(); }
      } else if (st.kind === 'lose') {
        if (G.police.stars === 0) completeStage();
      } else if (st.kind === 'race' && m.raceIdx >= 0) {
        m.raceT += dt;
        const [rx, rz] = RACE_POINTS[m.raceIdx];
        G.beaconTarget = { x: rx, z: rz };
        if (Math.hypot(p.x - rx, p.z - rz) < 8) {
          m.raceIdx++; G.audio.cash();
          if (m.raceIdx >= RACE_POINTS.length) {
            const t = Math.round(m.raceT);
            if (!save.bestRace.heat || t < save.bestRace.heat) save.bestRace.heat = t;
            storeSave(save); m.raceIdx = -1; completeStage();
          } else refreshObjective();
        }
      }
    }
    // interactions (E is enter/exit in player; these use T to avoid clashes)
    const pressT = G.input.pressed['KeyT'];
    if (pressT && !p.car && near(GARAGE.x, GARAGE.z, 5)) {
      const g = save.garage;
      if (g.engine < 3 && save.cash >= 500) { save.cash -= 500; g.engine++; G.hud.toast(`ENGINE UPGRADE Lv${g.engine}`); }
      else if (g.armour < 3 && save.cash >= 500) { save.cash -= 500; g.armour++; G.hud.toast(`ARMOUR UPGRADE Lv${g.armour}`); }
      else if (!g.nitro && save.cash >= 800) { save.cash -= 800; g.nitro = true; G.hud.toast('NITRO FITTED — HOLD SHIFT IN A CAR'); }
      else G.hud.toast('GARAGE: NOTHING TO BUY (NEED $500+)');
      storeSave(save); G.audio.cash();
    }
    if (pressT && !p.car && near(G.safehouse.x, G.safehouse.z, 5)) {
      if (!save.safehouse) {
        if (save.cash >= 2500) { save.cash -= 2500; save.safehouse = true; G.hud.toast('SAFEHOUSE BOUGHT'); storeSave(save); }
        else G.hud.toast('SAFEHOUSE — $2,500');
      } else {
        p.hp = 100; p.armour = 100; save.day++; G.clock.minutes = 8 * 60;
        if (G.police.stars <= 2) G.police.heat = 0;
        storeSave(save); G.hud.toast(`RESTED — DAY ${save.day} BEGINS`);
      }
    }
    if (pressT && p.car && near(SELL.x, SELL.z, 7) && p.car !== m.jobCar) {
      const car = p.car, value = 120 + Math.floor(car.spec.hp * (car.dur.hp / car.dur.maxHp));
      p.eject(); G.scene.remove(car.mesh); G.cars.splice(G.cars.indexOf(car), 1);
      save.cash += value; storeSave(save); G.hud.toast(`CAR SOLD — +$${value}`); G.audio.cash();
    }
    if (pressT && !p.car && near(COURIER_SPOT.x, COURIER_SPOT.z, 4) && !m.courier) {
      const targets = [[80, 170], [-90, 40], [50, -14], [150, 140]];
      const t = targets[Math.floor(Math.random() * targets.length)];
      m.courier = { x: t[0], z: t[1], t: 55 };
      G.hud.toast('COURIER RUN — DELIVER FAST (WATCH THE BEACON)');
    }
    if (m.courier) {
      m.courier.t -= dt;
      G.beaconTarget = { x: m.courier.x, z: m.courier.z };
      if (near(m.courier.x, m.courier.z, 4)) {
        const pay = 60 + Math.floor(m.courier.t * 2);
        save.cash += pay; storeSave(save); G.hud.toast(`DELIVERED — +$${pay}`); G.audio.cash(); m.courier = null; refreshObjective();
      } else if (m.courier.t <= 0) { G.hud.toast('DELIVERY FAILED — TOO SLOW'); m.courier = null; refreshObjective(); }
    }
    // contextual prompt line
    if (!p.car && near(GARAGE.x, GARAGE.z, 5)) G.hud.setPrompt('T — PALMERA MOTORS: upgrades');
    else if (!p.car && near(G.safehouse.x, G.safehouse.z, 5)) G.hud.setPrompt(save.safehouse ? 'T — rest at the safehouse' : 'T — buy the safehouse ($2,500)');
    else if (!p.car && near(COURIER_SPOT.x, COURIER_SPOT.z, 4) && !m.courier) G.hud.setPrompt('T — courier run (KAVA COFFEE)');
    else if (p.car && near(SELL.x, SELL.z, 7) && p.car !== m.jobCar) G.hud.setPrompt('T — sell this car at the lockup');
    else if (!p.car && p.nearestCar()) G.hud.setPrompt('E — enter vehicle');
    else G.hud.setPrompt('');
  };
  m.activate = activateJob;
  m.refreshObjective = refreshObjective;
  m.jobsState = () => JOBS.map((j, i) => ({ title: j.title, ch: j.ch, pay: j.pay, stages: j.stages.length, brief: j.brief, state: i < m.jobIdx ? 'done' : i === m.jobIdx ? 'current' : 'locked' }));
  return m;
}
