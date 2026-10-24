# Maze Escape

Open `index.html` in a browser. No server or dependencies are required.

## Modes and controls

Regular: explore eight furnished rooms, restore the generator and medical filter,
collect four guarded code fragments, enter their digits at the red exit, defeat
the boss and escape by car. Optional room puzzles pay for equipment.

Nightmare: the same full mission in near-total darkness. A narrow flashlight beam
reveals the scene ahead; everything outside it stays black. The radar is offline.
The safe room stays lit so you can buy equipment. The flashlight starts on, has
unlimited power, and follows your view. Press T or tap FLASHLIGHT to toggle it.
HUD, interaction prompts and puzzle forms remain readable in the dark.

Halloween, Tornado Run and Tsunami Escape remain available. Weather trials unlock
after a regular or Nightmare escape. Changing modes resets lighting appropriately.

W/S: move; A/D: turn; Shift: sprint; E: interact/hide; Space/G/click: attack;
V: cycle owned weapons; F: car; J: journal; H: medkit; T: flashlight; R: restart.

## Guns and details

15 weapons are available, including two new guns:

- Suppressed pistol: 190 credits, 42 damage, 10m range, 0.65s cooldown.
- Double-barrel shotgun: 320 credits, 180 damage, 3.8m range, 1.8s cooldown.

Weapons have realistic inventory/world/held sprites, sway, recoil and muzzle flashes.
The shop shows damage, range and cooldown. Rooms contain worn military equipment cases.
The flashlight has a detailed metal body, glass reflector and lit lens.
Hands and the secret animation on key 5 still use procedural Canvas graphics.

## Economy and progress

- Room discovery: 20 credits, once per room per run.
- Copper salvage: 30 credits, collected with E, once per room per run.
- Puzzles: 45-80 credits each, once per run. Wrong answers are free.
- Hints: 15 credits per puzzle; viewing a purchased hint again is free.
- Enemies: 35-100 credits. Regular/Nightmare escape: 200 credits.
- Medkits: 55 credits, restore up to 40 HP, carry at most five.
- Weapons: 80-1100 credits; the knife is free. No ammunition purchases required.
- Armor: 180/360 credits, +25 maximum HP per level. Speed: 140/280 credits.

Credits, weapons, upgrades and medkits persist in localStorage, including after death.
Old saves remain compatible. Puzzle progress and room rewards reset each run.
The old credit-cheat key L is removed. Laser damage is 36 per shot.

## Assets

`assets/` contains five 4x4 atlases and the new 2x2 `nightmare-atlas.png`.
The new atlas was generated with built-in image_gen; its exact prompt is saved
in `assets/nightmare-prompts.json`. Earlier prompts are in `assets/prompts.json`
and `assets/expansion-prompts.json`. Procedural graphics remain as loading fallbacks.

## Checks

```sh
node --check game.js
node tests/expansion.cjs
```

Tests cover room/objective reachability, puzzle dependencies, unique rewards,
hints, medkits, persistence, Nightmare mode switching, flashlight state and new
gun purchases/damage. Chrome checks also verify the real beam/blackout pixels,
keyboard and button toggles, atlas loading, puzzle forms and mobile layout.
Long-session difficulty and economy balance still need playtesting.
