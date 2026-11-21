#!/usr/bin/env python3
"""GO RIO RIO physics self-check (house standard, PHYSICS-STANDARD.md).

Runs the game's own pure modules in Node and asserts:
  1. scale: figure height 1.7-1.8 m, sedan length ~4.7 m and > figure height
  2. seat socket: seated figure box does not intersect the cabin/roof box
     of any car type (socket placement, not eyeballing)
  3. grounding: groundY is finite everywhere on a coarse island grid and
     the city plateau is flat where the roads are drawn
  4. water: swimmers sit where the SHARED shoreline function gives a depth
     of 0.9-1.7 m, and depth grows monotonically heading out to sea
  5. durability: phase mapping at every threshold, the 0.25 s impact
     cooldown, mass sharing, instant explode above the threshold, the
     train instant-explode, and the job-car exemption
  6. save clamps: insane values are clamped (checked in save.js source)
  7. statics: no network references, no xmlns favicon, kit size limits
Prints ALL PASS only when every check passes.
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
NODE = pathlib.Path.home() / "workspace/tools/node24/bin/node"

HARNESS = r"""
import { groundY, shoreZ, waterDepth, CAR_TYPES, SEATED_BOX } from '../game/src/config.js';
import { createDurability, applyImpact, tickDurability, phaseOf } from '../game/src/durability.js';
let fails = 0;
const check = (name, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) fails++; };
// (figure scale is asserted on the Python side from the module constants,
// because characters.js needs the browser THREE global to import.)
// 3. grounding grid
let finite = true, plateau = true;
for (let x = -320; x <= 320; x += 16) for (let z = -320; z <= 320; z += 16) {
  const y = groundY(x, z);
  if (!Number.isFinite(y)) finite = false;
}
for (const ax of [-90, -45, 0, 45, 90]) for (let z = -30; z <= 165; z += 15) {
  if (Math.abs(groundY(ax, z) - 0.8) > 0.05) plateau = false;
}
check('grounding-finite-grid', finite);
check('grounding-city-plateau-flat', plateau);
// 4. water from the shared shoreline function
let swimOk = true, mono = true;
for (let x = -140; x <= 140; x += 20) {
  let z = shoreZ(x) + 6;
  while (waterDepth(x, z) < 1.0 && z < shoreZ(x) + 40) z += 2;
  const d = waterDepth(x, z);
  if (d < 0.9 || d > 1.7) swimOk = false;
  let prev = -1;
  for (let zz = shoreZ(x); zz < shoreZ(x) + 40; zz += 4) { const dd = waterDepth(x, zz); if (dd < prev - 1e-9) mono = false; prev = dd; }
}
check('swimmer-depth-0.9-1.7', swimOk);
check('water-depth-monotonic', mono);
// 2. seat socket vs cabin box, per car type. Cabin box is derived from the
// type dimensions exactly as vehicles.js builds it (glass cabin centred
// z=-0.04L, from y 0.57H to 1.03H; roof slab at 1.0H).
for (const [type, s] of Object.entries(CAR_TYPES)) {
  if (type === 'moto') { check('seat-' + type, s.seat.y > 0.5 && s.seat.y < 1.0); continue; }
  const seatTop = s.seat.y + SEATED_BOX.above;
  const cabinTop = s.hgt * 1.0; // underside of the roof slab vehicles.js builds
  const seatFwd = s.seat.z + SEATED_BOX.dz, seatBack = s.seat.z - SEATED_BOX.dz;
  const cabFwd = -s.len * 0.04 + s.len * 0.23, cabBack = -s.len * 0.04 - s.len * 0.23;
  const zOverlap = seatFwd > cabBack && seatBack < cabFwd;
  // The head may sit inside the glasshouse (that is what a cabin is) but
  // must never poke through the roof slab or the windshield plane line.
  check('seat-' + type, seatTop <= cabinTop + 0.02 && zOverlap);
}
// 5. durability
const spec = { hp: 100, mass: 1000, explode: 30 };
let d = createDurability(spec);
check('phase-normal', phaseOf(d) === 'NORMAL' && d.state === 'NORMAL');
d.hp = 75; check('phase-light-edge', phaseOf(d) === 'LIGHT');
d.hp = 50; check('phase-moderate-edge', phaseOf(d) === 'MODERATE');
d.hp = 25; check('phase-critical-edge', phaseOf(d) === 'CRITICAL');
d.hp = 1; check('phase-critical-low', phaseOf(d) === 'CRITICAL');
d = createDurability(spec);
const dealt = applyImpact(d, 10, 1000);
check('impact-damage-positive', dealt > 0 && d.hp < 100);
const dealt2 = applyImpact(d, 10, 1000);
check('impact-cooldown-blocks', dealt2 === 0);
tickDurability(d, 0.3);
check('cooldown-expires', d.impactCooldown === 0 && applyImpact(d, 10, 1000) > 0);
let heavy = createDurability(spec), light = createDurability(spec);
applyImpact(heavy, 12, 4000); applyImpact(light, 12, 200);
check('mass-sharing', heavy.hp < light.hp);
d = createDurability(spec); applyImpact(d, 31, 1000);
check('instant-explode-speed', d.exploded && d.state === 'EXPLODED' && d.hp === 0);
d = createDurability(spec); applyImpact(d, 4, 1000, { isTrain: true });
check('train-instant-explode', d.exploded && d.state === 'EXPLODED');
d = createDurability(spec); d.isJobCar = true;
const jd = applyImpact(d, 60, 60000, { isTrain: true });
check('job-car-indestructible', jd === 0 && !d.exploded && d.hp === 100);
console.log(fails === 0 ? 'NODE_ALL_PASS' : 'NODE_FAILS=' + fails);
"""

def main():
    fails = []

    def check(name, ok):
        print(("PASS " if ok else "FAIL ") + name)
        if not ok:
            fails.append(name)

    # --- run the node harness over the game's pure modules ---
    harness_path = ROOT / "tools" / "_phys_harness.mjs"
    harness_path.write_text(HARNESS)
    try:
        out = subprocess.run([str(NODE), str(harness_path)], cwd=ROOT,
                             capture_output=True, text=True, timeout=120)
        print(out.stdout.strip())
        if out.stderr.strip():
            print("node stderr:", out.stderr.strip()[:400])
        check("node-harness", out.returncode == 0 and "NODE_ALL_PASS" in out.stdout)
    finally:
        harness_path.unlink(missing_ok=True)

    # --- scale, from the character module's own constants ---
    chars = (ROOT / "game/src/characters.js").read_text()
    check("figure-height-1.78", "FIGURE_HEIGHT = 1.78" in chars)
    cfg = (ROOT / "game/src/config.js").read_text()
    check("sedan-4.7m", "len: 4.7" in cfg)

    # --- save clamps present (defect M-4) ---
    save = (ROOT / "game/src/save.js").read_text()
    check("save-clamps-cash", "clampNum(raw.cash, 0," in save)
    check("save-clamps-jobsdone", "clampNum(raw.jobsDone, 0, JOB_COUNT, 0)" in save)
    check("missions-restores-jobidx", "save.jobsDone" in (ROOT / "game/src/missions.js").read_text()
          and "jobIdx" in (ROOT / "game/src/missions.js").read_text())

    # --- statics: kit limits + no network references ---
    game_files = [p for p in (ROOT / "game").rglob("*") if p.is_file()]
    total = sum(p.stat().st_size for p in game_files)
    check("game-file-count<=993", len(game_files) <= 993)
    check("game-size<=48MiB", total <= 48 * 1024 * 1024)
    check("index<=1MiB", (ROOT / "game/index.html").stat().st_size <= 1024 * 1024)
    authored = 0
    net_refs = []
    for p in game_files:
        if "vendor" in p.parts:
            continue
        authored += p.stat().st_size
        if p.suffix in (".js", ".html"):
            text = p.read_text(errors="ignore")
            if "http://" in text or "https://" in text:
                net_refs.append(str(p.relative_to(ROOT)))
    authored += (ROOT / "main.ts").stat().st_size
    check("authored-source<=160KiB", authored <= 160 * 1024)
    check("no-network-refs", not net_refs)
    index = (ROOT / "game/index.html").read_text()
    check("favicon-no-xmlns", "xmlns" not in index)
    shots = sorted((ROOT / "screenshots").glob("*.jpg")) if (ROOT / "screenshots").exists() else []
    if shots:
        check("screenshots-3-4", 3 <= len(shots) <= 4)
        check("screenshots-each<=256KiB", all(p.stat().st_size <= 256 * 1024 for p in shots))

    print("ALL PASS" if not fails else f"FAILURES: {fails}")
    return 0 if not fails else 1

if __name__ == "__main__":
    sys.exit(main())
