# Maze Escape

Open `index.html` in a browser. No server or dependencies are required.

## Modes and controls

Regular: explore thirteen furnished rooms, restore the generator and medical filter,
collect four guarded code fragments, enter their digits at the red exit, defeat
the boss and escape by car. Optional room puzzles pay for equipment.

Nightmare: the same full mission in near-total darkness. A narrow flashlight beam
reveals the scene ahead; everything outside it stays black. The radar is offline.
The safe room stays lit so you can buy equipment. The flashlight starts on, has
replaceable batteries, and follows your view. Press T or tap FLASHLIGHT to toggle it.
HUD, interaction prompts and puzzle forms remain readable in the dark.

Halloween, Tornado Run and Tsunami Escape remain available. Weather trials unlock
after a regular or Nightmare escape. Changing modes resets lighting appropriately.

W/S: move; A/D: turn; Shift: sprint; E: interact/hide; Space/G/click: attack;
V: cycle owned weapons; F: car; J: journal; H: medkit; T: flashlight; R: restart.
I: inventory; C: crouch; Q: throw bottle; X: place trap; B: reload; U: ultraviolet;
Y: replace battery; K: save checkpoint. On-screen buttons support touch controls.

## Survival expansion

The map is now 42x42. Every new run generates a different maze, shuffles the five
annex rooms and randomizes guarded fragment locations. All thirteen rooms and the
exit are connected before loot placement. The opening lane and secret room stay
recognizable. New rooms: Basement, Operating Theatre, Workshop, Server Room and
Flooded Tunnel. The flooded tunnel slows movement until its pumps are restored.

- Spatial sound: generated Web Audio footsteps, door creaks, glass, gunfire,
  monster breathing and radio tones. Stereo pan follows your view; distance and
  intervening walls reduce and muffle sounds. Sound starts after a gesture and
  can be muted. The last journal also has spoken playback when the browser
  supports speech synthesis; its full text remains in the journal.
- Inventory: 12 slots shared by medkits, tools, ammo, scrap, batteries, bottles,
  lockpicks, traps and quest items. Stack sizes appear in the inventory. Drop
  ordinary stacks to make room; quest evidence cannot be discarded.
- Interactions: E opens drawers, picks locked drawers, breaks glass, pushes
  furniture, barricades/releases doors and reads logs. If furniture cannot be
  pushed, dismantling clears the route. Barricades cost two scrap and delay
  hunters for twelve seconds while they attack. All barricades are removable.
- Advanced puzzles: wire-terminal selectors, a radio-frequency slider, a mirrored
  number and a UV-only inscription. Generator power is required for the server.
- Creatures: the blind hunter investigates noise through walls; the light-shy
  creature retreats from a direct flashlight beam. Crouching reduces noise,
  movement speed and visual detection. Crouch and use E at a medical/operating
  bed to hide. Bottles distract hunters; traps stun them for seven seconds.
- Crafting: a tool kit and scrap produce lockpicks (2), traps (3) or noise bottles
  (1). Drawers and room salvage replenish materials. Failed crafting consumes
  nothing. Ammunition is shared between guns; each weapon has its own magazine.
- Weapon mods: one permanent mod per gun, 90 credits per installation. Scope:
  40% more range but narrower aim window. Extended magazine: 50% more capacity
  but 20% slower fire. Power: 30% more damage but 25% slower fire.
- Contracts: three documents pay 120 credits; a puzzle solved in a room without
  damage pays 75; stabilizing the patient pays 160 and returns a medkit if there
  is space. Each contract pays once per run.
- Events: temporary power failure, a jammed door or changed hunter patrols.
  Door jams release after 22 seconds or immediately with tools/a lockpick.
  The flashlight continues working during a power failure.
- Story: collect the Records, Archive and Server Room logs, stabilize the patient
  with a medkit, then transmit the three documents from the powered server.
  Optional rescue/transmission decisions produce four endings: Lone Survivor,
  No One Left Behind, The Truth Gets Out and Dawn / Everyone Saved.
- Checkpoints: K saves the current regular/Nightmare run; autosave runs every
  eight seconds when health is at least 25 and no enemy is within three tiles. CONTINUE CHECKPOINT restores the same maze,
  enemies, interactions, puzzle/contract progress, inventory, flashlight and
  economy. It rewinds credits, purchases and supplies to that moment, so
  loading repeatedly cannot duplicate rewards. Invalid saves are rejected.

The complete survival mission applies to Regular and Nightmare. Halloween and
weather challenges retain their arcade rules. The knife needs no ammunition.
Opening inventory/journal does not pause danger; puzzle forms pause the world.

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
- Puzzles: 45-100 credits each, once per run. Wrong answers are free.
- Hints: 15 credits per puzzle; viewing a purchased hint again is free.
- Enemies: 35-100 credits. Regular/Nightmare escape: 200 credits.
- Medkits: 55 credits, restore up to 40 HP, carry at most five.
- Weapons: 80-1100 credits; the knife is free. Ammunition comes from drawers or the safe-room shop (24 rounds for 25 credits).
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
node tests/browser.cjs
```

Unit checks generate 35 mazes and cover puzzles, interactions, inventory,
crafting, sound direction/occlusion, creature behavior, contracts, endings,
checkpoints, corrupted saves and the earlier weapon/Nightmare systems.
The browser test uses only built-in Node modules. Set CHROME_PATH if Chrome is
not installed at its usual Windows path. It drives real puzzle widgets, crafting,
checkpoint restore, flashlight pixels and mobile layout, and checks runtime errors.
Long-session difficulty and economy balance still need playtesting.
