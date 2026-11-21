

export const PHASES = ['NORMAL', 'LIGHT', 'MODERATE', 'CRITICAL', 'EXPLODED'];
export const PHASE_COLORS = { NORMAL: '#37d67a', LIGHT: '#ffd23e', MODERATE: '#ff9f2e', CRITICAL: '#ff4b2e', EXPLODED: '#555555' };
export function phaseOf(d) {
 if (!d || d.hp <= 0 || d.exploded) return 'EXPLODED';
 const f = d.hp / d.maxHp;
 if (f > 0.75) return 'NORMAL';
 if (f > 0.5) return 'LIGHT';
 if (f > 0.25) return 'MODERATE';
 return 'CRITICAL';
}
export function createDurability(spec) {
 const d = {
  hp: spec.hp, maxHp: spec.hp, mass: spec.mass,
  instantExplodeSpeed: spec.explode, impactCooldown: 0,
  exploded: false, state: 'NORMAL', isJobCar: false,
 };
 d.state = phaseOf(d);
 return d;
}

export function applyImpact(d, relSpeed, otherMass, opts = {}) {
 if (!d || d.exploded) return 0;
 if (d.isJobCar) return 0;
 if (opts.isTrain) {
  d.hp = 0; d.exploded = true; d.state = 'EXPLODED';
  return d.maxHp;
 }
 if (d.impactCooldown > 0) return 0;
 if (relSpeed >= d.instantExplodeSpeed) {
  d.hp = 0; d.exploded = true; d.state = 'EXPLODED';
  d.impactCooldown = 0.25;
  return d.maxHp;
 }
 const share = otherMass / (otherMass + d.mass);
 const dmg = Math.max(0, (relSpeed - 3)) * 2.4 * share;
 if (dmg <= 0) return 0;
 d.hp = Math.max(0, d.hp - dmg);
 d.impactCooldown = 0.25;
 if (d.hp <= 0) d.exploded = true;
 d.state = phaseOf(d);
 return dmg;
}
export function tickDurability(d, dt) {
 if (d && d.impactCooldown > 0) d.impactCooldown = Math.max(0, d.impactCooldown - dt);
}

export function powerFactor(d) {
 const s = d ? d.state : 'NORMAL';
 if (s === 'CRITICAL') return 0.55;
 if (s === 'MODERATE') return 0.8;
 if (s === 'EXPLODED') return 0;
 return 1;
}
