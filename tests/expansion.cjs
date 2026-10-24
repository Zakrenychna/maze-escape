const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = new Map();
const context2d = new Proxy({}, {get: (_, name) => name === 'measureText' ? () => ({width: 20}) : name.startsWith('create') ? () => ({addColorStop(){}}) : () => {}});
function element(id) {
  if (!elements.has(id)) elements.set(id, {width:720,height:450,value:'',hidden:true,dataset:{},classList:{add(){},remove(){},toggle(){}},getContext:()=>context2d,addEventListener(event, handler){(this.events ||= {})[event] = handler;},setAttribute(){},replaceChildren(){},appendChild(){},focus(){},select(){}});
  return elements.get(id);
}
const storage = new Map();
const sandbox = {console,performance:{now:()=>0},Image:class {constructor(){this.complete=true;this.naturalWidth=1254;this.naturalHeight=1254;}}, requestAnimationFrame(){},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>element(Math.random()),body:element('body')},window:{addEventListener(){},setTimeout(){}}};
let source = fs.readFileSync('game.js','utf8');
source = source.replace('    // Initialize & start', `    globalThis.testGame = {resetGame, enterMazeFromArmory, interactRoom, submitRoomPuzzle, cancelDoorPuzzle, updateExploration, buyMedkit, useMedkit, buyPuzzleHint, openDoorPuzzle, loadProgress, draw, gameLoop, toggleJournal, toggleFlashlight, buyOrEquipWeapon, useWeapon, get nightmare(){return nightmareMode}, get flashlight(){return flashlightOn}, get monster(){return monster}, get fragments(){return fragmentPositions}, resetCooldown(){weaponCooldown=0}, get player(){return player}, get map(){return map}, get money(){return money}, set money(value){money=value}, get medkits(){return medkits}, get state(){return gameState}, get solved(){return solvedRooms}, get survival(){return survival}, get guards(){return keyGuards}, get hunters(){return roomHunters}, get kits(){return medkits}, set kits(value){medkits=value}, get mode(){return worldMode}, isWall, canMoveTo, interactSurvival, craft, addItem, inventorySlots, updateSurvival, updateSpecialCreatures, emitNoise, toggleCrouch, toggleUV, replaceBattery, placeTrap, throwBottle, reloadWeapon, buyWeaponMod, checkContracts, saveCheckpoint, resumeCheckpoint, validCheckpoint, endingName, triggerWorldEvent, unlockAudio, playSound, rooms:MAZE_ROOMS, puzzles:ROOM_PUZZLES};\n    // Initialize & start`);
vm.runInNewContext(source,sandbox);
const game = sandbox.testGame;
assert.equal(game.rooms.length,13);
game.enterMazeFromArmory();
// Flood-fill the finished map: every terminal, scrap pile, fragment and exit is reachable.
const visited = new Set(['3,3']); const queue=[[3,3]];
for(let head=0;head<queue.length;head++) for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
 const [x,y]=queue[head]; const nx=x+dx,ny=y+dy; const key=`${nx},${ny}`;
 if(!visited.has(key) && game.map[ny] && [0,2,3,4].includes(game.map[ny][nx])) {visited.add(key);queue.push([nx,ny]);}
}
for(const room of game.rooms) {
 assert(visited.has(`${room.x+3},${room.y+3}`),`${room.name} terminal reachable`);
 assert(visited.has(`${room.x+1},${room.y+3}`),`${room.name} salvage reachable`);
}
for(const [x,y] of [[3,3],...game.fragments.map(p=>[p.x,p.y]),[27,27]]) assert(visited.has(`${x},${y}`),`${x},${y} reachable`);
function terminal(index){const room=game.rooms[index];game.player.x=room.x+3.5;game.player.y=room.y+3.5;game.interactRoom();}
terminal(6); assert.equal(game.state,'playing','filter needs generator');
terminal(7); assert.equal(game.state,'puzzle');
game.submitRoomPuzzle('99');assert.equal(game.solved.size,0);
game.money=100;game.buyPuzzleHint();assert.equal(game.money,85);game.buyPuzzleHint();assert.equal(game.money,85,'hint paid once');
game.submitRoomPuzzle('3');assert(game.solved.has(7));assert.equal(game.money,165);
game.submitRoomPuzzle('3');assert.equal(game.money,165,'no duplicate reward');
terminal(6);game.cancelDoorPuzzle();assert.equal(game.player.x,game.rooms[6].x+3.5,'cancel does not teleport to exit');
terminal(6);game.submitRoomPuzzle('4');assert(game.solved.has(6));
for(let i=0;i<6;i++){terminal(i);game.submitRoomPuzzle(game.puzzles[i].answer);assert(game.solved.has(i));}
const room=game.rooms[0];game.player.x=room.x+1.5;game.player.y=room.y+3.5;
let before=game.money;game.interactRoom();game.interactRoom();assert.equal(game.money,before+30,'salvage once');
before=game.money;game.updateExploration();game.updateExploration();assert.equal(game.money,before+20,'discovery once');
game.player.hasCode=[true,true,true,true];game.openDoorPuzzle();assert.equal(game.state,'puzzle');
element('doorCodeInput').value='3719';element('doorPuzzleForm').events.submit({preventDefault(){}});assert.equal(game.state,'playing');
game.resetGame();game.money=55;const kits=game.medkits;game.buyMedkit();assert.equal(game.money,0);assert.equal(game.medkits,kits+1);game.buyMedkit();assert.equal(game.medkits,kits+1,'cannot overspend');
game.player.health=75;game.useMedkit();assert.equal(game.player.health,100);assert.equal(game.medkits,kits);game.useMedkit();assert.equal(game.medkits,kits,'full health consumes nothing');
assert.equal(game.loadProgress().medkits,kits,'supply count persists');
game.enterMazeFromArmory();assert.equal(game.solved.size,0);game.player.hasCode=[true,true,true,true];game.openDoorPuzzle();assert.equal(game.state,'playing','exit requires power and water');
game.draw();game.gameLoop(16);game.toggleJournal();
// Nightmare reuses the full maze, preserves selected equipment, and resets cleanly.
element('nightmareMode').events.click();assert.equal(game.nightmare,true);assert.equal(game.flashlight,true);
game.money=510;game.buyOrEquipWeapon('silenced');assert.equal(game.money,320);assert.equal(game.player.weapon,'silenced');
game.buyOrEquipWeapon('doublebarrel');assert.equal(game.money,0);assert.equal(game.player.weapon,'doublebarrel');
game.enterMazeFromArmory();assert.equal(game.nightmare,true);assert.equal(game.player.weapon,'doublebarrel');
game.toggleFlashlight();assert.equal(game.flashlight,false);game.draw();
game.toggleFlashlight();assert.equal(game.flashlight,true);game.draw();
terminal(7);game.toggleFlashlight();assert.equal(game.flashlight,true,'puzzle freezes flashlight input');game.cancelDoorPuzzle();
game.player.x=3.5;game.player.y=3.5;game.player.angle=Math.PI/2;
game.monster.x=3.5;game.monster.y=4.5;game.monster.hp=120;game.monster.active=true;game.monster.stunTimer=0;
game.player.weapon='silenced';game.resetCooldown();game.useWeapon();assert.equal(game.monster.hp,78,'suppressed pistol deals damage');
game.player.weapon='doublebarrel';game.resetCooldown();game.useWeapon();assert.equal(game.monster.active,false,'double barrel kills a close target');
assert.equal(game.loadProgress().weapons.silenced,true,'new gun persists');
element('regularMode').events.click();assert.equal(game.nightmare,false);assert.equal(game.flashlight,false);game.draw();
element('halloweenMode').events.click();assert.equal(game.nightmare,false);assert.equal(game.flashlight,true);game.draw();
element('regularMode').events.click();

// Complete survival systems, including save/load invariants.
game.money=1000;game.buyOrEquipWeapon('silenced');game.buyWeaponMod('power');
assert.equal(game.loadProgress().gunMods.silenced,'power','weapon mods persist');
game.enterMazeFromArmory();assert.equal(game.survival.gunMods.silenced,'power','loadout survives departure');
assert(game.inventorySlots()<=12);
game.survival.items.scrap=8;game.craft('trap');assert.equal(game.survival.items.trap,1);assert.equal(game.survival.items.scrap,5);
game.craft('lockpick');assert.equal(game.survival.items.lockpick,1);assert.equal(game.survival.items.scrap,3);
game.survival.items.scrap=0;game.craft('trap');assert.equal(game.survival.items.trap,1,'no crafting without materials');
const savedItems={...game.survival.items};game.survival.items.scrap=999;
assert.equal(game.addItem('ammo',24),false,'capacity enforced');game.survival.items=savedItems;
const drawer=game.survival.objects.find(o=>o.id==='drawer-1');game.player.x=drawer.x;game.player.y=drawer.y;
game.interactSurvival();assert.equal(drawer.used,true);assert.equal(game.survival.items.lockpick,0,'locked drawer consumes pick');
let rounds=game.survival.items.ammo;game.interactSurvival();assert.equal(game.survival.items.ammo,rounds,'opened drawer cannot be farmed');
const glass=game.survival.objects.find(o=>o.id==='glass-0');game.player.x=glass.x;game.player.y=glass.y;game.interactSurvival();assert(glass.used);assert.equal(game.survival.noise.radius,14);
const furniture=game.survival.objects.find(o=>o.id==='furniture-0');game.player.x=furniture.x-1;game.player.y=furniture.y;game.player.angle=0;
const furnitureX=furniture.x;game.interactSurvival();assert(furniture.x>furnitureX,'furniture moves');assert.equal(game.canMoveTo(furniture.x,furniture.y),false,'moved furniture blocks movement');
const door=game.survival.objects.find(o=>o.id==='door-0');game.survival.items.scrap=2;game.player.x=door.x+1;game.player.y=door.y;
game.interactSurvival();assert(door.barricaded);assert(game.isWall(Math.floor(door.x),Math.floor(door.y)));game.interactSurvival();assert.equal(door.barricaded,false);assert.equal(game.map[Math.floor(door.y)][Math.floor(door.x)],0);
game.survival.loaded.silenced=0;game.player.weapon='silenced';rounds=game.survival.items.ammo;game.reloadWeapon();assert(game.survival.reload>0);game.updateSurvival(1.2);
assert.equal(game.survival.loaded.silenced,12);assert.equal(game.survival.items.ammo,rounds-12);
game.survival.items.battery=1;game.survival.battery=0;game.updateSurvival(.1);game.replaceBattery();assert.equal(game.survival.battery,100);assert.equal(game.survival.items.battery,0);
game.survival.items.bottle=1;game.player.x=3.5;game.player.y=3.5;game.throwBottle();assert.equal(game.survival.items.bottle,0);assert.equal(game.survival.noise.radius,12);
const blind=game.survival.creatures.find(c=>c.kind==='blind');blind.x=4.5;blind.y=4.5;
game.emitNoise(3.5,3.5,12);game.updateSpecialCreatures(.1);assert.equal(blind.target.x,3.5,'blind creature follows sound');
game.survival.items.trap=1;game.placeTrap();blind.x=game.player.x;blind.y=game.player.y;game.updateSpecialCreatures(.01);assert(blind.stunTimer>6,'trap stuns creature');
const medical=game.rooms[6];game.toggleCrouch();game.player.x=medical.x+1.5;game.player.y=medical.y+1.5;game.interactSurvival();assert(game.player.inCloset);assert(game.survival.hiddenBed);game.interactSurvival();assert.equal(game.player.inCloset,false);
game.triggerWorldEvent('blackout');assert(game.survival.blackout>0);game.triggerWorldEvent('jam');assert(game.survival.objects.some(o=>o.jammed));game.updateSurvival(23);assert(!game.survival.objects.some(o=>o.jammed),'jams expire');
game.survival.eventClock=1000;
for(const index of [1,5,11]){const note=game.survival.objects.find(o=>o.id===`note-${index}`);game.player.x=note.x;game.player.y=note.y;game.interactSurvival();}
assert.equal(game.survival.items.documents,3);assert(game.survival.contracts.documents);before=game.money;game.checkContracts();assert.equal(game.money,before,'contracts pay once');
const patient=game.survival.objects.find(o=>o.id==='survivor');game.player.x=patient.x;game.player.y=patient.y;game.kits=1;game.interactSurvival();assert(game.survival.rescued);assert(game.survival.contracts.rescue);
game.solved.add(7);terminal(11);game.submitRoomPuzzle('1047');assert(game.survival.transmitted);assert.equal(game.endingName(),'DAWN · EVERYONE SAVED');
terminal(9);game.submitRoomPuzzle('6284');assert(!game.solved.has(9),'UV required before answer');game.toggleUV();game.submitRoomPuzzle('6284');assert(game.solved.has(9));
game.survival.rescued=false;assert.equal(game.endingName(),'THE TRUTH GETS OUT');game.survival.transmitted=false;assert.equal(game.endingName(),'LONE SURVIVOR');game.survival.rescued=true;assert.equal(game.endingName(),'NO ONE LEFT BEHIND');
game.player.x=3.5;game.player.y=3.5;game.player.health=90;game.money=333;
assert(game.saveCheckpoint(false));const checkpoint=JSON.parse(storage.get('maze-house-checkpoint-v2'));assert(game.validCheckpoint(checkpoint),'own checkpoint validates');
const oldMap=JSON.stringify(game.map);game.money+=500;game.survival.items.ammo=0;game.player.health=10;
assert(game.resumeCheckpoint());assert.equal(game.money,333,'checkpoint restores economy without farming');assert.equal(game.player.health,90);assert.equal(JSON.stringify(game.map),oldMap);assert.equal(game.survival.items.documents,3);
game.money+=100;assert(game.resumeCheckpoint());assert.equal(game.money,333,'repeated resume cannot duplicate money');
storage.set('maze-house-checkpoint-v2','{"version":2,"map":null}');assert.equal(game.resumeCheckpoint(),false,'invalid checkpoint rejected without crashing');
storage.set('maze-house-checkpoint-v2',JSON.stringify(checkpoint));

// Generated layouts must retain every objective and room, across many fresh runs.
const layouts=new Set(), annexLocations=new Set();
for(let run=0;run<35;run++){
 game.resetGame(false);layouts.add(JSON.stringify(game.map));annexLocations.add(`${game.rooms[8].x},${game.rooms[8].y}`);
 const reached=new Set(['3,3']),open=[[3,3]];
 for(let head=0;head<open.length;head++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=open[head][0]+dx,y=open[head][1]+dy,k=`${x},${y}`;if(!reached.has(k)&&game.map[y]&&[0,2,3,4].includes(game.map[y][x])){reached.add(k);open.push([x,y]);}}
 for(const room of game.rooms)assert(reached.has(`${room.x+3},${room.y+3}`),`${room.name} reachable, run ${run}`);
 for(const p of [...game.fragments,{x:27,y:27}])assert(reached.has(`${p.x},${p.y}`),'escape objective reachable');
 assert(!game.isWall(Math.floor(game.monster.x),Math.floor(game.monster.y)),'monster spawns on floor');
 assert(game.map[0].every(c=>c===1)&&game.map.at(-1).every(c=>c===1)&&game.map.every(row=>row[0]===1&&row.at(-1)===1),'map boundary stays closed');
}
assert(layouts.size>1);assert(annexLocations.size>1,'annex room placement changes');

// Actual audio graph uses relative pan, distance falloff and wall muffling.
const audioNodes={pans:[],gains:[],filters:[]};
const parameter=()=>({value:0,setValueAtTime(value){this.value=value},linearRampToValueAtTime(value){this.peak=value},exponentialRampToValueAtTime(){}});
const node=()=>({connect(){return this}});
sandbox.window.AudioContext=class{
 constructor(){this.state='running';this.currentTime=0;this.destination={};}
 createOscillator(){return {...node(),frequency:parameter(),start(){},stop(){}}}
 createGain(){const gain={...node(),gain:parameter()};audioNodes.gains.push(gain);return gain;}
 createBiquadFilter(){const filter={...node(),frequency:parameter()};audioNodes.filters.push(filter);return filter;}
 createStereoPanner(){const pan={...node(),pan:parameter()};audioNodes.pans.push(pan);return pan;}
};
game.player.x=3.5;game.player.y=3.5;game.player.angle=0;game.unlockAudio();
game.playSound('step',4.5,4.5);assert(audioNodes.pans.at(-1).pan.value>0,'sound to the right pans right');
game.playSound('step',4.5,2.5);assert(audioNodes.pans.at(-1).pan.value<0,'sound to the left pans left');
game.map[3][4]=0;game.map[3][5]=0;game.playSound('breath',5.5,3.5);const clearGain=audioNodes.gains.at(-1).gain.peak;
game.map[3][4]=1;game.playSound('breath',5.5,3.5);assert.equal(audioNodes.filters.at(-1).frequency.value,350);assert(audioNodes.gains.at(-1).gain.peak<clearGain,'wall muffles sound');
game.map[3][4]=0;game.map[3][6]=0;game.map[3][7]=0;const shy=game.survival.creatures.find(c=>c.kind==='shy');shy.x=5.5;shy.y=3.5;shy.stunTimer=0;
if(!game.flashlight)game.toggleFlashlight();game.survival.battery=100;const distanceBefore=shy.x-game.player.x;game.updateSpecialCreatures(.1);assert(shy.x-game.player.x>distanceBefore,'light-shy creature retreats from beam');
console.log('PASS: 13 rooms, 35 procedural mazes, puzzles, crafting, inventory, drawers/glass/furniture/doors, hiding, noise AI, traps, reloads, batteries, contracts, four endings, checkpoint rollback and corrupt-save rejection');
