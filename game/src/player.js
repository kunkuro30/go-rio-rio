// The player: Rio on foot (walk / sprint / swim), in a car (seat-socket
const THREE = window.THREE;
import { TUNING, groundY, waterDepth, isWater, WORLD } from './config.js';
import { buildFigure, poseFigure } from './characters.js';
import { carHitsBuilding, damageCar } from './vehicles.js';
import { powerFactor } from './durability.js';
export function createPlayer(G) {
  const fig = buildFigure({ skin: 0xd9a37e, shirt: 0xe8762c, pants: 0x2e4a7a, shoes: 0xd8342c, hair: 0x201409, accent: 0xe8762c });
  G.scene.add(fig.group);
  const p = {
    fig, x: 6, z: 148, y: 0, vy: 0, angle: Math.PI, hp: 100, armour: 0,
    car: null, swimming: false, airborne: false, speed: 0, bustTimer: 0,
    eject() {
      if (!p.car) return;
      const c = p.car; p.car = null;
      p.x = c.x + Math.cos(c.angle) * 2.4; p.z = c.z - Math.sin(c.angle) * 2.4;
      p.y = groundY(p.x, p.z);
      fig.group.visible = true;
      G.audio.engine(false);
    },
    hurt(dmg) {
      if (p.armour > 0) { const absorbed = Math.min(p.armour, dmg * 0.7); p.armour -= absorbed; dmg -= absorbed; }
      p.hp -= dmg;
      if (p.hp <= 0) { p.hp = 0; G.onBusted('WASTED'); }
    },
  };
  p.y = groundY(p.x, p.z);
  fig.group.position.set(p.x, p.y, p.z);
  G.player = p;
  function nearestCar() {
    let best = null, bd = 3.4;
    for (const car of G.cars) {
      if (car.wrecked) continue;
      const d = Math.hypot(car.x - p.x, car.z - p.z);
      if (d < bd) { bd = d; best = car; }
    }
    return best;
  }
  p.nearestCar = nearestCar;
  p.enterCar = (car) => {
    p.car = car;
    car.driverFig = fig;
    if (car.traffic) { car.traffic = null; G.addHeat(60, p.x, p.z); G.hud.toast('VEHICLE TAKEN'); }
    G.audio.engine(true, 0);
    G.onEnterCar(car);
  };
  p.update = (dt) => {
    const inp = G.input;
    if (p.car) {
      fig.blob.visible = false; // seated: no ground shadow inside the cabin
      const car = p.car, spec = car.spec;
      const up = inp.down('KeyW') || inp.down('ArrowUp'), dn = inp.down('KeyS') || inp.down('ArrowDown');
      const lf = inp.down('KeyA') || inp.down('ArrowLeft'), rt = inp.down('KeyD') || inp.down('ArrowRight');
      const boost = G.save.garage.nitro && inp.down('ShiftLeft') ? 1.35 : 1;
      const pf = powerFactor(car.dur) * (1 + G.save.garage.engine * 0.07) * boost;
      if (up) car.speed += spec.accel * pf * dt;
      if (dn) car.speed -= (car.speed > 0.5 ? 22 : 7) * dt;
      car.speed -= car.speed * 0.55 * dt;
      const maxF = spec.max * pf * boost, maxR = -8;
      car.speed = Math.max(maxR, Math.min(maxF, car.speed));
      if (Math.abs(car.speed) > 0.2) {
        const steer = (lf ? 1 : 0) - (rt ? 1 : 0);
        car.angle += steer * dt * 1.55 * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 9);
      }
      let nx = car.x + Math.sin(car.angle) * car.speed * dt;
      let nz = car.z + Math.cos(car.angle) * car.speed * dt;
      if (!p.airborne) {
        for (const r of G.ramps) if (Math.hypot(nx - r.x, nz - r.z) < 3.4 && Math.abs(car.speed) > 11) { p.airborne = true; p.vy = 6.4; G.onStunt(); break; }
      }
      const hit = carHitsBuilding(G, car, nx, nz, car.angle);
      if (hit) {
        const impact = Math.abs(car.speed);
        if (impact > 4) damageCar(G, car, impact, 4200);
        car.speed = -car.speed * 0.25;
        nx = car.x; nz = car.z;
      }
      for (const other of G.cars) {
        if (other === car) continue;
        const d = Math.hypot(other.x - nx, other.z - nz);
        if (d < (car.spec.len + other.spec.len) * 0.32) {
          const rel = Math.abs(car.speed - (other.speed || 0)) + 2;
          damageCar(G, car, rel, other.spec.mass);
          damageCar(G, other, rel, car.spec.mass);
          car.speed *= 0.45; nx = car.x; nz = car.z;
          break;
        }
      }
      car.x = nx; car.z = nz;
      car.mesh.position.set(car.x, groundY(car.x, car.z) + (p.airborne ? Math.max(0, p.y - groundY(car.x, car.z)) : 0), car.z);
      car.mesh.rotation.y = car.angle;
      if (p.airborne) {
        p.vy -= 15 * dt; p.y += p.vy * dt;
        const gy = groundY(car.x, car.z);
        car.mesh.position.y = Math.max(gy, p.y);
        if (p.y <= gy) { p.y = gy; p.airborne = false; damageCar(G, car, Math.abs(p.vy) * 0.7, 4200); }
      } else p.y = groundY(car.x, car.z);
      const s = spec.seat;
      const sx = car.x + Math.cos(car.angle) * s.x + Math.sin(car.angle) * s.z;
      const sz = car.z - Math.sin(car.angle) * s.x + Math.cos(car.angle) * s.z;
      fig.group.position.set(sx, car.mesh.position.y + s.y - 0.55, sz);
      fig.group.rotation.y = car.angle;
      poseFigure(fig, 'sit', dt);
      p.x = car.x; p.z = car.z; p.speed = Math.abs(car.speed);
      G.audio.engine(true, Math.abs(car.speed) / spec.max);
      if (inp.pressed['KeyE']) { const spd = car.speed; p.eject(); if (Math.abs(spd) < 1) car.speed = 0; }
      return;
    }
    fig.blob.visible = true;
    G.audio.engine(false);
    const fwd = (inp.down('KeyW') || inp.down('ArrowUp') ? 1 : 0) - (inp.down('KeyS') || inp.down('ArrowDown') ? 1 : 0);
    const strafe = (inp.down('KeyD') || inp.down('ArrowRight') ? 1 : 0) - (inp.down('KeyA') || inp.down('ArrowLeft') ? 1 : 0);
    const depth = waterDepth(p.x, p.z);
    p.swimming = depth > 0.95;
    const sprint = inp.down('ShiftLeft') || inp.down('ShiftRight');
    const spd = p.swimming ? TUNING.swim : (sprint ? TUNING.sprint : TUNING.walk);
    const sy = Math.sin(inp.yaw), cy = Math.cos(inp.yaw);
    let mx = (-sy * fwd + cy * strafe), mz = (-cy * fwd - sy * strafe);
    const ml = Math.hypot(mx, mz) || 1;
    const moving = fwd !== 0 || strafe !== 0;
    if (moving) {
      mx = (mx / ml) * spd; mz = (mz / ml) * spd;
      const nx = p.x + mx * dt, nz = p.z + mz * dt;
      let blocked = false;
      for (const c of G.colliders) if (Math.abs(nx - c.x) < c.hx + TUNING.playerRadius && Math.abs(nz - c.z) < c.hz + TUNING.playerRadius) { blocked = true; break; }
      if (!blocked) { p.x = nx; p.z = nz; }
      p.angle = Math.atan2(mx, mz);
      p.speed = spd;
    } else p.speed = 0;
    if (Math.hypot(p.x, p.z) > WORLD.islandRadius || depth > 3.4) {
      p.x = 10; p.z = 178; G.hud.toast('THE TIDE BRINGS YOU BACK TO PALMERA BAY');
    }
    const gy = groundY(p.x, p.z);
    if (p.swimming) {
      p.y += ((0.25 - 1.12) - p.y) * Math.min(1, dt * 5); // float: chest-deep at the surface
      if (moving && Math.random() < dt * 3) G.fx.splash(p.x, 0.3, p.z);
    } else p.y = gy;
    fig.group.position.set(p.x, p.y, p.z);
    fig.group.rotation.y = inp.aiming ? inp.yaw + Math.PI : p.angle;
    poseFigure(fig, p.swimming ? 'swim' : (inp.aiming ? 'aim' : (moving ? 'walk' : 'idle')), dt, p.speed, inp.pitch);
    if (p.hp < 50) p.hp = Math.min(50, p.hp + dt * 2.2); // GTA-style partial regen only
    if (inp.pressed['KeyE']) {
      const car = nearestCar();
      if (car) p.enterCar(car);
    }
  };
  return p;
}
