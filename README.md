# Mini Minecraft

Simple browser Minecraft-style prototype built with Three.js.

## Run

From this folder:

```powershell
npm install
npm run start
```

Then open the local URL printed by `serve` (typically `http://localhost:3000`).

Alternative:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Scripts

- `npm run start`: run local static server with `serve`.
- `npm test`: placeholder test command (`No tests yet`).

## Project Baseline

- `.editorconfig` enforces consistent formatting defaults.
- `.gitignore` excludes generated files and local noise (`node_modules`, logs, env files, etc.).
- `html, body` no longer use fixed positioning, so page layout behaves normally while the canvas/HUD remain fixed.

## Controls

- `W A S D`: move
- `Shift`: sprint
- `Space`: jump
- `E`: open/close inventory
- `Left click`: break block
- `Right click`: place block
- `1-0`: quick-select block type
- Inventory `Gear` section: equip tool tier and armor tier
- `Esc`: unlock pointer
- Renderer canvas is forced to full viewport so world fills the screen.
- Hearts are fixed at the bottom center for stable display.
- A horizontal 10-slot hotbar is centered above the hearts.

## Debug Notes (Temporary)

- Hotbar is currently in forced debug mode with hardcoded `.slot` elements and minimal red/blue styles for layout isolation.
- Full isolation mode is currently active: only `#hotbar` and `.slot` test markup/styles remain until visual verification is complete.

## Creatures

- Passive creatures are now split into cows, sheep, and chickens with Minecraft-like blocky models.
- Passive animals are now fatter (wider, chunkier body proportions).
- Hostile mobs include zombies, skeletons, and creepers.
- Zombies and skeletons are killable with melee hits.
- Skeletons use bows and fire arrow projectiles at range.
- Creepers rush you and explode at close range with larger block-damage terrain destruction.
- Health is shown in the HUD; you respawn automatically when it hits 0.

## Gear

- Added simple Minecraft-style gear loadout in inventory:
- Tools: Hand, Wood, Stone, Iron, Diamond (higher tiers increase melee damage).
- Armor: None, Leather, Iron, Diamond (higher tiers reduce incoming mob damage).

## Crafting

- Open inventory with E and use the Crafting buttons.
- Recipes consume required blocks and add crafted outputs to your inventory.


## Biomes and Blocks

- World now generates multiple biomes: plains, desert, taiga, and rocky zones.
- Added extra textured blocks: Snow, Ice, Clay, Basalt, RedSand, Moss, and Cactus.
- Ice is no longer generated naturally in terrain.
- Number keys still select 1-9 quickly; use inventory click to select any block type.


## Sky and Audio

- Added visible sun and moon orbiting with the day/night cycle.
- Added sound effects for actions: break/place/jump/footsteps/hurt/craft/inventory/day-night transitions/respawn.
- Audio starts after your first click or key press (browser autoplay policy).

