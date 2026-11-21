// localStorage save. EVERY value is clamped and validated on load
// (defect M-4: a hand-edited or corrupted save must never produce
// negative cash, day 0, or a story index past the last job).
const KEY = 'go-rio-rio-save-v1';
export const JOB_COUNT = 8;
function clampNum(v, lo, hi, fallback) {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(hi, Math.max(lo, n));
}
export function defaultSave() {
  return {
    cash: 120, respect: 0, day: 1, jobsDone: 0,
    weapons: { pistol: true, smg: false, rifle: false },
    ammo: { pistol: 96, smg: 0, rifle: 0 },
    shells: [], bestRace: {}, safehouse: false,
    garage: { engine: 0, armour: 0, nitro: false },
    standing: {},
  };
}
export function loadSave() {
  const d = defaultSave();
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { raw = null; }
  if (!raw || typeof raw !== 'object') return d;
  d.cash = Math.floor(clampNum(raw.cash, 0, 9999999, d.cash));
  d.respect = Math.floor(clampNum(raw.respect, 0, 99999, 0));
  d.day = Math.floor(clampNum(raw.day, 1, 9999, 1));
  d.jobsDone = Math.floor(clampNum(raw.jobsDone, 0, JOB_COUNT, 0));
  if (raw.weapons && typeof raw.weapons === 'object') {
    d.weapons.smg = raw.weapons.smg === true;
    d.weapons.rifle = raw.weapons.rifle === true;
  }
  if (raw.ammo && typeof raw.ammo === 'object') {
    for (const k of ['pistol', 'smg', 'rifle']) d.ammo[k] = Math.floor(clampNum(raw.ammo[k], 0, 9999, d.ammo[k] || 0));
  }
  if (Array.isArray(raw.shells)) d.shells = raw.shells.filter((n) => Number.isInteger(n) && n >= 0 && n < 15);
  if (raw.bestRace && typeof raw.bestRace === 'object') {
    for (const k of Object.keys(raw.bestRace)) {
      const v = clampNum(raw.bestRace[k], 1, 3600, 0);
      if (v > 0) d.bestRace[k] = v;
    }
  }
  d.safehouse = raw.safehouse === true;
  if (raw.garage && typeof raw.garage === 'object') {
    d.garage.engine = Math.floor(clampNum(raw.garage.engine, 0, 3, 0));
    d.garage.armour = Math.floor(clampNum(raw.garage.armour, 0, 3, 0));
    d.garage.nitro = raw.garage.nitro === true;
  }
  if (raw.standing && typeof raw.standing === 'object') {
    for (const k of Object.keys(raw.standing)) d.standing[k] = clampNum(raw.standing[k], 0, 100, 0);
  }
  return d;
}
export function storeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* private mode */ }
}
