# Mini Minecraft

Browser-based Minecraft-style prototype built with Three.js.

## Setup

```powershell
npm install
npm run start
```

Open the URL printed by `serve` (usually `http://localhost:3000`).

Alternative:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`.

## Scripts

- `npm run start`: run local static server with `serve`.
- `npm test`: placeholder (`No tests yet`).

## Core Features

- Procedural world generation with multiple biomes.
- Cave carving in underground layers for explorable tunnels.
- Cave waterfalls and lavafalls generated from underground ceilings (max one of each per cave region).
- Reduced ore density and reduced cave-exposed ore frequency.
- Block breaking/placing with inventory counts.
- Hotbar with number-key and mouse-wheel selection.
- Inventory UI with item selection and gear equip slots.
- Crafting recipes with input/output validation.
- Passive mobs (cow/sheep/chicken) and hostile mobs (zombie/skeleton/creeper).
- Day/night cycle with sun/moon visuals and dynamic lighting.
- Visible first-person player hands with movement sway.
- SFX for gameplay actions (place/break/hurt/craft/etc.).

## Controls

- `W A S D`: move
- `Shift`: sprint
- `Space`: jump
- `E`: open/close inventory
- `Left click`: break block / attack entity
- `Right click`: place block
- `Mouse wheel`: cycle hotbar selection
- `1-0`: quick-select hotbar slot
- `F`: consume mushroom (when available)
- `Esc`: unlock pointer

## Project Files

- `main.js`: rendering, game logic, entities, world, inventory/crafting, and input.
- `styles.css`: HUD, hotbar, inventory, and layout styling.
- `index.html`: page shell and UI mount points.

## Collaboration Workflow

- `main` is the stable branch.
- Use feature branches for experiments, then merge when stable.
- Commit messages should describe one clear change.
- After every code update, `README.md` must be updated if behavior or controls changed.

## Releases

- `v1.0` (March 3, 2026):
- Cleaned repository by removing obsolete `*.pre-isolation.bak` files.
- Added ignore rule for backup artifacts.
- Restructured README for setup, features, controls, and workflow clarity.
