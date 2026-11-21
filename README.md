# GO RIO RIO

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/kunkuro30/go-rio-rio/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/kunkuro30/go-rio-rio/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Bounty page:** [make.fun/bounty/gta6-01](https://make.fun/bounty/gta6-01)

An open-world crime game that runs in the browser, written for the
make.fun **gta6-01** bounty ("Make GTA 6"). Everything ships as static
files — three.js is vendored in the repo, the game asks for nothing from
the network, and your progress autosaves in localStorage.

## The place: Palmera Bay

A sunlit island city in warm late-afternoon light. Downtown is a dense
grid of towers, sidewalks, crosswalks and traffic lights that actually
cycle. Along Ocean Drive, nine named shops — FRESH FISH, TACKLE & BAIT,
DONUT BAY, KAVA COFFEE, SCOOPS, CANDY CLOUD, JUICE PALM, MINI MART 24
and BAY GIFTS — each keep a keeper in a matching outfit who minds the
front of the store. The beach is busy: a wooden pier, a giant lifeguard
statue, umbrellas and towels, a volleyball game, swimmers floating in
the water rather than on it, plus a ferris wheel and a carousel turning
beside the boardwalk. Further round the island you will find a palm
park, Bay Clinic, the police station, Fire Station 7, Bay Airport with
its tower, the Fort Sol garrison, and northern hills that rise to a
textured mountain with trees on its slopes and snow at the top. A train
circles the whole island on its own loop line — treat the crossings
with respect.

## The life

You play Rio — orange jacket, red shoes — a fully jointed figure
(pelvis, spine, neck, shoulders, elbows, knees) assembled from tapered
limbs with a different material for skin, cloth, trousers and shoes.
Every pedestrian shares that rig, so when Rio aims, his torso twists,
his gun arm tracks the camera's pitch and his support arm comes up.

Marina Sol hands out **8 story jobs across 3 chapters**, told through
portrait dialogue. Finishing them — and everything else — is tracked in
your save, and the story picks up from your saved job count when you
come back; it never silently restarts. Around the story sit street
races, courier runs, car sales, garage upgrades, a safehouse you can
buy, and 15 golden shells hidden round the bay.

Trouble is priced by a **1–5 star wanted system**: cruisers hunt you,
roadblocks close avenues from 3 stars, and from 4 stars a helicopter
holds a spotlight on you. Officers get out and come after you on foot.

## Cars that remember being hit

Each vehicle carries a **five-phase durability** state — NORMAL, LIGHT,
MODERATE, CRITICAL, EXPLODED. A collision is scored from closing speed
and mass, with a 0.25-second cooldown so one crash cannot bill you
twice. Light damage dents; moderate damage smokes; critical damage
smokes hard, flickers with fire and saps the engine. A truly hard
impact skips the phases entirely, and so does the train: anything it
touches explodes on the spot. An exploded car flashes, shakes the
camera, burns black, throws its driver out and can set its neighbours
off in a chain. While you drive, the HUD shows a colour-coded phase
chip next to the vehicle's health. One exception: job cars are
armoured and cannot be wrecked, so a story job can never dead-end on a
burnt-out car.

## Running it

Serve the `game/` folder with anything static and open it in a desktop
browser. The repo's own server is the shortest path:

```sh
node serve.ts
```

It prints the local address to open. Any other static file server
pointed at `game/` works just as well — there is no build step.

**Controls** — WASD move · SHIFT run · E get in / out of a car · hold
RIGHT MOUSE to aim over the shoulder · LEFT MOUSE to fire · 1–4, Q or
the mouse wheel to swap weapons · R reload · T interact · C car radio ·
P pause (map, missions, stats, controls) · M mute.

## What is in the repo

- `game/` — the game: static and offline, three.js under `game/vendor/`
- `game/src/` — one module per system (`world`, `characters`,
  `vehicles`, `durability`, `pedestrians`, `police`, `missions`,
  `weapons`, `player`, `hud`, `audio`, `fx`, `input`, `save`,
  `config`, `shots`, `main`)
- `screenshots/` — four scenes for the judges: the chase cover, the
  beach, the city, a mission
- `tools/physics_check.py` — a self-check of the house physics rules
  (metre scale, seat sockets, ground queries, swimmer depth, the
  durability phases); it prints ALL PASS
- `tools/capture.py` — the Playwright + Chrome pipeline that staged
  and shot the screenshots
- `main.ts` — the hand-in program: it clears stale output, copies
  `game/` and `screenshots/` into the output directory and writes
  `dossier.json` through the vendored make.fun library

## License

MIT — the full text is in `LICENSE`.
