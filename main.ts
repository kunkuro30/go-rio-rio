// GO RIO RIO — hand-in program for the make.fun gta6-01 bounty.
//
// The game itself is not in this file. It lives in game/ as plain static
// files (an index page plus ES modules and a vendored three.js build) that
// a browser runs fully offline. What this program does is the delivery
// step: it assembles the judge's bundle in the output directory —
//
//   1. wipe any game/ and screenshots/ left over from an earlier bundle,
//      so a stale file can never ride along into this one;
//   2. copy the current game/ tree and the current screenshots/ tree
//      across, counting files and bytes as they go;
//   3. ask the vendored make.fun library to summarise the bundle as
//      dossier.json, passing the scorer's size caps so an oversized
//      entry fails here instead of failing silently at grading time;
//   4. print a short manifest of what was handed in.
//
// Where the bundle lands: /output inside the grader's container, or the
// directory named by MAKEFUN_OUTPUT_DIR anywhere else, e.g.
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// To play the game instead of bundling it, serve game/ with serve.ts.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's ceilings, gathered in one place. buildDossier enforces
// them while it reads the bundle: the source text budget shapes how
// much code the dossier can quote, and the rest refuse a bundle the
// scorer itself would refuse (too many or too heavy screenshots, a
// game tree past its file, byte or path-length limits).
const LIMITS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  game_max_files: 993,
  game_max_bytes: 50_331_648,
  game_path_max_bytes: 1_000,
};

const repoDir = fileURLToPath(new URL('.', import.meta.url));

function outputDir(): string {
  const chosen = process.env.MAKEFUN_OUTPUT_DIR;
  return chosen && chosen.length > 0 ? chosen : '/output';
}

// Walk a copied tree once and total it up for the manifest. Only runs
// on directories this program just wrote, so a plain recursion is fine.
function measure(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      const inner = measure(p);
      files += inner.files;
      bytes += inner.bytes;
    } else {
      files += 1;
      bytes += st.size;
    }
  }
  return { files, bytes };
}

// Replace one bundle subtree with the repo's current version. Removing
// the old copy first is the whole point: cpSync alone merges, and a
// merged tree could smuggle in files the repo no longer ships.
function placeTree(from: string, to: string): { files: number; bytes: number } {
  rmSync(to, { recursive: true, force: true });
  if (!existsSync(from)) return { files: 0, bytes: 0 };
  cpSync(from, to, { recursive: true });
  return measure(to);
}

function handIn(): void {
  const out = outputDir();
  mkdirSync(out, { recursive: true });

  const game = placeTree(join(repoDir, 'game'), join(out, 'game'));
  const shots = placeTree(join(repoDir, 'screenshots'), join(out, 'screenshots'));

  const dossierBytes = buildDossier(out, LIMITS);
  writeFileSync(join(out, 'dossier.json'), dossierBytes);

  // The manifest: a human-checkable receipt on stdout, deliberately not
  // a file in the bundle — the bundle's contents are the scorer's, and
  // an extra file there would be one more thing for it to trip over.
  const manifest = {
    entry: 'GO RIO RIO (gta6-01)',
    gameFiles: game.files,
    gameBytes: game.bytes,
    screenshotFiles: shots.files,
    screenshotBytes: shots.bytes,
    dossierBytes: dossierBytes.length,
    output: out,
  };
  console.log('GO RIO RIO handed in:');
  console.log(JSON.stringify(manifest, null, 2));
}

try {
  handIn();
} catch (err) {
  console.error('GO RIO RIO hand-in failed:', err);
  process.exitCode = 1;
}
