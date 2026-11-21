# GO RIO RIO

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/kunkuro30/palmera-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/kunkuro30/palmera-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Play / bounty page:** https://make.fun/bounty/gta6-01

GO RIO RIO is a living open-world beach-city crime game for the make.fun
**gta6-01** bounty ("Make GTA 6"), rebuilt from scratch as a single static
web page (Three.js vendored locally, no network requests). Welcome to
Palmera Bay: a whole island in warm late-afternoon light — a downtown grid
with sidewalks, crosswalks and working traffic lights; an Ocean Drive row
of nine named shops (FRESH FISH, TACKLE & BAIT, DONUT BAY, KAVA COFFEE,
SCOOPS, CANDY CLOUD, JUICE PALM, MINI MART 24, BAY GIFTS), each with its
own keeper; a crowded beach with a wooden pier, a giant lifeguard statue,
umbrellas, volleyball and swimmers who are actually in the water; a
spinning ferris wheel and carousel; a palm park; Bay Clinic, the police
station and Fire Station 7; Bay Airport with its tower and jets; Fort Sol
garrison in the east; and a textured, tree-scattered mountain with a
snowy cap in the north hills. A train runs a full loop around the island —
do not park on the tracks.

You are Rio (orange jacket, red shoes), built — like every citizen — on a
full joint rig (pelvis, spine, neck, elbows, knees) with tapered limbs and
per-part materials, so aiming twists the torso and raises the support arm.
Play it as a third-person shooter: hold right mouse to aim over the
shoulder, click to fire. Work 8 story jobs in 3 chapters for Marina Sol,
with portrait dialogue, a 1–5 star wanted system (roadblocks from 3 stars,
a helicopter with a spotlight from 4), RESPECT and district standing,
street races, courier runs, car sales, garage upgrades, a buyable
safehouse and 15 golden shells. Story progress is restored from your save
on every visit.

Every vehicle runs a five-phase durability system (NORMAL, LIGHT,
MODERATE, CRITICAL, EXPLODED): impacts are priced from closing speed and
mass behind a 0.25 s cooldown, critical cars smoke, burn and limp, hard
impacts — and any meeting with the train — are instantly lethal, and a
wreck explodes with camera shake, a blackened body, an ejected driver and
chain damage to its neighbours. The HUD shows the phase chip while you
drive. Job cars are armoured: the story can never soft-lock on a wreck.

## Play

```sh
node serve.ts          # then open the local address it prints
```

WASD move · SHIFT run · E enter/exit car · hold RIGHT MOUSE to aim ·
LEFT MOUSE fire · 1–4/Q/wheel weapons · R reload · T interact · C radio ·
P pause (map / missions / stats / controls) · M mute.

## Layout

- `game/` — the game itself (static, offline; three.js vendored under `game/vendor/`)
- `game/src/` — one module per job: `world`, `characters`, `vehicles`,
  `durability`, `pedestrians`, `police`, `missions`, `weapons`, `player`,
  `hud`, `audio`, `fx`, `input`, `save`, `config`, `shots`, `main`
- `tools/physics_check.py` — the house physics self-check (scale, seat
  sockets, grounding, swimmer depth, durability phases): prints ALL PASS
- `tools/capture.py` — the screenshot pipeline (Playwright + Chrome)
- `screenshots/` — the four judged scenes (chase cover, beach, city, mission)
- `main.ts` — hands the entry in: copies `game/` + `screenshots/` to the
  output and writes the dossier

## License

MIT — see `LICENSE`.
