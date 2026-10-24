const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = new Map();
const context2d = new Proxy({}, {get: (_, name) => name === 'measureText' ? () => ({width: 20}) : name.startsWith('create') ? () => ({addColorStop(){}}) : () => {}});
function element(id) {
  if (!elements.has(id)) elements.set(id, {width:720,height:450,value:'',hidden:true,dataset:{},classList:{add(){},remove(){},toggle(){}},getContext:()=>context2d,addEventListener(event, handler){(this.events ||= {})[event] = handler;},setAttribute(){},replaceChildren(){},focus(){},select(){}});
  return elements.get(id);
}
const storage = new Map();
const sandbox = {console,performance:{now:()=>0},Image:class {constructor(){this.complete=true;this.naturalWidth=1254;this.naturalHeight=1254;}}, requestAnimationFrame(){},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>element(Math.random()),body:element('body')},window:{addEventListener(){},setTimeout(){}}};
let source = fs.readFileSync('game.js','utf8');
source = source.replace('    // Initialize & start', `    globalThis.testGame = {resetGame, enterMazeFromArmory, interactRoom, submitRoomPuzzle, cancelDoorPuzzle, updateExploration, buyMedkit, useMedkit, buyPuzzleHint, openDoorPuzzle, loadProgress, draw, gameLoop, toggleJournal, toggleFlashlight, buyOrEquipWeapon, useWeapon, get nightmare(){return nightmareMode}, get flashlight(){return flashlightOn}, get monster(){return monster}, resetCooldown(){weaponCooldown=0}, get player(){return player}, get map(){return map}, get money(){return money}, set money(value){money=value}, get medkits(){return medkits}, get state(){return gameState}, get solved(){return solvedRooms}, rooms:MAZE_ROOMS, puzzles:ROOM_PUZZLES};\n    // Initialize & start`);
vm.runInNewContext(source,sandbox);
const game = sandbox.testGame;
assert.equal(game.rooms.length,8);
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
for(const [x,y] of [[3,3],[27,3],[3,27],[15,15],[27,27]]) assert(visited.has(`${x},${y}`),`${x},${y} reachable`);
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
console.log('PASS: Nightmare flashlight, mode switching, new gun purchases/damage/persistence; eight reachable rooms, puzzle chain and exit, rewards, hints, salvage, medkits, persistence, reset and render smoke');
