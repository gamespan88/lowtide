[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/gamespan88/lowtide/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/gamespan88/lowtide/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# LOWTIDE

An original top-down stealth game for the make.fun **best-stealth-game-20261121-1759** ("Make the best stealth game") bounty. Every place, name, sound and picture in LOWTIDE is invented for this entry and drawn or synthesised by its own code — no external art, no network, no libraries.

You are a tide-thief slipping through a drowned abbey on a tidal flat at night. Cross five flooded ruins — the Causeway Stores, the Flooded Cloister, the Chapter House, the Sunken Vault and the Tide Gate — lift each level's prize (the abbey's drowned ledgers, and at last the Tide Pearl itself), and reach the exit unseen.

## How it plays

- **Lantern wardens** patrol learnable routes with real raycast vision cones that change colour with their state: patrol, suspicious, investigate, chase, search (with a last-seen marker), return. A per-warden detection meter fills by distance, light and stance — and decays when you break line of sight, so a near miss is recoverable.
- **Light and shadow**: lamp pools make you easy to spot, deep-shadow tiles hide you, low cover hides a crouching thief, tall crates and walls block sight completely.
- **Noise**: sneak (Shift) is silent, walking is quiet, sprinting (Space) is loud — your current noise radius is drawn around you. Click to throw a coin and pull a warden off his route.
- **Scent hounds** (the abbey's signature defence): moving on dry ground drops scent crumbs that fade over ~18 seconds; wading washes the trail away. A hound that crosses a fresh crumb tracks the chain — drawn as a dashed trail — and its bark spikes its handler's detection.
- **Cameras** sweep their cones and fill an exposure meter; **laser tripwires** pulse, and crossing one while it is lit raises the alarm.
- A three-segment alarm (QUIET → WARY → ALARM) and strikes for being caught. Every escape ends on a **results screen**: ESCAPED, with a rank — **GHOST** (never spotted, every piece of loot), **SHADOW** (never spotted) or **BRUISER** (out the loud way) — one to three stars (escaped · never spotted · all loot), your time set against the level's par, and the **campaign chart** of all five nights with the stars and ranks earned so far and the next night's lure. A title screen presents the whole campaign up front; finishing all five nights empties the abbey.

Controls: WASD / arrows move · Shift sneak · Space sprint · E interact · Click throw coin · Esc pause · R retry · M mute.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output and writes the dossier.
- `game/index.html` + `game/css/style.css` — the page and its HUD panel.
- `game/js/` — one job per file: `main.js` (boot, loop, staged screenshots), `world.js` (level state, alarm, cameras, tripwires), `levels.js` (the five handcrafted maps), `vision.js` (raycasts, line of sight, light), `guards.js` (the warden state machine), `hounds.js` (scent crumbs and tracking), `player.js`, `audio.js` (all-synthesised WebAudio), `hud.js`, `render.js`, `input.js`.
- `screenshots/` — four real renders of the game itself, staged mid-action by its own shots mode.

Play it locally: `node serve.ts`, then open http://localhost:8080.
