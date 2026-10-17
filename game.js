(function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const atlas = new Image();
    atlas.src = 'assets/maze-atlas.png';
    let materials = [];
    atlas.onload = () => {
        materials = Array.from({ length: 4 }, (_, index) => {
            const tile = document.createElement('canvas');
            tile.width = atlas.naturalWidth / 4;
            tile.height = atlas.naturalHeight / 4;
            tile.getContext('2d').drawImage(atlas, index * tile.width, 0,
                tile.width, tile.height, 0, 0, tile.width, tile.height);
            return tile;
        });
    };
    atlas.onerror = () => console.warn('Could not load maze artwork; using original graphics.');
    const spriteCells = {
        '👹': 4, '💫': 4, '👻': 5, '👾': 6, '🌾': 6, '🔑': 7,
        '❤': 8, '❤️': 8, '🩹': 8, '⚡': 9, '✦': 10, '📜': 10,
        '🧰': 11, '🗄️': 13, '🔦': 14, '🚗': 15, '🚪': 2
    };
    const decorCells = { officeDesk: 12, officeCabinet: 13, officePaper: 10,
        paper: 10, code: 10, apparition: 5 };
    const propsAtlas = new Image();
    propsAtlas.src = 'assets/props-atlas.png';
    const outdoorAtlas = new Image();
    outdoorAtlas.src = 'assets/outdoor-atlas.png';
    const propsCells = { '🔫': 0, '🔪': 1, '☄️': 2, '💥': 2, '⚔️': 3,
        '🕯️': 8, '🔥': 9, '📻': 10, '📦': 11, '🦴': 12 };
    const propsDecor = { officeChair: 4, officeWhiteboard: 5, officeWaterCooler: 6,
        officeVending: 7, torch: 9, bones: 12, moss: 13, glass: 14, web: 15 };
    const outdoorCells = { '🌲': 0, '🌳': 1, '🎃': 2, '🪦': 3, '🏚️': 4,
        '🪨': 5, '🌼': 6, '🪣': 7, '🗑️': 8, '📺': 9, '☕': 10,
        '🥾': 11, '🏹': 12, '🛡️': 13, '🚨': 14, '🚩': 15, '🔻': 15 };
    function drawArtwork(obj, x, y, size, depth, distance) {
        let source = atlas;
        let cell = decorCells[obj.decor] ?? spriteCells[obj.icon];
        const propCell = propsDecor[obj.decor] ?? propsCells[obj.icon];
        if (propCell !== undefined) { source = propsAtlas; cell = propCell; }
        if (outdoorCells[obj.icon] !== undefined) { source = outdoorAtlas; cell = outdoorCells[obj.icon]; }
        if (!source.complete || !source.naturalWidth || cell === undefined) return false;
        const sw = source.naturalWidth / 4, sh = source.naturalHeight / 4;
        const left = x - size / 2, top = y - size / 2;
        // Clip each sprite column against walls, including at door edges.
        ctx.shadowBlur = 0;
        for (let column = Math.max(0, Math.floor(left)); column < Math.min(canvas.width, left + size); column++) {
            if (distance > depth[column] + 0.2) continue;
            const u = (column - left) / size;
            ctx.drawImage(source, (cell % 4) * sw + u * sw,
                Math.floor(cell / 4) * sh, Math.min(sw / size, sw * (1 - u)), sh,
                column, top, 1, size);
        }
        return true;
    }

    // ---------- WORLD SETTINGS ----------
    const TILE_SIZE = 40;

    // 0 = empty, 1 = wall, 2 = exit door, 3 = closet, 4 = code fragment, 5 = secret wall, 6 = green door
    const baseMap = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
        [1,0,1,0,0,0,1,3,1,0,0,0,1,0,1],
        [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,0,1,1,1,1,1,0,1,1,1,0,1],
        [1,0,0,0,1,3,0,0,0,0,1,0,0,0,1],
        [1,0,1,1,1,0,1,1,1,1,1,0,1,0,1],
        [1,0,1,0,0,0,1,4,1,0,0,0,1,0,1],
        [1,0,1,0,1,1,1,0,1,1,1,1,1,0,1],
        [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
        [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    // Double the original floor plan in both directions for a larger maze.
    const MAP_W = baseMap[0].length * 2;
    const MAP_H = baseMap.length * 2;
    let map = baseMap.flatMap(row => [row.flatMap(cell => [cell, cell]), row.flatMap(cell => [cell, cell])]);

    const EXIT_POS = { x: 27, y: 27 };
    const SECRET_WALL_POS = { x: 8, y: 7 };
    const GREEN_DOOR_POS = { x: 11, y: 8 };
    const GREEN_DOOR_CODE = '1234';
    const MAZE_ROOMS = [
        { x: 20, y: 4, entrance: 'W', name: 'NORTH OFFICE', color: '#d46bff', floorTint: '#343d39', wallTint: [137, 151, 142], icon: '🕯️', enemy: { x: 21.5, y: 7.5 }, furnishings: [{ x: 22.5, y: 5.5, decor: 'officeDesk', size: 0.84 }, { x: 24.5, y: 6.5, decor: 'officeCabinet', size: 0.76 }, { x: 23.5, y: 8.4, decor: 'officeChair', size: 0.52 }, { x: 21.5, y: 8.5, icon: '🗑️', size: 0.34 }, { x: 24.5, y: 8.5, decor: 'officeWhiteboard', size: 0.72 }] },
        { x: 4, y: 12, entrance: 'N', name: 'RECORDS ROOM', color: '#ff7a4f', floorTint: '#403a32', wallTint: [148, 137, 119], icon: '🦴', enemy: { x: 7.5, y: 16.5 }, furnishings: [{ x: 7.5, y: 13.5, decor: 'officeCabinet', size: 0.82 }, { x: 8.5, y: 14.5, icon: '📦', size: 0.52 }, { x: 8.5, y: 16.5, decor: 'officePaper', size: 0.38 }, { x: 7.5, y: 15.5, decor: 'officeWhiteboard', size: 0.64 }] },
        { x: 20, y: 12, entrance: 'W', name: 'SECURITY OFFICE', color: '#ffbf4f', floorTint: '#303a3e', wallTint: [125, 144, 149], icon: '🦴', enemy: { x: 23.5, y: 15.5 }, furnishings: [{ x: 21.5, y: 13.5, decor: 'officeDesk', size: 0.78 }, { x: 24.5, y: 13.5, icon: '📺', size: 0.62 }, { x: 21.5, y: 16.5, decor: 'officeChair', size: 0.52 }, { x: 24.5, y: 16.5, decor: 'officeCabinet', size: 0.74 }, { x: 23.5, y: 13.5, decor: 'officeWhiteboard', size: 0.58 }] },
        { x: 13, y: 16, entrance: 'N', name: 'BREAK ROOM', color: '#65baff', floorTint: '#48443a', wallTint: [151, 145, 128], icon: '🕯️', enemy: { x: 17.5, y: 19.5 }, furnishings: [{ x: 16.5, y: 17.5, icon: '☕', size: 0.42 }, { x: 17.5, y: 17.5, decor: 'officeChair', size: 0.5 }, { x: 17.5, y: 20.5, decor: 'officePaper', size: 0.34 }, { x: 14.5, y: 20.5, decor: 'officeWaterCooler', size: 0.62 }, { x: 16.5, y: 20.5, decor: 'officeVending', size: 0.68 }] },
        { x: 4, y: 20, entrance: 'N', name: 'SUPPLY ROOM', color: '#55e0cf', floorTint: '#3b3934', wallTint: [137, 140, 129], icon: '🕯️', enemy: { x: 7.5, y: 24.5 }, furnishings: [{ x: 5.5, y: 21.5, icon: '📦', size: 0.62 }, { x: 8.5, y: 21.5, decor: 'officeCabinet', size: 0.72 }, { x: 5.5, y: 24.5, icon: '🧰', size: 0.48 }, { x: 8.5, y: 24.5, icon: '🪣', size: 0.42 }] },
        { x: 20, y: 20, entrance: 'W', name: 'ARCHIVE ROOM', color: '#ff6688', floorTint: '#34373a', wallTint: [133, 143, 150], icon: '🦴', enemy: { x: 23.5, y: 23.5 }, furnishings: [{ x: 21.5, y: 21.5, decor: 'officeCabinet', size: 0.82 }, { x: 24.5, y: 21.5, decor: 'officePaper', size: 0.38 }, { x: 21.5, y: 24.5, decor: 'officeCabinet', size: 0.68 }, { x: 24.5, y: 24.5, decor: 'officeChair', size: 0.5 }, { x: 24.5, y: 23.5, decor: 'officeWhiteboard', size: 0.62 }] }
    ];
    let secretWall = { x: SECRET_WALL_POS.x + 0.5, y: SECRET_WALL_POS.y + 0.5, discovered: false };
    let greenDoorClueFound = false;
    let secretCacheClaimed = false;
    let greenDoorOpen = false;
    map[EXIT_POS.y][EXIT_POS.x] = 2;
    function prepareSecretRoom() {
        for (let y = 8; y <= 10; y++) {
            map[y][7] = 1;
            map[y][11] = 1;
        }
        for (let x = 8; x <= 10; x++) {
            map[7][x] = 1;
            map[10][x] = 1;
        }
        for (let y = 8; y <= 9; y++) {
            for (let x = 8; x <= 10; x++) map[y][x] = 0;
        }
        map[SECRET_WALL_POS.y][SECRET_WALL_POS.x] = 5;
        for (let y = 8; y <= 9; y++) {
            map[y][12] = 0;
            map[y][13] = 1;
        }
        map[7][12] = 1;
        map[10][12] = 1;
        map[9][GREEN_DOOR_POS.x] = greenDoorOpen ? 0 : 6;
        map[GREEN_DOOR_POS.y][GREEN_DOOR_POS.x] = greenDoorOpen ? 0 : 6;
    }
    prepareSecretRoom();
    function prepareMazeRooms() {
        for (const room of MAZE_ROOMS) {
            const width = 6, height = 6;
            const entrance = {
                N: { x: room.x + 2, y: room.y },
                S: { x: room.x + 2, y: room.y + height - 1 },
                W: { x: room.x, y: room.y + 2 },
                E: { x: room.x + width - 1, y: room.y + 2 }
            }[room.entrance];
            for (let y = room.y; y < room.y + height; y++) {
                for (let x = room.x; x < room.x + width; x++) {
                    const isPerimeter = x === room.x || x === room.x + width - 1 || y === room.y || y === room.y + height - 1;
                    if (isPerimeter) map[y][x] = x === entrance.x && y === entrance.y ? 0 : 1;
                    else if (map[y][x] !== 3 && map[y][x] !== 4) map[y][x] = 0;
                }
            }
            const outside = {
                N: { x: entrance.x, y: entrance.y - 1 },
                S: { x: entrance.x, y: entrance.y + 1 },
                W: { x: entrance.x - 1, y: entrance.y },
                E: { x: entrance.x + 1, y: entrance.y }
            }[room.entrance];
            map[outside.y][outside.x] = 0;
        }

        const roomTile = (x, y) => MAZE_ROOMS.some(room =>
            x >= room.x && x < room.x + 6 && y >= room.y && y < room.y + 6
        );
        const protectedSecretTile = (x, y) => x >= 7 && x <= 13 && y >= 7 && y <= 10;
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const findPath = (start, isGoal, canVisit) => {
            const key = ({ x, y }) => y * MAP_W + x;
            const queue = [start];
            const parents = new Map([[key(start), -1]]);
            let goal = null;
            for (let head = 0; head < queue.length && !goal; head++) {
                const current = queue[head];
                if (isGoal(current.x, current.y)) {
                    goal = current;
                    break;
                }
                for (const [dx, dy] of directions) {
                    const next = { x: current.x + dx, y: current.y + dy };
                    const nextKey = key(next);
                    if (next.x < 0 || next.x >= MAP_W || next.y < 0 || next.y >= MAP_H ||
                        parents.has(nextKey) || !canVisit(next.x, next.y)) continue;
                    parents.set(nextKey, key(current));
                    queue.push(next);
                }
            }
            if (!goal) return null;
            const path = [];
            for (let currentKey = key(goal); currentKey !== -1; currentKey = parents.get(currentKey)) {
                path.push({ x: currentKey % MAP_W, y: Math.floor(currentKey / MAP_W) });
            }
            return path.reverse();
        };

        for (const room of MAZE_ROOMS) {
            const entrance = {
                N: { x: room.x + 2, y: room.y },
                S: { x: room.x + 2, y: room.y + 5 },
                W: { x: room.x, y: room.y + 2 },
                E: { x: room.x + 5, y: room.y + 2 }
            }[room.entrance];
            const outside = {
                N: { x: entrance.x, y: entrance.y - 1 },
                S: { x: entrance.x, y: entrance.y + 1 },
                W: { x: entrance.x - 1, y: entrance.y },
                E: { x: entrance.x + 1, y: entrance.y }
            }[room.entrance];
            const isPassable = (x, y) => !roomTile(x, y) && map[y][x] !== 1 &&
                map[y][x] !== 3 && map[y][x] !== 5 && map[y][x] !== 6;
            const connectedTiles = new Set();
            const connectedQueue = [{ x: 3, y: 3 }];
            connectedTiles.add(3 * MAP_W + 3);
            for (let head = 0; head < connectedQueue.length; head++) {
                const current = connectedQueue[head];
                for (const [dx, dy] of directions) {
                    const x = current.x + dx, y = current.y + dy, tileKey = y * MAP_W + x;
                    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H ||
                        connectedTiles.has(tileKey) || !isPassable(x, y)) continue;
                    connectedTiles.add(tileKey);
                    connectedQueue.push({ x, y });
                }
            }
            if (connectedTiles.has(outside.y * MAP_W + outside.x)) continue;
            const path = findPath(outside,
                (x, y) => connectedTiles.has(y * MAP_W + x),
                (x, y) => !roomTile(x, y) && !protectedSecretTile(x, y) &&
                    map[y][x] !== 3 && map[y][x] !== 5 && map[y][x] !== 6
            );
            if (!path) throw new Error(`Could not connect the ${room.name} entrance to the maze.`);
            for (const { x, y } of path) {
                if (map[y][x] === 1) map[y][x] = 0;
            }
        }
    }

    const CORRECT_CODE = [3, 7, 1, 9];
    const HUMAN_CHECK_ANSWER = 5;
    let collectedFragments = [false, false, false, false];

    const fragmentPositions = [
        { x: 3, y: 3 },
        { x: 27, y: 3 },
        { x: 3, y: 27 },
        { x: 15, y: 15 }
    ];
    // Keep the opening lane clear so the player can move before the first guardian engages.
    const keyGuards = [
        { x: 16.5, y: 2.5, hp: 80, maxHp: 80, active: true, angle: 0, color: '#ff5364' },
        { x: 26.5, y: 3.5, hp: 80, maxHp: 80, active: true, angle: Math.PI, color: '#bd67ff' },
        { x: 4.5, y: 27.5, hp: 80, maxHp: 80, active: true, angle: 0, color: '#ffc04d' },
        { x: 14.5, y: 15.5, hp: 80, maxHp: 80, active: true, angle: Math.PI, color: '#54e0d0' }
    ];
    let roomHunters = [];
    function resetRoomHunters() {
        roomHunters = MAZE_ROOMS.map((room, index) => ({
            x: room.enemy.x,
            y: room.enemy.y,
            homeX: room.enemy.x,
            homeY: room.enemy.y,
            angle: index * Math.PI / 2,
            speed: 1.45 + index * 0.12,
            hp: 72,
            maxHp: 72,
            stunTimer: 0,
            phase: index * 1.9,
            searchTimer: 0,
            lastSeenPlayer: { ...room.enemy },
            active: true,
            alertedOnce: false,
            name: room.name,
            color: room.color
        }));
    }
    const GUARD_DAMAGE = 20;
    const CAR_KEY_POS = { x: 14.5, y: 14.5 };
    const CAR_POS = { x: 26.5, y: 26.5 };
    const WEAPON_COOLDOWN = 3.5;
    const STUN_DURATION = 2.8;
    const PROGRESS_KEY = 'maze-house-progress-v1';
    const WEAPON_PRICES = { knife: 0, pistol: 80, shotgun: 150, smg: 220, revolver: 300, plasma: 250, laser: 500, crossbow: 340, flamethrower: 420 };
    const WEAPON_DEFS = {
        knife: { label: 'KNIFE', cooldown: 0.55, damage: 40, range: 1.65, aim: 0.72, description: 'Free · close-range', color: '#dfe7ee', icon: '🔪' },
        pistol: { label: 'PISTOL', cooldown: 3.5, damage: 20, range: 8, aim: 0.2, effect: 'stun', description: 'Stuns maze enemies', color: '#dfe7ee', icon: '🔫' },
        shotgun: { label: 'SHOTGUN', cooldown: 1.05, damage: 125, range: 4.5, aim: 0.62, description: 'Heavy, close-range hit', color: '#efb66e', icon: '💥' },
        smg: { label: 'SMG', cooldown: 0.24, damage: 28, range: 9, aim: 0.32, description: 'Fast, lighter hits', color: '#83d7ca', icon: '🔫' },
        revolver: { label: 'REVOLVER', cooldown: 0.82, damage: 72, range: 12, aim: 0.2, description: 'Precise heavy shot', color: '#e2c47b', icon: '🔫' },
        plasma: { label: 'PLASMA RIFLE', cooldown: 1.2, damage: 90, range: 10, aim: 0.24, description: 'Heavy energy shot', color: '#d6a5ff', icon: '💥' },
        laser: { label: 'LASER MINIGUN', cooldown: 0.18, damage: 9999, range: 12, aim: 0.28, description: 'Extreme damage', color: '#7de5ff', icon: '⚡' },
        lightsaber: { label: 'LIGHTSABER', cooldown: 0.7, damage: 150, range: 2.5, aim: 0.65, description: 'Secret green-door reward', color: '#55dfff', icon: '⚔️' },
        crossbow: { label: 'CROSSBOW', cooldown: 1.35, damage: 145, range: 16, aim: 0.13, description: 'Long-range, precise bolt', color: '#bd9365', icon: '🏹' },
        flamethrower: { label: 'FLAMETHROWER', cooldown: 0.32, damage: 42, range: 4.8, aim: 0.72, description: 'Wide cone, close-range burn', color: '#ff8a42', icon: '🔥' }
    };
    const UPGRADE_PRICES = { armor: [180, 360], boots: [140, 280] };
    const UPGRADE_DEFS = {
        armor: { label: 'REINFORCED ARMOR', description: '+25 max health per level', icon: '🛡️' },
        boots: { label: 'SPRINT MODULE', description: 'Move and sprint faster', icon: '🥾' }
    };

    function loadProgress() {
        const defaults = {
            money: 0,
            weapons: Object.fromEntries(Object.keys(WEAPON_DEFS).map(weapon => [weapon, weapon === 'knife'])),
            upgrades: { armor: 0, boots: 0 },
            disasterModesUnlocked: false
        };
        try {
            const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
            if (!saved || typeof saved !== 'object') return defaults;
            const money = Number.isSafeInteger(saved.money) && saved.money >= 0 ? saved.money : 0;
            const weapons = { ...defaults.weapons };
            const upgrades = { ...defaults.upgrades };
            if (saved.weapons && typeof saved.weapons === 'object') {
                for (const weapon of Object.keys(WEAPON_DEFS)) {
                    weapons[weapon] = weapon === 'knife' || saved.weapons[weapon] === true;
                }
            }
            if (saved.upgrades && typeof saved.upgrades === 'object') {
                for (const upgrade of Object.keys(UPGRADE_DEFS)) {
                    const level = saved.upgrades[upgrade];
                    upgrades[upgrade] = Number.isSafeInteger(level) ? Math.max(0, Math.min(2, level)) : 0;
                }
            }
            return { money, weapons, upgrades, disasterModesUnlocked: saved.disasterModesUnlocked === true };
        } catch (error) {
            console.error('Could not load saved maze progress:', error);
            return defaults;
        }
    }

    const progress = loadProgress();
    let money = progress.money;
    const ownedWeapons = progress.weapons;
    const ownedUpgrades = progress.upgrades;
    let disasterModesUnlocked = progress.disasterModesUnlocked;

    function saveProgress() {
        try {
            localStorage.setItem(PROGRESS_KEY, JSON.stringify({
                money,
                weapons: ownedWeapons,
                upgrades: ownedUpgrades,
                disasterModesUnlocked
            }));
        } catch (error) {
            console.error('Could not save maze progress:', error);
        }
    }

    function updateArmoryUI() {
        document.getElementById('money').textContent = money;
        document.getElementById('armoryMoney').textContent = money;
        document.getElementById('armoryPanel').hidden = !(gameMode === 'regular' && worldMode === 'armory');
        const activeWeapon = WEAPON_DEFS[player.weapon] || WEAPON_DEFS.knife;
        document.getElementById('weaponStatus').textContent = `${activeWeapon.icon} ${activeWeapon.label}`;
        document.querySelectorAll('[data-shop-weapon]').forEach(button => {
            const weapon = button.dataset.shopWeapon;
            if (!weapon || !(weapon in WEAPON_DEFS)) return;
            const price = WEAPON_PRICES[weapon];
            const owned = ownedWeapons[weapon];
            const equipped = player.weapon === weapon;
            const status = equipped ? 'EQUIPPED' : owned ? 'OWNED · EQUIP' : weapon === 'lightsaber' ? 'SECRET · FIND IN MAZE' : `BUY · ${price} CREDITS`;
            button.innerHTML = `${WEAPON_DEFS[weapon].icon} ${WEAPON_DEFS[weapon].label}<small>${status} · ${WEAPON_DEFS[weapon].description}</small>`;
            button.disabled = !owned && (weapon === 'lightsaber' || money < price);
        });
        document.querySelectorAll('[data-shop-upgrade]').forEach(button => {
            const upgrade = button.dataset.shopUpgrade;
            if (!upgrade || !(upgrade in UPGRADE_DEFS)) return;
            const level = ownedUpgrades[upgrade];
            const price = UPGRADE_PRICES[upgrade][level];
            const status = level >= 2 ? 'MAX LEVEL' : `LEVEL ${level} · BUY ${price} CREDITS`;
            button.innerHTML = `${UPGRADE_DEFS[upgrade].icon} ${UPGRADE_DEFS[upgrade].label}<small>${status} · ${UPGRADE_DEFS[upgrade].description}</small>`;
            button.disabled = level >= 2 || money < price;
        });
    }

    function updateDisasterModeButtons() {
        document.getElementById('tornadoMode').hidden = !disasterModesUnlocked;
        document.getElementById('tsunamiMode').hidden = !disasterModesUnlocked;
    }

    function awardMoney(amount, reason) {
        money += amount;
        saveProgress();
        updateArmoryUI();
        message = `+${amount} credits · ${reason}`;
        messageTimer = 2;
    }

    function makeArmoryMap() {
        const room = Array.from({ length: MAP_H }, (_, y) =>
            Array.from({ length: MAP_W }, (_, x) =>
                x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 ? 1 : 0
            )
        );
        room[15][MAP_W - 1] = 2;
        return room;
    }

    // Ensure fragments are on walkable tiles
    fragmentPositions.forEach((pos, idx) => {
        if (map[pos.y][pos.x] === 1 || map[pos.y][pos.x] === 2) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = pos.x + dx, ny = pos.y + dy;
                    if (ny >= 0 && ny < MAP_H && nx >= 0 && nx < MAP_W && map[ny][nx] === 0) {
                        fragmentPositions[idx] = { x: nx, y: ny };
                        break;
                    }
                }
            }
        }
        const p = fragmentPositions[idx];
        if (map[p.y][p.x] === 0 || map[p.y][p.x] === 4) map[p.y][p.x] = 4;
    });

    // Ceiling lamps are placed throughout open parts of the enlarged maze.
    const lamps = [];
    for (let y = 2; y < MAP_H - 2; y += 4) {
        for (let x = 2; x < MAP_W - 2; x += 4) {
            if (map[y][x] !== 0) continue;
            if (lamps.some(lamp => Math.hypot(lamp.x - x, lamp.y - y) < 5)) continue;
            lamps.push({ x: x + 0.5, y: y + 0.5 });
        }
    }
    const mazeDetails = [];
    for (let y = 2; y < MAP_H - 2; y++) {
        for (let x = 2; x < MAP_W - 2; x++) {
            if (map[y][x] !== 0 || (x < 6 && y < 6)) continue;
            const mark = (x * 37 + y * 19 + x * y * 3) % 31;
            if (mark === 0) mazeDetails.push({ x: x + 0.5, y: y + 0.5, decor: 'blood', size: 0.42 });
            else if (mark === 7) mazeDetails.push({ x: x + 0.5, y: y + 0.5, decor: 'claws', size: 0.34 });
            else if (mark === 15) mazeDetails.push({ x: x + 0.5, y: y + 0.5, decor: 'bones', size: 0.24 });
            else if (mark === 3) mazeDetails.push({ x: x + 0.5, y: y + 0.5, decor: 'paper', size: 0.28 });
            else if (mark === 11) mazeDetails.push({ x: x + 0.5, y: y + 0.5, decor: 'glass', size: 0.24 });
            else if (mark === 22) mazeDetails.push({ x: x + 0.5, y: y + 0.5, decor: 'web', size: 0.34 });
        }
    }

    // ---------- GAME STATE ----------
    let player = {
        // Face down the open corridor at the spawn point; facing east points
        // straight into the wall and makes the W key appear unresponsive.
        x: 3.5, y: 3.5, angle: Math.PI / 2,
        health: 100 + ownedUpgrades.armor * 25,
        maxHealth: 100 + ownedUpgrades.armor * 25,
        hasCode: [false, false, false, false],
        inCloset: false,
        closetCooldown: 0,
        speed: 3.0 + ownedUpgrades.boots * 0.35,
        sprintSpeed: 5.4 + ownedUpgrades.boots * 0.5,
        sprinting: false,
        weapon: 'knife',
        weapons: { ...ownedWeapons }
    };

    let monster = {
        x: 26.5, y: 27.5, angle: Math.PI,
        speed: 2.1,
        hp: 120,
        maxHp: 120,
        active: true,
        stunTimer: 0,
        lastSeenPlayer: { x: 3.5, y: 3.5 },
        searchTimer: 0,
        state: 'patrol'
    };
    // Two quieter stalkers keep the long corridors dangerous after the first chase.
    let stalkers = [];
    function resetStalkers() {
        stalkers = [
            { x: 21.5, y: 11.5, angle: Math.PI, speed: 1.45, hp: 80, maxHp: 80, stunTimer: 0, phase: 0, color: '#a54cff' },
            { x: 11.5, y: 23.5, angle: 0, speed: 1.65, hp: 80, maxHp: 80, stunTimer: 0, phase: 1.8, color: '#45d9c5' }
        ];
    }
    resetStalkers();
    let boss = { x: 25.5, y: 24.5, angle: Math.PI, hp: 1000, maxHp: 1000, speed: 1.3 };
    let bossPhase = 1;
    let shotCooldown = 0;
    let muzzleFlash = 0;

    let gameState = 'playing';
    let doorPuzzleSolved = false;
    let activePuzzle = 'exit';
    let worldMode = 'house';
    let selectedMode = 'regular';
    let gameMode = 'regular';
    let challengeMode = null;
    let disasterElapsed = 0;
    let tornado = { x: 26.5, y: 3.5 };
    let tsunamiFrontY = MAP_H - 1;
    let disasterCaches = [];
    let halloweenStage = 'yard';
    let ghost = { x:25.5,y:15.5,hp:400,maxHp:400,speed:1.45,active:true,stunTimer:0 };
    let ghostKeyPos = { x:25.5,y:15.5 };
    let ghostKeyDropped = false;
    let carKeyFound = false;
    let ghosts = [];
    let captureFX = null;
    let capturedGhosts = 0;
    let weaponCooldown = 0;
    let secretWeaponAnimationTimer = 0;
    const SECRET_WEAPON_ANIMATION_DURATION = 1.8;
    let message = '';
    let messageTimer = 0;
    let score = 0;
    let powerUpTimer = 0;
    let screenShake = 0;
    const boostPickups = [];
    const weaponPickups = [];

    const keys = { w: false, a: false, s: false, d: false, shift: false, e: false, f: false, space: false };
    let ePressed = false, fPressed = false, spacePressed = false;

    // ---------- HELPERS ----------
    function isWall(tx, ty) {
        if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return true;
        const cell = map[ty] && map[ty][tx];
        if (gameMode === 'halloween' && worldMode === 'outside' && cell === 2) return true;
        return cell === 1 || cell === 5 || cell === 6;
    }

    function canMoveTo(px, py, radius = 0.25) {
        const minX = Math.floor(px - radius);
        const maxX = Math.floor(px + radius);
        const minY = Math.floor(py - radius);
        const maxY = Math.floor(py + radius);

        for (let ty = minY; ty <= maxY; ty++) {
            for (let tx = minX; tx <= maxX; tx++) {
                if (isWall(tx, ty)) {
                    const closestX = Math.max(tx, Math.min(px, tx + 1));
                    const closestY = Math.max(ty, Math.min(py, ty + 1));
                    const dx = px - closestX;
                    const dy = py - closestY;
                    if (dx * dx + dy * dy < radius * radius) return false;
                }
            }
        }
        return true;
    }

    function updateCodeDisplay() {
        let display = '🔑 CODE: ';
        for (let i = 0; i < 4; i++) {
            display += player.hasCode[i] ? CORRECT_CODE[i] + ' ' : '? ';
        }
        document.getElementById('codeDisplay').textContent = display;
    }

    function hasFullCode() {
        return player.hasCode.every(v => v === true);
    }

    function openDoorPuzzle() {
        if(!hasFullCode()) return;
        activePuzzle = 'exit';
        gameState='puzzle';
        const puzzle=document.getElementById('doorPuzzle');
        puzzle.hidden=false;
        document.getElementById('doorPuzzleForm').classList.remove('green-keypad', 'wrong-code');
        document.getElementById('puzzleTitle').textContent='HUMAN CHECK';
        document.getElementById('puzzlePrompt').textContent='Quick check: what is 2 + 3? Enter the number to prove you are not a robot.';
        document.getElementById('puzzleLabel').textContent='Answer';
        document.getElementById('puzzleFeedback').textContent='';
        const input=document.getElementById('doorCodeInput');
        input.maxLength=2;
        input.pattern='[0-9]{1,2}';
        input.value='';
        input.focus();
    }

    function openGreenDoorPuzzle() {
        if (greenDoorOpen || !secretWall.discovered || gameMode !== 'regular' || worldMode !== 'house') return;
        activePuzzle = 'greenDoor';
        gameState = 'puzzle';
        document.getElementById('doorPuzzle').hidden = false;
        document.getElementById('doorPuzzleForm').classList.remove('wrong-code');
        document.getElementById('doorPuzzleForm').classList.add('green-keypad');
        document.getElementById('puzzleTitle').textContent = 'GREEN DOOR KEYPAD';
        document.getElementById('puzzlePrompt').textContent = 'The lock needs a 4-digit code.';
        document.getElementById('puzzleLabel').textContent = 'Door code';
        document.getElementById('puzzleFeedback').textContent = '';
        const input = document.getElementById('doorCodeInput');
        input.maxLength = 4;
        input.pattern = '[0-9]{4}';
        input.value = '';
        input.focus();
    }

    function unlockGreenDoor() {
        greenDoorOpen = true;
        map[GREEN_DOOR_POS.y][GREEN_DOOR_POS.x] = 0;
        map[9][GREEN_DOOR_POS.x] = 0;
        message = 'The green door opens. Something glows inside...';
        messageTimer = 2;
        document.getElementById('objective').textContent = 'green door open → step inside and claim the lightsaber';
    }

    function cancelDoorPuzzle() {
        document.getElementById('doorPuzzle').hidden=true;
        gameState='playing';
        if (activePuzzle === 'greenDoor') {
            player.x = GREEN_DOOR_POS.x - 0.4;
            player.y = GREEN_DOOR_POS.y + 0.5;
        } else {
            // Step back from the keypad so touching the door does not reopen it at once.
            player.x=EXIT_POS.x-0.4;
            player.y=EXIT_POS.y+0.5;
        }
    }

    const MONSTER_SIGHT_RANGE = 9;
    const MONSTER_SIGHT_ANGLE = Math.PI * 0.62;

    function monsterCanSeePlayer() {
        if (player.inCloset) return false;
        const dx = player.x - monster.x, dy = player.y - monster.y;
        const distance = Math.hypot(dx, dy);
        if (distance > MONSTER_SIGHT_RANGE) return false;
        let angle = Math.atan2(dy, dx) - monster.angle;
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        if (Math.abs(angle) > MONSTER_SIGHT_ANGLE / 2) return false;

        // Walls, the exit door, and closets block the monster's line of sight.
        const steps = Math.ceil(distance * 10);
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const x = Math.floor(monster.x + dx * t), y = Math.floor(monster.y + dy * t);
            const cell = map[y] && map[y][x];
            if (cell === undefined || cell === 1 || cell === 2 || cell === 3 || cell === 5 || cell === 6) return false;
        }
        return true;
    }

    function spawnBoostPickups() {
        boostPickups.length = 0;
        const positions = gameMode === 'halloween'
            ? [
                { x: 8.5, y: 6.5, type: 'health' },
                { x: 20.5, y: 20.5, type: 'speed' },
                { x: 23.5, y: 12.5, type: 'health' },
                { x: 12.5, y: 24.5, type: 'speed' }
            ]
            : [
                { x: 9.5, y: 6.5, type: 'health' },
                { x: 21.5, y: 8.5, type: 'speed' },
                { x: 12.5, y: 22.5, type: 'health' },
                { x: 25.5, y: 18.5, type: 'speed' }
            ];
        positions.forEach(item => boostPickups.push({ ...item, active: true }));
    }

    function spawnWeaponPickups() {
        weaponPickups.length = 0;
        const positions = gameMode === 'halloween'
            ? [
                { x: 6.5, y: 12.5, type: 'laser' },
                { x: 23.5, y: 8.5, type: 'plasma' }
            ]
            : [
                { x: 5.5, y: 12.5, type: 'laser' },
                { x: 24.5, y: 19.5, type: 'plasma' }
            ];
        positions.forEach(item => weaponPickups.push({ ...item, active: true, light: true }));
    }

    function resetGame(startInArmory = true) {
        gameMode = selectedMode;
        challengeMode = null;
        disasterElapsed = 0;
        disasterCaches = [];
        document.body.classList.toggle('halloween', gameMode === 'halloween');
        map = baseMap.flatMap(row => [row.flatMap(cell => [cell, cell]), row.flatMap(cell => [cell, cell])]);
        map[EXIT_POS.y][EXIT_POS.x] = 2;
        if (gameMode === 'regular') {
            prepareMazeRooms();
            resetRoomHunters();
        } else {
            roomHunters = [];
        }
        score = 0;
        powerUpTimer = 0;
        screenShake = 0;
        spawnBoostPickups();
        spawnWeaponPickups();

        fragmentPositions.forEach((pos) => {
            if (map[pos.y][pos.x] === 0 || map[pos.y][pos.x] === 4) map[pos.y][pos.x] = 4;
        });
        greenDoorOpen = false;
        prepareSecretRoom();
        greenDoorClueFound = false;
        secretCacheClaimed = false;

        player = {
            x: 3.5, y: 3.5, angle: Math.PI / 2,
            health: 100 + ownedUpgrades.armor * 25,
            maxHealth: 100 + ownedUpgrades.armor * 25,
            hasCode: [false, false, false, false],
            inCloset: false,
            closetCooldown: 0,
            speed: 3.0 + ownedUpgrades.boots * 0.35,
            sprintSpeed: 5.4 + ownedUpgrades.boots * 0.5,
            sprinting: false,
            weapon: 'knife',
            weapons: { ...ownedWeapons }
        };
        monster = {
            x: 26.5, y: 27.5, angle: Math.PI,
            speed: 2.1,
            hp: 120,
            maxHp: 120,
            active: true,
            stunTimer: 0,
            lastSeenPlayer: { x: 3.5, y: 3.5 },
            searchTimer: 0,
            state: 'patrol'
        };
        resetStalkers();
        boss = { x: 25.5, y: 24.5, angle: Math.PI, hp: 1000, maxHp: 1000, speed: 1.3, stunTimer: 0 };
        bossPhase = 1;
        keyGuards.forEach((guard,i) => {
            const spawn=[[16.5,2.5],[26.5,3.5],[4.5,27.5],[14.5,15.5]][i];
            guard.x=spawn[0]; guard.y=spawn[1]; guard.hp=guard.maxHp; guard.active=true;
        });
        shotCooldown = 0;
        muzzleFlash = 0;
        secretWeaponAnimationTimer = 0;

        gameState = 'playing';
        doorPuzzleSolved = false;
        document.getElementById('doorPuzzle').hidden = true;
        worldMode = 'house';
        carKeyFound = false;
        weaponCooldown = 0;
        message = '';
        messageTimer = 0;
        updateCodeDisplay();
        document.getElementById('health').textContent = Math.floor(player.health);
        document.getElementById('monsterState').textContent = '👹 UNAWARE';
        document.getElementById('monsterState').className = '';
        secretWall = { x: SECRET_WALL_POS.x + 0.5, y: SECRET_WALL_POS.y + 0.5, discovered: false };
        document.getElementById('weaponStatus').textContent = '⚡ READY';
        document.getElementById('objective').textContent = 'find 4 code fragments → solve the red door puzzle → escape';
        document.getElementById('regularMode').setAttribute('aria-pressed', String(gameMode === 'regular'));
        document.getElementById('halloweenMode').setAttribute('aria-pressed', String(gameMode === 'halloween'));
        document.getElementById('tornadoMode').setAttribute('aria-pressed', 'false');
        document.getElementById('tsunamiMode').setAttribute('aria-pressed', 'false');
        if(gameMode==='halloween') {
            startHalloweenYard();
        } else if (startInArmory) {
            worldMode = 'armory';
            map = makeArmoryMap();
            boostPickups.length = 0;
            weaponPickups.length = 0;
            player.x = 8.5; player.y = 15.5; player.angle = 0;
            document.getElementById('monsterState').textContent = '🛡️ SAFE ROOM';
            document.getElementById('objective').textContent = 'buy a weapon if you like → press ENTER THE MAZE when ready';
        } else {
            document.getElementById('monsterState').textContent = '👹 UNAWARE';
            document.getElementById('objective').textContent = 'find 4 code fragments → solve the red door puzzle → escape';
        }
        updateArmoryUI();
        updateDisasterModeButtons();
    }

    function makeHalloweenYard() {
        map=Array.from({length:MAP_H},(_,y)=>Array.from({length:MAP_W},(_,x)=>
            x===0 || y===0 || x===MAP_W-1 || y===MAP_H-1 ? 1 : 0));
        // Trees, tombstones, and garden hedges shape the yard without making a maze.
        [[7,5,2,3],[13,21,3,2],[20,6,2,3],[6,22,2,2],[19,18,1,2]].forEach(([x,y,w,h])=>{
            for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) map[yy][xx]=1;
        });
        // A single large cabin sits along the yard's eastern edge; its front door is an opening.
        for(let x=18;x<=25;x++) { map[8][x]=1; map[20][x]=1; }
        for(let y=8;y<=20;y++) { map[y][18]=1; map[y][25]=1; }
        map[15][18]=2;
    }

    function spawnGhosts() {
        ghosts = [
            { x: 7.5, y: 8.5, active: true, speed: 1.25, drift: 0.6, glow: '#b9d7ff' },
            { x: 18.5, y: 11.5, active: true, speed: 1.4, drift: 1.1, glow: '#c7f0ff' },
            { x: 23.5, y: 21.5, active: true, speed: 1.3, drift: 1.7, glow: '#dceeff' },
            { x: 11.5, y: 24.5, active: true, speed: 1.35, drift: 2.1, glow: '#b0d0ff' }
        ];
        capturedGhosts = 0;
    }

    function startHalloweenYard() {
        gameMode='halloween'; halloweenStage='yard'; worldMode='outside';
        makeHalloweenYard();
        spawnGhosts();
        score = 0;
        powerUpTimer = 0;
        screenShake = 0;
        spawnBoostPickups();
        spawnWeaponPickups();
        player.x=2.5; player.y=15.5; player.angle=0; player.health=player.maxHealth; player.inCloset=false;
        player.weapon = ownedWeapons.pistol ? 'pistol' : 'knife';
        player.weapons = { ...ownedWeapons };
        document.getElementById('health').textContent=Math.floor(player.health);
        monster.active=false; carKeyFound=false; ghostKeyDropped=false;
        boss={x:14.5,y:15.5,angle:Math.PI,hp:500,maxHp:500,speed:1.35,stunTimer:0}; bossPhase=1;
        document.getElementById('codeDisplay').textContent='🎃 HALLOWEEN';
        document.getElementById('monsterState').textContent='👻 GHOST HUNT';
        document.getElementById('weaponStatus').textContent='🔫 READY';
        document.getElementById('objective').textContent='chase the ghosts with your flashlight → press G near them to trap them in a capsule';
        message='The yard is crawling with ghosts. Chase them down and trap them!'; messageTimer=2.5;
        updateArmoryUI();
    }

    function enterMazeFromArmory() {
        if (gameMode !== 'regular' || worldMode !== 'armory') return;
        const selectedWeapon = player.weapon;
        resetGame(false);
        player.weapon = selectedWeapon;
        updateArmoryUI();
        message = 'The safe room door locks behind you. Find the code fragments.';
        messageTimer = 2.5;
    }

    function enterHalloweenHouse() {
        halloweenStage='house'; worldMode='house';
        score += 25;
        spawnBoostPickups();
        map=Array.from({length:MAP_H},(_,y)=>Array.from({length:MAP_W},(_,x)=>
            x===0 || y===0 || x===MAP_W-1 || y===MAP_H-1 ? 1 : 0));
        // A few rooms and short hallways make this a house, not another maze.
        [[8,8,3,2],[15,20,3,2],[22,8,2,3],[7,22,2,2]].forEach(([x,y,w,h])=>{
            for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) map[yy][xx]=1;
        });
        map[15][0]=2;
        player.x=2.5; player.y=15.5; player.angle=0; player.health=player.maxHealth;
        ghost={x:25.5,y:15.5,hp:400,maxHp:400,speed:1.5,active:true,stunTimer:0};
        ghostKeyPos={x:ghost.x,y:ghost.y}; ghostKeyDropped=false; carKeyFound=false;
        document.getElementById('health').textContent=Math.floor(player.health);
        document.getElementById('monsterState').textContent='👻 GHOST ACTIVE';
        document.getElementById('objective').textContent='defeat the ghost → pick up the car key → leave through the front door';
        message='The ghost has the car key. Shoot it to make it drop the key!'; messageTimer=3;
    }

    function returnToHalloweenYard() {
        halloweenStage='escape'; worldMode='outside'; makeHalloweenYard();
        player.x=17.5; player.y=15.5; player.angle=0;
        document.getElementById('monsterState').textContent='🚗 FIND THE CAR';
        document.getElementById('objective').textContent='car key found → reach the car and press F';
        message='You made it outside. Reach the car to escape!'; messageTimer=2.5;
    }

    function enterOutside() {
        worldMode = 'outside';
        map = Array.from({ length: MAP_H }, (_, y) =>
            Array.from({ length: MAP_W }, (_, x) =>
                x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 ? 1 : 0
            )
        );
        // A few hedge and stone patches give the yard shape while leaving paths open.
        [[7,6,3,4],[19,6,3,3],[7,19,3,3],[19,18,3,4]].forEach(([x,y,w,h]) => {
            for (let yy=y; yy<y+h; yy++) for (let xx=x; xx<x+w; xx++) map[yy][xx]=1;
        });
        player.x = 2.5; player.y = 2.5; player.angle = 0;
        player.health = player.maxHealth;
        document.getElementById('health').textContent = Math.floor(player.health);
        player.inCloset = false;
        monster.active = false;
        carKeyFound = false;
        document.getElementById('monsterState').textContent = '👾 BOSS ACTIVE';
        document.getElementById('monsterState').className = '';
        document.getElementById('weaponStatus').textContent = '🔫 READY';
        boss = { x: 25.5, y: 24.5, angle: Math.PI, hp: 1000, maxHp: 1000, speed: 1.3, stunTimer: 0 };
        bossPhase = 1;
        document.getElementById('objective').textContent = 'defeat the boss → find the car key 🔑 → escape';
        message = 'Boss fight! Click or press G to shoot.';
        messageTimer = 3;
    }

    function startDisasterMode(mode) {
        if (!disasterModesUnlocked || !['tornado', 'tsunami'].includes(mode)) return;
        gameMode = 'regular';
        challengeMode = mode;
        worldMode = 'outside';
        gameState = 'playing';
        document.body.classList.remove('halloween');
        map = Array.from({ length: MAP_H }, (_, y) =>
            Array.from({ length: MAP_W }, (_, x) =>
                x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 ? 1 : 0
            )
        );
        [[7,8,2,3],[20,7,2,3],[9,19,3,2],[21,20,2,2]].forEach(([x,y,w,h]) => {
            for (let yy=y; yy<y+h; yy++) for (let xx=x; xx<x+w; xx++) map[yy][xx]=1;
        });
        player.x = mode === 'tornado' ? 2.5 : 15.5;
        player.y = 26.5;
        player.angle = -Math.PI / 2;
        player.health = player.maxHealth;
        player.inCloset = false;
        player.hasCode = [false, false, false, false];
        player.weapon = ownedWeapons.pistol ? 'pistol' : 'knife';
        player.weapons = { ...ownedWeapons };
        carKeyFound = false;
        boss = { x: 25.5, y: 24.5, angle: Math.PI, hp: 0, maxHp: 1000, speed: 1.3, stunTimer: 0 };
        bossPhase = 1;
        monster.active = false;
        stalkers.forEach(stalker => { stalker.active = false; });
        keyGuards.forEach(guard => { guard.active = false; });
        ghosts = [];
        spawnBoostPickups();
        spawnWeaponPickups();
        disasterElapsed = 0;
        tornado = { x: 26.5, y: 3.5 };
        tsunamiFrontY = MAP_H - 1;
        disasterCaches = mode === 'tornado'
            ? [{ x: 5.5, y: 6.5 }, { x: 23.5, y: 11.5 }, { x: 15.5, y: 22.5 }].map(cache => ({ ...cache, active: true }))
            : [];
        shotCooldown = 0;
        weaponCooldown = 0;
        powerUpTimer = 0;
        score = 0;
        document.getElementById('health').textContent = Math.floor(player.health);
        document.getElementById('codeDisplay').textContent = mode === 'tornado' ? '🌪️ TORNADO RUN' : '🌊 TSUNAMI ESCAPE';
        document.getElementById('monsterState').textContent = mode === 'tornado' ? '🌪️ STORM APPROACHING' : '🌊 WAVE APPROACHING';
        document.getElementById('objective').textContent = mode === 'tornado'
            ? 'collect 3 supply crates → reach the car and press F'
            : 'race north to the high-ground marker before the tsunami reaches you';
        document.getElementById('regularMode').setAttribute('aria-pressed', 'false');
        document.getElementById('halloweenMode').setAttribute('aria-pressed', 'false');
        document.getElementById('tornadoMode').setAttribute('aria-pressed', String(mode === 'tornado'));
        document.getElementById('tsunamiMode').setAttribute('aria-pressed', String(mode === 'tsunami'));
        updateArmoryUI();
        message = mode === 'tornado'
            ? 'The storm is closing in! Grab the supplies and get out!'
            : 'The tsunami is coming! Run north to the high ground!';
        messageTimer = 3;
    }

    function damageBoss(damage) {
        boss.hp = Math.max(0, boss.hp - damage);
        if (boss.hp > 0) return;
        if (gameMode === 'regular' && bossPhase === 1) {
            awardMoney(35, 'boss form defeated');
            bossPhase = 2;
            boss = { x: 25.5, y: 24.5, angle: Math.PI, hp: 300, maxHp: 300, speed: 1.75, stunTimer: 0 };
            message = 'The boss split apart! Its smaller pieces are still coming!';
            document.getElementById('objective').textContent = 'phase 2: destroy the boss fragments → find the car key 🔑 → escape';
        } else if (gameMode === 'halloween') {
            awardMoney(60, 'scarecrow defeated');
            halloweenStage = 'enter-house';
            document.getElementById('monsterState').textContent = '🌾 SCARECROW DOWN';
            message = 'The scarecrow falls. The house door is open!';
            document.getElementById('objective').textContent = 'scarecrow defeated → go to the cabin door and press E';
        } else {
            awardMoney(100, 'boss defeated');
            document.getElementById('objective').textContent = carKeyFound
                ? 'boss defeated → reach the car 🚗 → press F'
                : 'boss defeated → find the car key 🔑 → escape';
            document.getElementById('monsterState').textContent = '👾 BOSS DOWN';
            message = 'Boss fragments destroyed! Find the car key!';
        }
        messageTimer = 2;
    }

    function useWeapon() {
        if (gameState !== 'playing' || player.inCloset || weaponCooldown > 0) return;
        const activeWeapon = player.weapon in WEAPON_DEFS ? player.weapon : 'pistol';
        const weaponInfo = WEAPON_DEFS[activeWeapon];
        weaponCooldown = weaponInfo.cooldown;
        screenShake = 0.35;

        const enemyList = [];
        if (gameMode === 'regular' && worldMode === 'house' && monster.active) enemyList.push({ entity: monster, label: 'Hunter', type: 'monster' });
        if (gameMode === 'regular' && worldMode === 'house') enemyList.push(...stalkers.map(entity => ({ entity, label: 'Stalker', type: 'stalker' })));
        if (gameMode === 'regular' && worldMode === 'house') enemyList.push(...roomHunters.map(entity => ({ entity, label: entity.name, type: 'roomHunter' })));
        if (gameMode === 'regular' && worldMode === 'outside' && boss.hp > 0) enemyList.push({ entity: boss, label: 'Boss', type: 'boss' });
        if (gameMode === 'halloween' && worldMode === 'outside' && boss.hp > 0) enemyList.push({ entity: boss, label: 'Scarecrow', type: 'boss' });
        if (gameMode === 'halloween' && worldMode === 'house' && ghost.active) enemyList.push({ entity: ghost, label: 'Ghost', type: 'ghost' });
        if (gameMode === 'regular' && worldMode === 'house') enemyList.push(...keyGuards.filter(g => g.active).map(entity => ({ entity, label: `Guardian`, type: 'guard' })));

        const targets = enemyList
            .filter(target => target.entity && target.entity.active !== false && (target.entity.stunTimer === undefined || target.entity.stunTimer <= 0))
            .map(target => {
                const dx = target.entity.x - player.x;
                const dy = target.entity.y - player.y;
                const distance = Math.hypot(dx, dy);
                let angle = Math.atan2(dy, dx) - player.angle;
                while (angle > Math.PI) angle -= Math.PI * 2;
                while (angle < -Math.PI) angle += Math.PI * 2;
                const reach = weaponInfo.range;
                const aim = weaponInfo.aim;
                let clear = distance <= reach && Math.abs(angle) <= aim;
                if (clear) for (let i = 1, steps = Math.ceil(distance * 12); i < steps; i++) {
                    const t = i / steps;
                    const cell = map[Math.floor(player.y + dy * t)]?.[Math.floor(player.x + dx * t)];
                    if (cell === undefined || cell === 1 || cell === 2 || cell === 3 || cell === 6) { clear = false; break; }
                }
                return { ...target, distance, clear };
            })
            .filter(target => target.clear)
            .sort((a, b) => a.distance - b.distance);

        if (!targets.length) {
            message = `${weaponInfo.icon} No target in range`;
            messageTimer = 1.5;
            return;
        }

        const target = targets[0];
        if (weaponInfo.effect !== 'stun') {
            const damage = weaponInfo.damage;
            if (target.type === 'boss' && gameMode === 'regular') {
                damageBoss(damage);
                if (boss.hp > 0) message = `Hit ${target.label}! ${boss.hp}/${boss.maxHp} HP`;
            } else if (target.type === 'boss' && gameMode === 'halloween') {
                damageBoss(damage);
            } else if (typeof target.entity.hp === 'number') {
                target.entity.hp = Math.max(0, target.entity.hp - damage);
                if (target.entity.hp <= 0) {
                    target.entity.active = false;
                    const reward = target.type === 'guard' ? 45 : target.type === 'stalker' ? 35 : target.type === 'roomHunter' ? 50 : target.type === 'monster' ? 70 : target.type === 'ghost' ? 80 : 0;
                    if (reward) awardMoney(reward, `${target.label.toLowerCase()} defeated`);
                    message = `${weaponInfo.icon} ${target.label} defeated${reward ? ` · +${reward} credits` : ''}!`;
                    if (target.type === 'ghost') {
                        ghostKeyDropped = true;
                        ghostKeyPos = { x: ghost.x, y: ghost.y };
                        document.getElementById('monsterState').textContent = '👻 GHOST DEFEATED';
                        document.getElementById('objective').textContent = 'pick up the dropped car key → leave through the front door';
                    }
                } else {
                    message = `${weaponInfo.icon} ${target.label} hit!`;
                }
            } else {
                target.entity.active = false;
                message = `${weaponInfo.icon} ${target.label} eliminated!`;
            }
        } else {
            target.entity.stunTimer = STUN_DURATION;
            if (target.type === 'monster' && target.entity.state) target.entity.state = 'stunned';
            message = `${weaponInfo.icon} ${target.label} stunned!`;
        }
        messageTimer = 1.5;
    }

    function useCar() {
        if (gameState !== 'playing' || worldMode !== 'outside') return;
        if (challengeMode === 'tornado') {
            if (disasterCaches.some(cache => cache.active)) {
                message = `Find all 3 supply crates first · ${3 - disasterCaches.filter(cache => !cache.active).length} left`;
                messageTimer = 1.8;
                return;
            }
            if (Math.hypot(player.x-CAR_POS.x, player.y-CAR_POS.y) > 2.4) {
                message = 'Supplies secured! Get to the car and press F.';
                messageTimer = 1.8;
                return;
            }
            gameState = 'won';
            awardMoney(125, 'tornado escape');
            message = 'You escaped the tornado! +125 credits';
            messageTimer = 3;
            return;
        }
        if (challengeMode === 'tsunami') {
            message = 'The car is gone. Run to the north ridge!';
            messageTimer = 1.8;
            return;
        }
        if (!carKeyFound) {
            message='You need the car key first!';
            messageTimer=1.5;
            return;
        }
        if (Math.hypot(player.x-CAR_POS.x,player.y-CAR_POS.y) <= 2.4) {
            if (gameMode==='regular' && (bossPhase === 1 || boss.hp > 0)) {
                message='Defeat the boss before you can escape!';
                messageTimer=2;
                return;
            }
            gameState='won';
            awardMoney(gameMode === 'regular' ? 200 : 150, 'escape bonus');
            message=`You escaped! +${gameMode === 'regular' ? 200 : 150} credits`;
            messageTimer=3;
            if (gameMode === 'regular' && challengeMode === null && !disasterModesUnlocked) {
                disasterModesUnlocked = true;
                saveProgress();
                updateDisasterModeButtons();
                message = 'You escaped! 🌪️ Tornado and 🌊 Tsunami modes unlocked!';
                messageTimer = 5;
            }
        } else {
            message='Get closer to the car to use F.';
            messageTimer=1.5;
        }
    }

    function captureNearestGhost() {
        if (gameMode !== 'halloween' || gameState !== 'playing') return;
        let best = null;
        let bestDist = Infinity;
        for (const ghostObj of ghosts) {
            if (!ghostObj.active) continue;
            const dx = ghostObj.x - player.x;
            const dy = ghostObj.y - player.y;
            const dist = Math.hypot(dx, dy);
            if (dist < bestDist) {
                bestDist = dist;
                best = ghostObj;
            }
        }
        if (!best || bestDist > 1.9) {
            message = 'Get closer to a ghost, then press G to trap it.';
            messageTimer = 1.5;
            return;
        }
        best.active = false;
        capturedGhosts += 1;
        awardMoney(15, 'ghost captured');
        captureFX = { x: best.x, y: best.y, life: 0.9, maxLife: 0.9 };
        message = `Ghost captured! ${capturedGhosts}/${ghosts.length} · +15 credits`;
        messageTimer = 1.8;
        if (capturedGhosts >= ghosts.length) {
            document.getElementById('monsterState').textContent = '✅ ALL GHOSTS CAPTURED';
            document.getElementById('objective').textContent = 'all ghosts trapped → head inside and finish the hunt';
        }
    }

    function shootBoss() {
        if (gameState !== 'playing' || shotCooldown > 0) return;
        if (challengeMode) {
            message = challengeMode === 'tornado'
                ? 'Weapons cannot stop the tornado—grab the supplies and run!'
                : 'The tsunami is unstoppable—run for the high ground!';
            messageTimer = 1.5;
            return;
        }
        if(gameMode==='halloween') {
            if (halloweenStage === 'yard') {
                if (shootScarecrow()) return;
                if (ghosts.some(g => g.active)) {
                    captureNearestGhost();
                }
                return;
            }
            if(halloweenStage==='house') {
                if (ghost.active) shootGhost();
                return;
            }
            return;
        }
        if (worldMode === 'house') {
            if (player.weapon === 'pistol') shootKeyGuard();
            else useWeapon();
            return;
        }
        if (worldMode !== 'outside') return;
        if (player.weapon === 'lightsaber') {
            ctx.save();
            ctx.translate(68, 4 + stride * 0.25);
            ctx.rotate(-0.3 + sway * 0.001);
            ctx.shadowColor = '#42dfff';
            ctx.shadowBlur = 28;
            ctx.strokeStyle = '#44dfff';
            ctx.lineWidth = 23;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 8);
            ctx.lineTo(0, -142);
            ctx.stroke();
            ctx.strokeStyle = '#e8ffff';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(0, 4);
            ctx.lineTo(0, -136);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#303942';
            ctx.fillRect(-9, 12, 18, 50);
            ctx.fillStyle = '#aab5bd';
            ctx.fillRect(-16, 10, 32, 8);
            ctx.fillStyle = '#455663';
            ctx.fillRect(-7, 24, 14, 5);
            ctx.fillRect(-7, 38, 14, 5);
            ctx.fillRect(-7, 52, 14, 5);
            ctx.restore();
        } else if (player.weapon === 'knife') {
            useWeapon();
            return;
        }
        const weaponInfo = WEAPON_DEFS[player.weapon] || WEAPON_DEFS.pistol;
        shotCooldown = weaponInfo.cooldown;
        muzzleFlash = 0.09;
        if (bossPhase === 2 && boss.hp <= 0) return;
        const dx=boss.x-player.x, dy=boss.y-player.y, distance=Math.hypot(dx,dy);
        let angle=Math.atan2(dy,dx)-player.angle;
        while(angle>Math.PI) angle-=Math.PI*2;
        while(angle< -Math.PI) angle+=Math.PI*2;
        if(distance>weaponInfo.range || Math.abs(angle)>weaponInfo.aim) return;
        const steps=Math.ceil(distance*12);
        for(let i=1;i<steps;i++) {
            const t=i/steps, x=Math.floor(player.x+dx*t), y=Math.floor(player.y+dy*t);
            const cell=map[y] && map[y][x];
            if(cell===undefined || cell===1) return;
        }
        damageBoss(weaponInfo.damage);
        if (boss.hp > 0) message=`Phase ${bossPhase} hit! Boss health: ${boss.hp}/${boss.maxHp}`;
        messageTimer=1.1;
    }

    function shootScarecrow() {
        const dx=boss.x-player.x,dy=boss.y-player.y,distance=Math.hypot(dx,dy);
        const weaponInfo = WEAPON_DEFS[player.weapon] || WEAPON_DEFS.pistol;
        let angle=Math.atan2(dy,dx)-player.angle;
        while(angle>Math.PI) angle-=Math.PI*2;
        while(angle< -Math.PI) angle+=Math.PI*2;
        if(distance>weaponInfo.range || Math.abs(angle)>weaponInfo.aim || !lineOfSight(player.x,player.y,boss.x,boss.y)) return false;
        shotCooldown=weaponInfo.cooldown; muzzleFlash=0.09; screenShake = 0.32;
        boss.hp=Math.max(0,boss.hp-weaponInfo.damage);
        if(boss.hp===0) {
            awardMoney(60, 'scarecrow defeated');
            halloweenStage='enter-house';
            document.getElementById('monsterState').textContent='🌾 SCARECROW DOWN';
            message='The scarecrow falls. The house door is open!'; messageTimer=2;
            document.getElementById('objective').textContent='scarecrow defeated → go to the cabin door and press E';
        } else { message=`Scarecrow hit! ${boss.hp}/${boss.maxHp} HP`; messageTimer=1; }
        return true;
    }

    function shootGhost() {
        const weaponInfo = WEAPON_DEFS[player.weapon] || WEAPON_DEFS.pistol;
        shotCooldown=weaponInfo.cooldown; muzzleFlash=0.08; screenShake = 0.3;
        if(!ghost.active) return;
        const dx=ghost.x-player.x,dy=ghost.y-player.y,distance=Math.hypot(dx,dy);
        let angle=Math.atan2(dy,dx)-player.angle;
        while(angle>Math.PI) angle-=Math.PI*2;
        while(angle< -Math.PI) angle+=Math.PI*2;
        if(distance>weaponInfo.range || Math.abs(angle)>weaponInfo.aim || !lineOfSight(player.x,player.y,ghost.x,ghost.y)) return;
        ghost.hp=Math.max(0,ghost.hp-weaponInfo.damage);
        if(ghost.hp===0) {
            ghost.active=false; ghostKeyDropped=true; ghostKeyPos={x:ghost.x,y:ghost.y};
            awardMoney(80, 'ghost defeated');
            document.getElementById('monsterState').textContent='👻 GHOST DEFEATED';
            document.getElementById('objective').textContent='pick up the dropped car key → leave through the front door';
            message='The ghost dropped the car key!';
        } else message=`Ghost hit! ${ghost.hp}/${ghost.maxHp} HP`;
        messageTimer=1.5;
    }

    function shootKeyGuard() {
        shotCooldown=0.2;
        muzzleFlash=0.08; screenShake = 0.28;
        let target=null, bestDistance=Infinity;
        for(const guard of keyGuards) {
            if(!guard.active) continue;
            const dx=guard.x-player.x, dy=guard.y-player.y, distance=Math.hypot(dx,dy);
            let angle=Math.atan2(dy,dx)-player.angle;
            while(angle>Math.PI) angle-=Math.PI*2;
            while(angle< -Math.PI) angle+=Math.PI*2;
            if(distance>8 || Math.abs(angle)>0.2) continue;
            let clear=true;
            for(let i=1,steps=Math.ceil(distance*12);i<steps;i++) {
                const t=i/steps, cell=map[Math.floor(player.y+dy*t)]?.[Math.floor(player.x+dx*t)];
                if(cell===undefined || cell===1 || cell===2 || cell===3 || cell===6) { clear=false; break; }
            }
            if(clear && distance<bestDistance) { target=guard; bestDistance=distance; }
        }
        if(!target) { message='No key guardian in your sights'; messageTimer=1.2; return; }
        target.hp=Math.max(0,target.hp-20);
        if(target.hp===0) {
            target.active=false;
            awardMoney(45, 'key guardian defeated');
            message=`Key guardian defeated! Fragment ${keyGuards.indexOf(target)+1} is unprotected.`;
        } else message=`Guardian hit! ${target.hp}/${target.maxHp} HP`;
        messageTimer=1.4;
    }

    function updateBoss(dt) {
        if (gameState !== 'playing' || worldMode !== 'outside' || boss.hp <= 0) return;
        if (boss.stunTimer > 0) {
            boss.stunTimer = Math.max(0, boss.stunTimer - dt);
            if (boss.stunTimer === 0) {
                document.getElementById('monsterState').textContent = gameMode === 'halloween' ? '🌾 SCARECROW ACTIVE' : '👾 BOSS ACTIVE';
            }
            return;
        }
        const dx=player.x-boss.x, dy=player.y-boss.y, distance=Math.hypot(dx,dy);
        if(distance>0.1) {
            boss.angle=Math.atan2(dy,dx);
            const move=Math.min(boss.speed*dt,distance);
            const directions=[boss.angle,boss.angle+0.65,boss.angle-0.65,boss.angle+1.4,boss.angle-1.4];
            for(const angle of directions) {
                const nx=boss.x+Math.cos(angle)*move, ny=boss.y+Math.sin(angle)*move;
                if(canMoveTo(nx,boss.y,0.38)) boss.x=nx;
                if(canMoveTo(boss.x,ny,0.38)) boss.y=ny;
                if(Math.hypot(player.x-boss.x,player.y-boss.y)<distance) break;
            }
        }
        if(distance<1.15) {
            player.health=Math.max(0,player.health-24*dt);
            if(player.health<=0) { gameState='lost'; message='THE BOSS GOT YOU...'; }
        }
    }

    function updateGhost(dt) {
        if (gameMode !== 'halloween' || gameState !== 'playing') return;

        if (ghosts.length > 0) {
            for (const ghostObj of ghosts) {
                if (!ghostObj.active) continue;
                const dx = player.x - ghostObj.x;
                const dy = player.y - ghostObj.y;
                const distance = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);
                const step = Math.min(ghostObj.speed * dt, Math.max(0.15, distance - 0.6));
                if (distance > 0.8) {
                    const nx = ghostObj.x + Math.cos(angle) * step;
                    const ny = ghostObj.y + Math.sin(angle) * step;
                    if (canMoveTo(nx, ghostObj.y, 0.25)) ghostObj.x = nx;
                    if (canMoveTo(ghostObj.x, ny, 0.25)) ghostObj.y = ny;
                } else {
                    player.health = Math.max(0, player.health - 26 * dt);
                    if (player.health <= 0) {
                        gameState = 'lost';
                        message = 'THE GHOSTS CAUGHT YOU...';
                    }
                }
            }
            if (capturedGhosts >= ghosts.length && gameMode === 'halloween') {
                document.getElementById('monsterState').textContent = '✅ NIGHT CLEARED';
            }
        }

        if (gameMode !== 'halloween' || halloweenStage !== 'house' || !ghost.active) return;
        if (ghost.stunTimer > 0) {
            ghost.stunTimer = Math.max(0, ghost.stunTimer - dt);
            if (ghost.stunTimer === 0) {
                document.getElementById('monsterState').textContent = '👻 GHOST ACTIVE';
            }
            return;
        }
        const dx=player.x-ghost.x,dy=player.y-ghost.y,distance=Math.hypot(dx,dy);
        if(distance>0.85) {
            const angle=Math.atan2(dy,dx),step=Math.min(ghost.speed*dt,distance-0.7);
            const nx=ghost.x+Math.cos(angle)*step,ny=ghost.y+Math.sin(angle)*step;
            if(canMoveTo(nx,ghost.y,0.28)) ghost.x=nx;
            if(canMoveTo(ghost.x,ny,0.28)) ghost.y=ny;
        } else {
            player.health=Math.max(0,player.health-26*dt);
            if(player.health<=0) { gameState='lost'; message='THE GHOST CAUGHT YOU...'; }
        }
    }

    // ---------- INTERACTION ----------
    function interact() {
        if (gameState !== 'playing') return;

        if (gameMode === 'regular' && worldMode === 'armory') {
            enterMazeFromArmory();
            return;
        }

        if(gameMode==='halloween' && worldMode==='outside' && halloweenStage==='enter-house' && Math.hypot(player.x-18.5,player.y-15.5)<2.2) {
            enterHalloweenHouse();
            return;
        }

        if (player.inCloset) {
            player.inCloset = false;
            player.closetCooldown = 0.8;
            monster.state = 'hunt';
            message = 'You leave the closet...';
            messageTimer = 1.2;
            return;
        }

        if (gameMode === 'regular' && worldMode === 'house' && secretWall.discovered &&
            !greenDoorClueFound && Math.hypot(player.x - 8.5, player.y - 9.5) < 1.2) {
            greenDoorClueFound = true;
            message = 'The note reads: “First, second, third, fourth. 1 · 2 · 3 · 4.”';
            messageTimer = 3.5;
            document.getElementById('objective').textContent = 'clue found → use 1234 on the green door keypad';
            return;
        }

        if (Math.hypot(player.x - GREEN_DOOR_POS.x - 0.5, player.y - GREEN_DOOR_POS.y - 0.5) < 1.8 &&
            !greenDoorOpen && gameMode === 'regular' && worldMode === 'house' && secretWall.discovered) {
            openGreenDoorPuzzle();
            return;
        }

        const tx = Math.floor(player.x);
        const ty = Math.floor(player.y);
        if (map[ty] && map[ty][tx] === 3) {
            player.inCloset = true;
            player.closetCooldown = 0.5;
            monster.state = 'search';
            monster.searchTimer = 3.5;
            message = 'You hide in the closet. The monster loses track...';
            messageTimer = 2.0;
        }
    }

    function collectBoosts() {
        for (const pickup of boostPickups) {
            if (!pickup.active) continue;
            if (Math.hypot(player.x - pickup.x, player.y - pickup.y) < 0.8) {
                pickup.active = false;
                if (pickup.type === 'health') {
                    player.health = Math.min(player.maxHealth, player.health + 25);
                    score += 20;
                    message = '💚 Health boost!';
                } else {
                    powerUpTimer = 6.5;
                    score += 25;
                    message = '⚡ Speed boost!';
                }
                messageTimer = 1.8;
                document.getElementById('health').textContent = Math.floor(player.health);
            }
        }
    }

    function collectDisasterCaches() {
        if (challengeMode !== 'tornado') return;
        for (const cache of disasterCaches) {
            if (!cache.active || Math.hypot(player.x-cache.x, player.y-cache.y) >= 0.9) continue;
            cache.active = false;
            const remaining = disasterCaches.filter(item => item.active).length;
            message = remaining ? `Supply crate secured · ${remaining} left` : 'All supplies secured! Reach the car and press F!';
            messageTimer = 2;
            document.getElementById('objective').textContent = remaining
                ? `collect the remaining ${remaining} supply crate${remaining === 1 ? '' : 's'} → reach the car`
                : 'all supplies secured → reach the car and press F';
        }
    }

    function updateDisasterChallenge(dt) {
        if (!challengeMode || gameState !== 'playing') return;
        disasterElapsed += dt;
        if (challengeMode === 'tornado') {
            const dx = player.x - tornado.x, dy = player.y - tornado.y;
            const distance = Math.hypot(dx, dy);
            if (distance > 0.5) {
                const step = Math.min(0.8 * dt, distance - 0.5);
                const nextX = tornado.x + dx / distance * step;
                const nextY = tornado.y + dy / distance * step;
                if (canMoveTo(nextX, tornado.y, 0.35)) tornado.x = nextX;
                if (canMoveTo(tornado.x, nextY, 0.35)) tornado.y = nextY;
            }
            if (distance < 2.1) {
                player.health = Math.max(0, player.health - (distance < 1.1 ? 32 : 14) * dt);
                screenShake = Math.max(screenShake, 0.08);
                if (player.health <= 0) {
                    gameState = 'lost';
                    message = 'THE TORNADO TORE THROUGH THE YARD...';
                    messageTimer = 3;
                }
            }
            document.getElementById('monsterState').textContent = distance < 5 ? '🌪️ TORNADO NEARBY' : '🌪️ STORM APPROACHING';
        } else {
            tsunamiFrontY = MAP_H - 1 - disasterElapsed * 0.85;
            if (player.y >= tsunamiFrontY - 0.6 && player.y > 3.8) {
                player.health = Math.max(0, player.health - 48 * dt);
                screenShake = Math.max(screenShake, 0.12);
                if (player.health <= 0) {
                    gameState = 'lost';
                    message = 'THE TSUNAMI SWEPT YOU AWAY...';
                    messageTimer = 3;
                }
            }
            if (player.y <= 3.2 && Math.abs(player.x - 15.5) <= 4.5) {
                gameState = 'won';
                awardMoney(175, 'tsunami escape');
                message = 'You reached high ground! +175 credits';
                messageTimer = 3;
            }
            document.getElementById('monsterState').textContent = `🌊 WAVE ${Math.max(0, tsunamiFrontY).toFixed(0)}m`;
        }
    }

    function switchWeapon() {
        if (gameState !== 'playing') return;
        const available = Object.keys(WEAPON_DEFS).filter(weapon => player.weapons[weapon]);
        if (available.length <= 1) {
            message = available.length ? `Only ${WEAPON_DEFS[available[0]].label} is unlocked.` : 'No weapon unlocked.';
            messageTimer = 1.4;
            return;
        }
        const currentIndex = available.indexOf(player.weapon);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % available.length : 0;
        player.weapon = available[nextIndex];
        updateArmoryUI();
        message = `Switched to ${WEAPON_DEFS[player.weapon].label}!`;
        messageTimer = 1.2;
    }

    function buyOrEquipWeapon(weapon) {
        if (gameMode !== 'regular' || worldMode !== 'armory' || !(weapon in WEAPON_DEFS)) return;
        if (weapon === 'lightsaber' && !ownedWeapons.lightsaber) return;
        const price = WEAPON_PRICES[weapon] || 0;
        if (!ownedWeapons[weapon]) {
            if (money < price) {
                message = `You need ${price - money} more credits.`;
                messageTimer = 1.5;
                return;
            }
            money -= price;
            ownedWeapons[weapon] = true;
            saveProgress();
        }
        player.weapons[weapon] = true;
        player.weapon = weapon;
        updateArmoryUI();
        message = `${WEAPON_DEFS[weapon].label} equipped.`;
        messageTimer = 1.5;
    }

    function buyUpgrade(upgrade) {
        if (gameMode !== 'regular' || worldMode !== 'armory' || !(upgrade in UPGRADE_DEFS)) return;
        const level = ownedUpgrades[upgrade];
        if (level >= UPGRADE_PRICES[upgrade].length) return;
        const price = UPGRADE_PRICES[upgrade][level];
        if (money < price) {
            message = `You need ${price - money} more credits.`;
            messageTimer = 1.5;
            return;
        }
        money -= price;
        ownedUpgrades[upgrade] += 1;
        if (upgrade === 'armor') {
            player.maxHealth = 100 + ownedUpgrades.armor * 25;
            player.health = player.maxHealth;
        } else {
            player.speed = 3 + ownedUpgrades.boots * 0.35;
            player.sprintSpeed = 5.4 + ownedUpgrades.boots * 0.5;
        }
        saveProgress();
        updateArmoryUI();
        document.getElementById('health').textContent = Math.floor(player.health);
        message = `${UPGRADE_DEFS[upgrade].label} upgraded to level ${ownedUpgrades[upgrade]}!`;
        messageTimer = 2;
    }

    function trySecretWall() {
        if (secretWall.discovered || gameMode !== 'regular' || gameState !== 'playing') return;
        if (Math.hypot(player.x - secretWall.x, player.y - secretWall.y) < 1.1) {
            secretWall.discovered = true;
            const sx = Math.floor(secretWall.x);
            const sy = Math.floor(secretWall.y);
            if (map[sy] && map[sy][sx] === 5) map[sy][sx] = 0;
            player.weapons.laser = true;
            ownedWeapons.laser = true;
            saveProgress();
            player.weapon = 'laser';
            score += 200;
            message = 'A hidden room opens. LASER MINIGUN acquired!';
            messageTimer = 3.2;
            document.getElementById('objective').textContent = 'secret room found → open the green door with E to claim the lightsaber';
            updateArmoryUI();
        }
    }

    function collectSecretCache() {
        if (!secretWall.discovered || secretCacheClaimed || gameMode !== 'regular' || worldMode !== 'house') return;
        if (Math.hypot(player.x - 9.5, player.y - 8.5) >= 0.85) return;
        secretCacheClaimed = true;
        player.health = Math.min(player.maxHealth, player.health + 25);
        document.getElementById('health').textContent = Math.floor(player.health);
        awardMoney(150, 'secret room cache');
        document.getElementById('objective').textContent = 'secret cache claimed → find the four code fragments and escape';
    }

    function collectLightsaber() {
        if (gameMode !== 'regular' || worldMode !== 'house' || !greenDoorOpen || ownedWeapons.lightsaber) return;
        if (Math.hypot(player.x - 12.5, player.y - 8.5) >= 0.8) return;
        ownedWeapons.lightsaber = true;
        player.weapons.lightsaber = true;
        player.weapon = 'lightsaber';
        saveProgress();
        updateArmoryUI();
        message = 'LIGHTSABER acquired! Press V to switch weapons.';
        messageTimer = 3;
    }

    function collectWeaponPickups() {
        for (const pickup of weaponPickups) {
            if (!pickup.active) continue;
            if (Math.hypot(player.x - pickup.x, player.y - pickup.y) < 0.8) {
                pickup.active = false;
                player.weapons[pickup.type] = true;
                ownedWeapons[pickup.type] = true;
                saveProgress();
                player.weapon = pickup.type;
                updateArmoryUI();
                const weaponName = WEAPON_DEFS[pickup.type].label;
                const pickupFlavor = pickup.type === 'laser'
                    ? 'You stepped into the light and claimed the laser minigun.'
                    : 'The plasma rifle hums to life.';
                message = `${pickupFlavor} ${weaponName} equipped!`;
                messageTimer = 2.5;
                score += pickup.type === 'laser' ? 150 : 80;
            }
        }
    }

    function tryPickupFragments() {
        const tx = Math.floor(player.x);
        const ty = Math.floor(player.y);
        if (map[ty] && map[ty][tx] === 4) {
            for (let i = 0; i < fragmentPositions.length; i++) {
                const fp = fragmentPositions[i];
                if (fp.x === tx && fp.y === ty && !player.hasCode[i]) {
                    if(keyGuards[i].active) {
                        message='A guardian still protects this fragment! Shoot it first.';
                        messageTimer=1.8;
                        return;
                    }
                    player.hasCode[i] = true;
                    map[ty][tx] = 0;
                    updateCodeDisplay();
                    const count=player.hasCode.filter(v=>v).length;
                    score += 40;
                    message = count===4 ? 'All fragments found! Solve the puzzle at the red door.' : `🔑 Code fragment collected! (${count}/4)`;
                    if(count===4) document.getElementById('objective').textContent='all fragments found → solve the puzzle at the red door';
                    messageTimer = 2.0;
                    break;
                }
            }
        }
    }

    // ---------- MONSTER AI ----------
    function updateMonster(dt) {
        if (gameState !== 'playing' || worldMode !== 'house' || !monster.active) return;

        if (monster.stunTimer > 0) {
            monster.stunTimer -= dt;
            monster.state = monster.stunTimer > 0 ? 'stunned' : 'patrol';
            const stateEl = document.getElementById('monsterState');
            stateEl.textContent = monster.stunTimer > 0 ? '💫 STUNNED' : '👹 UNAWARE';
            stateEl.className = '';
            return;
        }

        const seesPlayer = monsterCanSeePlayer();
        if (worldMode === 'house' && seesPlayer) {
            monster.state = 'hunt';
            monster.lastSeenPlayer = { x: player.x, y: player.y };
            monster.searchTimer = 3.5;
        } else if (monster.state === 'hunt') {
            monster.state = 'search';
            monster.searchTimer = 3.5;
        }

        if (monster.state === 'hunt') {
            const dx = player.x - monster.x, dy = player.y - monster.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.1) {
                monster.angle = Math.atan2(dy, dx);
                const move = Math.min(monster.speed * dt, dist);
                const nx = monster.x + Math.cos(monster.angle) * move;
                const ny = monster.y + Math.sin(monster.angle) * move;
                if (canMoveTo(nx, monster.y, 0.3)) monster.x = nx;
                if (canMoveTo(monster.x, ny, 0.3)) monster.y = ny;
            }
        } else if (monster.state === 'search') {
            const target = monster.lastSeenPlayer;
            const dx = target.x - monster.x;
            const dy = target.y - monster.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.4) {
                const move = Math.min(monster.speed * 0.9 * dt, dist);
                const angle = Math.atan2(dy, dx);
                monster.angle = angle;
                let nx = monster.x + Math.cos(angle) * move;
                let ny = monster.y + Math.sin(angle) * move;
                if (canMoveTo(nx, monster.y, 0.3)) monster.x = nx;
                if (canMoveTo(monster.x, ny, 0.3)) monster.y = ny;
            }
            monster.searchTimer -= dt;
            if (monster.searchTimer <= 0) monster.state = 'patrol';
        } else if (monster.state === 'patrol') {
            // It scans in place until you enter its visible cone.
            monster.angle += 0.32 * dt;
        }

        // Attack
        if (seesPlayer) {
            const dx = player.x - monster.x;
            const dy = player.y - monster.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.85) {
                player.health -= 42 * dt;
                if (player.health <= 0) {
                    player.health = 0;
                    gameState = 'lost';
                    message = 'THE MONSTER GOT YOU...';
                }
            }
        }

        // Update HUD
        const stateEl = document.getElementById('monsterState');
        if (player.inCloset) {
            stateEl.textContent = '👹 SEARCHING';
            stateEl.className = '';
        } else if (monster.state === 'hunt') {
            stateEl.textContent = '👹 HUNTING';
            stateEl.className = 'alert';
        } else if (monster.state === 'search') {
            stateEl.textContent = '👹 SEARCHING';
            stateEl.className = '';
        } else {
            stateEl.textContent = '👹 UNAWARE';
            stateEl.className = '';
        }
    }

    function updateStalkers(dt) {
        if(gameState!=='playing' || worldMode!=='house' || gameMode!=='regular') return;
        for(const stalker of stalkers) {
            if(!stalker.active) continue;
            if(stalker.stunTimer>0) { stalker.stunTimer-=dt; continue; }
            stalker.phase+=dt;
            const dx=player.x-stalker.x, dy=player.y-stalker.y, distance=Math.hypot(dx,dy);
            const sees=!player.inCloset && distance<7 && lineOfSight(stalker.x,stalker.y,player.x,player.y);
            let angle=sees ? Math.atan2(dy,dx) : stalker.angle+Math.sin(stalker.phase)*0.55;
            if(sees) stalker.angle=angle;
            const step=stalker.speed*(sees?1:0.42)*dt;
            const nx=stalker.x+Math.cos(angle)*step, ny=stalker.y+Math.sin(angle)*step;
            if(canMoveTo(nx,stalker.y,0.26)) stalker.x=nx;
            if(canMoveTo(stalker.x,ny,0.26)) stalker.y=ny;
            if(sees && distance<0.75) {
                player.health=Math.max(0,player.health-22*dt);
                if(player.health<=0) { gameState='lost'; message='THE STALKERS GOT YOU...'; }
            }
        }
    }

    function findNextPathPosition(startX, startY, targetX, targetY) {
        const startTileX = Math.floor(startX), startTileY = Math.floor(startY);
        const targetTileX = Math.floor(targetX), targetTileY = Math.floor(targetY);
        if (isWall(startTileX, startTileY) || isWall(targetTileX, targetTileY)) return null;

        const start = startTileY * MAP_W + startTileX;
        const target = targetTileY * MAP_W + targetTileX;
        if (start === target) return { x: targetX, y: targetY };

        const previous = new Int32Array(MAP_W * MAP_H);
        previous.fill(-1);
        previous[start] = start;
        const queue = new Int16Array(MAP_W * MAP_H);
        let head = 0, tail = 0;
        queue[tail++] = start;
        while (head < tail && previous[target] === -1) {
            const current = queue[head++];
            const x = current % MAP_W, y = Math.floor(current / MAP_W);
            for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
                if (isWall(nx, ny)) continue;
                const next = ny * MAP_W + nx;
                if (previous[next] !== -1) continue;
                previous[next] = current;
                queue[tail++] = next;
                if (next === target) break;
            }
        }
        if (previous[target] === -1) return null;

        let next = target;
        while (previous[next] !== start) next = previous[next];
        return { x: next % MAP_W + 0.5, y: Math.floor(next / MAP_W) + 0.5 };
    }

    function updateRoomHunters(dt) {
        if (gameState !== 'playing' || worldMode !== 'house' || gameMode !== 'regular') return;
        for (const hunter of roomHunters) {
            if (!hunter.active) continue;
            if (hunter.stunTimer > 0) {
                hunter.stunTimer = Math.max(0, hunter.stunTimer - dt);
                continue;
            }

            hunter.phase += dt;
            const dx = player.x - hunter.x, dy = player.y - hunter.y;
            const distance = Math.hypot(dx, dy);
            const seesPlayer = !player.inCloset && distance < 8 && lineOfSight(hunter.x, hunter.y, player.x, player.y);
            if (seesPlayer) {
                hunter.lastSeenPlayer = { x: player.x, y: player.y };
                hunter.searchTimer = 4;
                hunter.angle = Math.atan2(dy, dx);
                if (!hunter.alertedOnce) {
                    hunter.alertedOnce = true;
                    message = `${hunter.name} is hunting you!`;
                    messageTimer = 2;
                }
            } else if (hunter.searchTimer > 0) {
                hunter.searchTimer = Math.max(0, hunter.searchTimer - dt);
            }

            const hunting = seesPlayer || hunter.searchTimer > 0;
            const patrolTarget = {
                x: hunter.homeX + Math.cos(hunter.phase * 0.55) * 0.32,
                y: hunter.homeY + Math.sin(hunter.phase * 0.55) * 0.32
            };
            const target = hunting ? hunter.lastSeenPlayer : patrolTarget;
            const targetDx = target.x - hunter.x, targetDy = target.y - hunter.y;
            const targetDistance = Math.hypot(targetDx, targetDy);
            if (targetDistance > 0.18) {
                const angle = Math.atan2(targetDy, targetDx);
                hunter.angle = angle;
                const nextStep = hunting && !seesPlayer
                    ? findNextPathPosition(hunter.x, hunter.y, target.x, target.y)
                    : target;
                if (nextStep) {
                    const pathX = nextStep.x - hunter.x, pathY = nextStep.y - hunter.y;
                    const pathLength = Math.hypot(pathX, pathY) || 1;
                    const step = hunter.speed * (hunting ? 1 : 0.42) * dt;
                    const moveX = pathX / pathLength * Math.min(step, pathLength);
                    const moveY = pathY / pathLength * Math.min(step, pathLength);
                    if (canMoveTo(hunter.x + moveX, hunter.y, 0.25)) hunter.x += moveX;
                    if (canMoveTo(hunter.x, hunter.y + moveY, 0.25)) hunter.y += moveY;
                }
            }

            if (seesPlayer && distance < 0.82) {
                player.health = Math.max(0, player.health - 24 * dt);
                if (player.health <= 0) {
                    gameState = 'lost';
                    message = `${hunter.name} got you...`;
                }
            }
        }
    }

    function updateKeyGuards(dt) {
        if(gameState!=='playing' || worldMode!=='house' || player.inCloset || gameMode!=='regular') return;
        for(const guard of keyGuards) {
            if(!guard.active) continue;
            const dx=player.x-guard.x, dy=player.y-guard.y, distance=Math.hypot(dx,dy);
            if(distance<7 && lineOfSight(guard.x,guard.y,player.x,player.y)) {
                guard.angle=Math.atan2(dy,dx);
                if(distance>0.9) {
                    const step=1.25*dt, nx=guard.x+Math.cos(guard.angle)*step, ny=guard.y+Math.sin(guard.angle)*step;
                    if(canMoveTo(nx,guard.y,0.27)) guard.x=nx;
                    if(canMoveTo(guard.x,ny,0.27)) guard.y=ny;
                } else {
                    player.health=Math.max(0,player.health-18*dt);
                    if(player.health<=0) { gameState='lost'; message='A KEY GUARDIAN GOT YOU...'; }
                }
            } else guard.angle+=0.25*dt;
        }
    }

    function lineOfSight(x1,y1,x2,y2) {
        const dx=x2-x1, dy=y2-y1, steps=Math.ceil(Math.hypot(dx,dy)*10);
        for(let i=1;i<steps;i++) {
            const t=i/steps, cell=map[Math.floor(y1+dy*t)]?.[Math.floor(x1+dx*t)];
            if (cell === undefined || cell === 1 || cell === 2 || cell === 3 || cell === 6) return false;
        }
        return true;
    }

    // ---------- PLAYER UPDATE ----------
    function updatePlayer(dt) {
        if (gameState !== 'playing' || player.inCloset) return;

        if (powerUpTimer > 0) {
            powerUpTimer = Math.max(0, powerUpTimer - dt);
        }

        if (keys.a) player.angle -= 2.2 * dt;
        if (keys.d) player.angle += 2.2 * dt;
        let moveX = 0, moveY = 0;
        if (keys.w) { moveX += Math.cos(player.angle); moveY += Math.sin(player.angle); }
        if (keys.s) { moveX -= Math.cos(player.angle); moveY -= Math.sin(player.angle); }

        if (moveX !== 0 || moveY !== 0) {
            const len = Math.hypot(moveX, moveY);
            moveX /= len;
            moveY /= len;

            player.sprinting = keys.shift;
            const boostMod = powerUpTimer > 0 ? 1.35 : 1;
            const spd = (player.sprinting ? player.sprintSpeed : player.speed) * boostMod;
            const step = spd * dt;

            const newX = player.x + moveX * step;
            const newY = player.y + moveY * step;

            if (canMoveTo(newX, player.y, 0.3)) player.x = newX;
            if (canMoveTo(player.x, newY, 0.3)) player.y = newY;

            player.x = Math.max(0.5, Math.min(MAP_W - 0.5, player.x));
            player.y = Math.max(0.5, Math.min(MAP_H - 0.5, player.y));

            tryPickupFragments();
            collectBoosts();
            collectWeaponPickups();
            collectDisasterCaches();
            trySecretWall();
            collectSecretCache();
            collectLightsaber();

            if (gameMode==='halloween' && halloweenStage==='house' && ghostKeyDropped && !carKeyFound && Math.hypot(player.x-ghostKeyPos.x,player.y-ghostKeyPos.y)<0.85) {
                carKeyFound=true;
                message='🔑 Car key collected! Head back through the front door.';
                messageTimer=2.5;
                document.getElementById('objective').textContent='car key found → leave through the front door and reach the car';
            }

            if (gameMode==='regular' && challengeMode === null && worldMode === 'outside' && !carKeyFound && Math.hypot(player.x-CAR_KEY_POS.x,player.y-CAR_KEY_POS.y) < 0.75) {
                carKeyFound = true;
                message = boss.hp > 0 ? '🔑 Car key found! Defeat the boss, then use F at the car.' : '🔑 Car key found! Get to the car and press F.';
                messageTimer = 3;
                if (boss.hp <= 0) document.getElementById('objective').textContent = 'boss defeated → reach the car 🚗 → press F';
            }

            // Check exit
            const tx = Math.floor(player.x);
            const ty = Math.floor(player.y);
            if (map[ty] && map[ty][tx] === 2) {
                if(gameMode==='halloween' && halloweenStage==='house') {
                    if(carKeyFound) returnToHalloweenYard();
                    else { message='The front door is locked. Find the ghost and take its car key!'; messageTimer=2; }
                } else if(gameMode==='halloween' && halloweenStage==='enter-house') {
                    message='The cabin door is open. Press E to go inside.'; messageTimer=1.5;
                } else if (hasFullCode()) {
                    if(doorPuzzleSolved) enterOutside();
                    else openDoorPuzzle();
                } else {
                    message = 'The door is locked. Find all 4 code fragments!';
                    messageTimer = 1.5;
                }
            }
        } else {
            player.sprinting = false;
        }

        if (player.closetCooldown > 0) player.closetCooldown -= dt;
    }

    function drawHands() {
        const w = canvas.width;
        const h = canvas.height;
        const time = performance.now() * 0.005;
        const stride = (keys.w || keys.s || keys.shift) ? Math.sin(time * 6) * 10 : Math.sin(time * 2.5) * 3;
        const sway = (keys.a || keys.d) ? Math.sin(time * 8) * 7 : 0;

        ctx.save();
        ctx.translate(w / 2, h - 118);

        // Forearms
        ctx.fillStyle = '#d69a67';
        ctx.beginPath();
        ctx.moveTo(-126, 46);
        ctx.quadraticCurveTo(-160 + sway, 58 + stride, -102, 118 + stride * 0.8);
        ctx.quadraticCurveTo(-52 + sway * 0.25, 92 + stride * 0.7, -12, 26);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(126, 46);
        ctx.quadraticCurveTo(160 - sway, 58 + stride, 102, 118 + stride * 0.8);
        ctx.quadraticCurveTo(52 - sway * 0.25, 92 + stride * 0.7, 12, 26);
        ctx.fill();

        // Hands
        ctx.fillStyle = '#f0c79c';
        ctx.beginPath();
        ctx.ellipse(-58 + sway * 0.35, 64 + stride * 0.9, 30, 21, 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(58 - sway * 0.35, 64 + stride * 0.9, 30, 21, -0.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#e7ba8b';
        ctx.lineWidth = 4;
        for (let i = -2; i <= 2; i++) {
            const offset = i * 8;
            ctx.beginPath();
            ctx.moveTo(-62 + offset + sway * 0.2, 48 + stride * 0.8);
            ctx.lineTo(-68 + offset + sway * 0.2, 86 + stride * 0.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(62 - offset - sway * 0.2, 48 + stride * 0.8);
            ctx.lineTo(68 - offset - sway * 0.2, 86 + stride * 0.8);
            ctx.stroke();
        }

        const secretAnimationProgress = 1 - secretWeaponAnimationTimer / SECRET_WEAPON_ANIMATION_DURATION;
        const secretAnimationSwell = Math.sin(secretAnimationProgress * Math.PI);
        const secretAnimationGlow = Math.pow(secretAnimationSwell, 0.55);
        const weaponColor = (WEAPON_DEFS[player.weapon] || WEAPON_DEFS.knife).color;
        if (secretWeaponAnimationTimer > 0) {
            ctx.save();
            ctx.translate(0, 34 - secretAnimationSwell * 105);
            ctx.rotate(secretAnimationProgress * Math.PI * 2 + Math.sin(secretAnimationProgress * Math.PI * 4) * 0.14);
            const weaponScale = 1 + secretAnimationSwell * 0.16;
            ctx.scale(weaponScale, weaponScale);
            ctx.shadowColor = weaponColor;
            ctx.shadowBlur = 20 + secretAnimationGlow * 30;
        }

        if (player.weapon === 'knife') {
            ctx.save();
            ctx.translate(74, 8 + stride * 0.25);
            ctx.rotate(-0.42 + sway * 0.002);
            ctx.fillStyle = '#292b30';
            ctx.fillRect(-11, 15, 22, 52);
            ctx.fillStyle = '#a86d42';
            ctx.fillRect(-12, 52, 24, 36);
            ctx.fillStyle = '#d9e1e6';
            ctx.beginPath();
            ctx.moveTo(-10, 16);
            ctx.lineTo(-7, -54);
            ctx.lineTo(0, -76);
            ctx.lineTo(7, -54);
            ctx.lineTo(10, 16);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -63);
            ctx.lineTo(0, 10);
            ctx.stroke();
            ctx.restore();
        } else {
            const gunX = 0;
            const gunY = 12 + stride * 0.25;

            ctx.fillStyle = '#171d24';
            ctx.fillRect(gunX - 92, gunY - 18, 184, 38);
            ctx.fillRect(gunX - 28, gunY - 30, 56, 26);

            ctx.fillStyle = '#2d3740';
            ctx.fillRect(gunX - 12, gunY - 42, 24, 24);
            ctx.fillRect(gunX + 52, gunY - 12, 36, 16);
            ctx.fillRect(gunX - 60, gunY + 18, 34, 12);
            ctx.fillRect(gunX + 6, gunY + 18, 32, 12);

            ctx.fillStyle = '#adbac5';
            ctx.fillRect(gunX + 26, gunY - 2, 52, 12);
            ctx.fillRect(gunX - 2, gunY - 38, 20, 12);

            ctx.fillStyle = '#10161d';
            ctx.fillRect(gunX - 22, gunY + 28, 50, 18);
            ctx.fillRect(gunX - 54, gunY + 30, 20, 14);
            ctx.fillRect(gunX + 34, gunY + 30, 20, 14);

            ctx.strokeStyle = '#75818d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(gunX - 92, gunY + 12);
            ctx.lineTo(gunX - 62, gunY + 12);
            ctx.moveTo(gunX + 78, gunY + 2);
            ctx.lineTo(gunX + 120, gunY + 2);
            ctx.stroke();

            ctx.fillStyle = '#dfe7ee';
            ctx.fillRect(gunX - 58, gunY - 6, 28, 12);
            ctx.fillRect(gunX - 22, gunY - 30, 22, 10);

            if (player.weapon === 'shotgun') {
                ctx.fillStyle = '#79583c';
                ctx.fillRect(gunX - 102, gunY + 8, 56, 15);
                ctx.fillStyle = '#aeb9bd';
                ctx.fillRect(gunX + 66, gunY - 13, 68, 7);
                ctx.fillRect(gunX + 66, gunY - 3, 68, 7);
            } else if (player.weapon === 'smg') {
                ctx.fillStyle = '#4c7773';
                ctx.fillRect(gunX - 12, gunY + 18, 18, 43);
                ctx.fillRect(gunX + 38, gunY - 8, 78, 9);
            } else if (player.weapon === 'revolver') {
                ctx.fillStyle = '#b59657';
                ctx.beginPath();
                ctx.arc(gunX + 8, gunY + 1, 18, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#553f2c';
                ctx.fillRect(gunX - 14, gunY + 16, 28, 20);
            } else if (player.weapon === 'crossbow') {
                ctx.strokeStyle = '#bd9365';
                ctx.lineWidth = 9;
                ctx.beginPath();
                ctx.moveTo(gunX - 52, gunY - 40);
                ctx.lineTo(gunX + 42, gunY + 34);
                ctx.moveTo(gunX + 42, gunY - 40);
                ctx.lineTo(gunX - 52, gunY + 34);
                ctx.stroke();
                ctx.fillStyle = '#d6e1e6';
                ctx.fillRect(gunX - 8, gunY - 9, 126, 5);
                ctx.fillStyle = '#6a4d35';
                ctx.fillRect(gunX - 4, gunY - 20, 18, 54);
            } else if (player.weapon === 'flamethrower') {
                ctx.fillStyle = '#8c4428';
                ctx.fillRect(gunX - 82, gunY - 28, 118, 48);
                ctx.fillStyle = '#e98a3d';
                ctx.fillRect(gunX - 56, gunY - 42, 50, 14);
                ctx.fillStyle = '#38404a';
                ctx.fillRect(gunX + 22, gunY - 6, 108, 20);
                ctx.fillStyle = '#ffb24a';
                ctx.beginPath();
                ctx.arc(gunX + 126, gunY + 4, 10 + Math.sin(performance.now() / 65) * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            if (muzzleFlash > 0) {
                ctx.fillStyle = 'rgba(255, 228, 135, 0.96)';
                ctx.beginPath();
                ctx.moveTo(gunX + 88, gunY + 2);
                ctx.lineTo(gunX + 138, gunY + 10);
                ctx.lineTo(gunX + 88, gunY + 18);
                ctx.closePath();
                ctx.fill();
            }
        }

        if (secretWeaponAnimationTimer > 0) {
            ctx.restore();
            const centerY = 34 - secretAnimationSwell * 105;
            const pulse = 0.82 + Math.sin(performance.now() / 48) * 0.18;
            ctx.save();
            ctx.globalAlpha = secretAnimationGlow;

            const aura = ctx.createRadialGradient(0, centerY, 8, 0, centerY, 138);
            aura.addColorStop(0, `${weaponColor}88`);
            aura.addColorStop(0.42, `${weaponColor}35`);
            aura.addColorStop(1, `${weaponColor}00`);
            ctx.fillStyle = aura;
            ctx.beginPath();
            ctx.arc(0, centerY, 138, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowColor = weaponColor;
            ctx.shadowBlur = 22 * pulse;
            ctx.strokeStyle = weaponColor;
            ctx.lineWidth = 2 + secretAnimationGlow * 2;
            for (let ring = 0; ring < 3; ring++) {
                const radius = 68 + ring * 23 + secretAnimationGlow * (ring % 2 ? 22 : 34);
                ctx.setLineDash(ring === 1 ? [5, 9] : []);
                ctx.lineDashOffset = -secretAnimationProgress * 90 * (ring % 2 ? -1 : 1);
                ctx.beginPath();
                ctx.ellipse(0, centerY, radius, radius * 0.36, secretAnimationProgress * Math.PI * (ring % 2 ? -1 : 1), 0.12 + ring * 0.5, Math.PI * 1.82 + ring * 0.45);
                ctx.stroke();
            }

            ctx.setLineDash([]);
            ctx.lineWidth = 3;
            for (let slash = 0; slash < 2; slash++) {
                const angle = secretAnimationProgress * Math.PI * 2 + slash * Math.PI / 2;
                ctx.save();
                ctx.translate(0, centerY);
                ctx.rotate(angle);
                ctx.globalAlpha = secretAnimationGlow * (slash === 0 ? 0.9 : 0.45);
                ctx.beginPath();
                ctx.ellipse(0, 0, 155, 54, 0, -0.54, 0.54);
                ctx.stroke();
                ctx.restore();
            }

            for (let wave = 0; wave < 3; wave++) {
                const waveProgress = (secretAnimationProgress * 1.7 + wave / 3) % 1;
                ctx.globalAlpha = (1 - waveProgress) * secretAnimationGlow * 0.6;
                ctx.strokeStyle = wave === 1 ? '#fff5be' : weaponColor;
                ctx.lineWidth = 2 + (1 - waveProgress) * 3;
                ctx.beginPath();
                ctx.ellipse(0, centerY + 12, 30 + waveProgress * 175, (14 + waveProgress * 53) * 0.42, 0, Math.PI * 1.05, Math.PI * 1.95);
                ctx.stroke();
            }

            const sigilSpin = secretAnimationProgress * Math.PI * 3;
            for (let sigil = 0; sigil < 6; sigil++) {
                const angle = sigilSpin + sigil * Math.PI / 3;
                const radius = 112 + Math.sin(secretAnimationProgress * Math.PI * 5 + sigil) * 14;
                const x = Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius * 0.42;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-angle + sigilSpin);
                ctx.globalAlpha = secretAnimationGlow * (0.55 + Math.sin(secretAnimationProgress * Math.PI * 8 + sigil) * 0.25);
                ctx.strokeStyle = sigil % 2 ? '#fff5be' : weaponColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -8);
                ctx.lineTo(6, 0);
                ctx.lineTo(0, 8);
                ctx.lineTo(-6, 0);
                ctx.closePath();
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-3, 0);
                ctx.lineTo(3, 0);
                ctx.stroke();
                ctx.restore();
            }

            if (player.weapon === 'knife' || player.weapon === 'lightsaber') {
                ctx.save();
                ctx.translate(0, centerY);
                ctx.rotate(-0.85 + secretAnimationProgress * Math.PI * 2);
                ctx.globalAlpha = secretAnimationGlow * 0.78;
                ctx.shadowBlur = 24;
                ctx.strokeStyle = player.weapon === 'lightsaber' ? '#d9ffff' : '#fff5be';
                ctx.lineWidth = player.weapon === 'lightsaber' ? 9 : 5;
                ctx.beginPath();
                ctx.arc(0, 0, 116, -0.82, 0.82);
                ctx.stroke();
                ctx.strokeStyle = weaponColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 132, -0.68, 0.68);
                ctx.stroke();
                ctx.restore();
            } else if (player.weapon === 'flamethrower') {
                for (let flame = 0; flame < 5; flame++) {
                    const flamePhase = (secretAnimationProgress * 2 + flame / 5) % 1;
                    const flameX = 96 + flamePhase * 125;
                    const flameY = centerY - 8 + Math.sin(flamePhase * Math.PI * 5 + flame) * 24;
                    ctx.globalAlpha = secretAnimationGlow * (1 - flamePhase) * 0.82;
                    ctx.fillStyle = flame % 2 ? '#fff1a6' : '#ff8a42';
                    ctx.shadowColor = '#ff5b22';
                    ctx.shadowBlur = 18;
                    ctx.beginPath();
                    ctx.moveTo(flameX - 5, flameY + 5);
                    ctx.quadraticCurveTo(flameX + 18, flameY - 22, flameX + 34, flameY);
                    ctx.quadraticCurveTo(flameX + 16, flameY + 4, flameX + 8, flameY + 20);
                    ctx.closePath();
                    ctx.fill();
                }
            } else {
                ctx.globalAlpha = secretAnimationGlow * 0.72;
                ctx.shadowColor = weaponColor;
                ctx.shadowBlur = 20;
                ctx.strokeStyle = '#fff5be';
                ctx.lineWidth = 2;
                for (let bolt = 0; bolt < 3; bolt++) {
                    const boltProgress = (secretAnimationProgress * 1.5 + bolt / 3) % 1;
                    const boltX = 118 + boltProgress * 115;
                    const boltY = centerY - 10 + Math.sin(boltProgress * Math.PI * 4 + bolt) * 30;
                    ctx.beginPath();
                    ctx.moveTo(boltX - 15, boltY + 7);
                    ctx.lineTo(boltX, boltY);
                    ctx.lineTo(boltX + 17, boltY - 4);
                    ctx.lineTo(boltX + 9, boltY + 2);
                    ctx.stroke();
                }
            }

            for (let spark = 0; spark < 14; spark++) {
                const angle = secretAnimationProgress * Math.PI * 4 + spark * Math.PI * 2 / 14;
                const orbit = 74 + (spark % 3) * 24;
                const radius = orbit + Math.sin(secretAnimationProgress * Math.PI * 6 + spark) * 16;
                const x = Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius * 0.42;
                const sparkSize = 2 + secretAnimationGlow * (spark % 3 + 2);
                ctx.globalAlpha = secretAnimationGlow * (0.55 + (spark % 3) * 0.15);
                ctx.fillStyle = spark % 3 === 0 ? '#fff5be' : weaponColor;
                ctx.beginPath();
                ctx.arc(x, y, sparkSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha *= 0.45;
                ctx.strokeStyle = '#fff5be';
                ctx.lineWidth = sparkSize * 0.7;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - Math.cos(angle) * 15, y - Math.sin(angle) * 8);
                ctx.stroke();
            }

            if (secretAnimationProgress > 0.78) {
                const finish = (secretAnimationProgress - 0.78) / 0.22;
                ctx.globalAlpha = (1 - finish) * 0.9;
                ctx.fillStyle = '#fff8d6';
                ctx.shadowColor = weaponColor;
                ctx.shadowBlur = 36;
                ctx.beginPath();
                ctx.arc(0, centerY, 8 + finish * 92, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = (1 - finish) * 0.75;
                ctx.strokeStyle = weaponColor;
                ctx.lineWidth = 5;
                for (let ray = 0; ray < 12; ray++) {
                    const angle = ray * Math.PI / 6 + secretAnimationProgress;
                    const inner = 24 + finish * 50;
                    const outer = inner + 18 + (ray % 3) * 12;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
                    ctx.lineTo(Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
                    ctx.stroke();
                }
            }

            ctx.restore();
        }

        ctx.restore();
    }

    function drawGhostCapture() {
        if (!captureFX) return;
        const dx = captureFX.x - player.x;
        const dy = captureFX.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 20) { captureFX = null; return; }
        const rel = Math.atan2(dy, dx) - player.angle;
        let screenX = canvas.width / 2 + Math.tan(rel) * canvas.width * 0.32;
        let screenY = canvas.height * 0.58;
        const t = 1 - captureFX.life / captureFX.maxLife;
        const size = 24 + t * 96;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.strokeStyle = 'rgba(140, 220, 255, 0.9)';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#8de8ff'; ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.9, size * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.5, size * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(130, 220, 255, 0.28)';
        ctx.fillRect(-size * 0.7, -size * 0.35, size * 1.4, size * 0.7);
        ctx.restore();
    }

    function drawFlashlightOverlay() {
        if (gameMode !== 'halloween') return;
        const x = canvas.width * 0.52;
        const y = canvas.height * 0.52;
        const flashlight = ctx.createRadialGradient(x, y, 30, x, y, canvas.width * 0.7);
        flashlight.addColorStop(0, 'rgba(255, 246, 200, 0.18)');
        flashlight.addColorStop(0.18, 'rgba(255, 223, 120, 0.12)');
        flashlight.addColorStop(0.48, 'rgba(255, 210, 90, 0.06)');
        flashlight.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = flashlight;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function findApparitionSpot(now) {
        if (gameMode !== 'regular' || worldMode !== 'house' || gameState !== 'playing' || player.inCloset) return null;
        if (now % 18000 > 1800) return null;

        const phase = Math.floor(now / 18000);
        for (const offset of [0, -0.18, 0.18, -0.34, 0.34]) {
            const angle = player.angle + offset;
            const distance = 6.5 + (phase % 3) * 0.5;
            const x = player.x + Math.cos(angle) * distance;
            const y = player.y + Math.sin(angle) * distance;
            if (canMoveTo(x, y, 0.2) && lineOfSight(player.x, player.y, x, y)) return { x, y };
        }
        return null;
    }

    function drawMazeAtmosphere(now, w, h, horizon) {
        if (gameMode !== 'regular' || worldMode !== 'house' || player.inCloset) return;

        const haze = ctx.createLinearGradient(0, horizon - 40, 0, horizon + h * 0.34);
        haze.addColorStop(0, 'rgba(116, 126, 120, 0)');
        haze.addColorStop(0.55, 'rgba(116, 126, 120, 0.035)');
        haze.addColorStop(1, 'rgba(116, 126, 120, 0)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, horizon - 40, w, h * 0.34 + 40);

        for (let mote = 0; mote < 28; mote++) {
            const drift = now * (0.004 + (mote % 5) * 0.001);
            const x = ((mote * 173 + drift * (mote % 2 ? 1 : -1)) % w + w) % w;
            const y = horizon + ((mote * 67 + Math.sin(drift + mote) * 24) % (h * 0.42));
            const alpha = 0.08 + (Math.sin(drift * 2 + mote) + 1) * 0.045;
            ctx.fillStyle = `rgba(190, 194, 177, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 1 + (mote % 3) * 0.35, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCreatureEyes(x, y, size, color = '#ff3d46') {
        const eyeW = size * 0.12;
        const eyeH = size * 0.08;
        ctx.fillStyle = color;
        ctx.fillRect(x - eyeW * 2.2, y - eyeH * 1.3, eyeW, eyeH);
        ctx.fillRect(x + eyeW * 0.8, y - eyeH * 1.3, eyeW, eyeH);
    }

    function drawOfficeCorridor(w, h, horizon, now, room) {
        const ceiling = ctx.createLinearGradient(0, 0, 0, horizon);
        ceiling.addColorStop(0, '#343a3a');
        ceiling.addColorStop(1, '#202726');
        ctx.fillStyle = ceiling;
        ctx.fillRect(0, 0, w, horizon);

        const carpet = ctx.createLinearGradient(0, horizon, 0, h);
        carpet.addColorStop(0, room ? room.floorTint : '#343c3a');
        carpet.addColorStop(0.45, room ? room.floorTint : '#3b403b');
        carpet.addColorStop(1, '#242b2b');
        ctx.fillStyle = carpet;
        ctx.fillRect(0, horizon, w, h - horizon);

        ctx.save();
        ctx.lineWidth = 1;
        for (let tile = 1; tile <= 12; tile++) {
            const depth = tile / 12;
            const y = horizon + Math.pow(depth, 1.65) * (h - horizon);
            const halfWidth = 26 + depth * w * 0.48;
            ctx.strokeStyle = `rgba(193, 190, 162, ${0.025 + depth * 0.055})`;
            ctx.beginPath();
            ctx.moveTo(w / 2 - halfWidth, y);
            ctx.lineTo(w / 2 + halfWidth, y);
            ctx.stroke();
        }
        for (let seam = -5; seam <= 5; seam++) {
            const bottomX = w / 2 + seam * w * 0.083;
            ctx.strokeStyle = seam === 0 ? 'rgba(201, 191, 157, 0.08)' : 'rgba(190, 185, 160, 0.045)';
            ctx.beginPath();
            ctx.moveTo(w / 2 + seam * 2, horizon);
            ctx.lineTo(bottomX, h);
            ctx.stroke();
        }

        for (let tile = 1; tile <= 10; tile++) {
            const depth = tile / 10;
            const y = horizon - Math.pow(depth, 1.5) * (horizon - 18);
            const halfWidth = 18 + depth * w * 0.46;
            ctx.strokeStyle = `rgba(205, 213, 201, ${0.025 + depth * 0.045})`;
            ctx.beginPath();
            ctx.moveTo(w / 2 - halfWidth, y);
            ctx.lineTo(w / 2 + halfWidth, y);
            ctx.stroke();
        }

        for (let light = 0; light < 5; light++) {
            const depth = (light + 1) / 6;
            const y = horizon - Math.pow(depth, 1.55) * (horizon - 28);
            const lightWidth = 4 + depth * 38;
            const lightHeight = 2 + depth * 12;
            const flicker = 0.74 + Math.sin(now / 190 + light * 1.7) * 0.08;
            ctx.fillStyle = `rgba(225, 231, 211, ${flicker})`;
            ctx.shadowColor = '#e4e8cd';
            ctx.shadowBlur = 4 + depth * 20;
            ctx.fillRect(w / 2 - lightWidth / 2, y - lightHeight / 2, lightWidth, lightHeight);
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // ---------- RENDERING ----------
    function draw() {
        const w = canvas.width, h = canvas.height, horizon = h * 0.48;
        const now = performance.now();
        const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 18 : 0;
        const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 14 : 0;
        const flickerPhase = now % 5200;
        const lampFlicker = gameMode === 'regular' && worldMode === 'house'
            ? Math.max(0, 1 - Math.abs(flickerPhase - 4680) / 180)
            : 0;
        ctx.save();
        ctx.translate(shakeX, shakeY);
        const halloweenYard=gameMode==='halloween' && worldMode==='outside';
        const stormYard = challengeMode === 'tornado';
        const tsunamiYard = challengeMode === 'tsunami';
        ctx.fillStyle = halloweenYard ? '#101018' : stormYard ? '#17131e' : tsunamiYard ? '#101c24' : '#090a0c'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = halloweenYard ? '#28221c' : stormYard ? '#27242b' : tsunamiYard ? '#172c35' : '#171718'; ctx.fillRect(0, horizon, w, h - horizon);
        ctx.fillStyle = halloweenYard ? '#17131c' : stormYard ? '#19151e' : tsunamiYard ? '#10202b' : '#111214'; ctx.fillRect(0, 0, w, horizon);
        const activeOfficeRoom = gameMode === 'regular' && worldMode === 'house'
            ? MAZE_ROOMS.find(room => player.x >= room.x + 1 && player.x < room.x + 5 && player.y >= room.y + 1 && player.y < room.y + 5)
            : null;
        if (gameMode === 'regular' && worldMode === 'house') drawOfficeCorridor(w, h, horizon, now, activeOfficeRoom);
        const depth = new Float32Array(w);
        const fov = Math.PI / 2.8;
        if (materials.length && worldMode !== 'outside') {
            const floor = materials[3];
            const directionX = Math.cos(player.angle), directionY = Math.sin(player.angle);
            const plane = Math.tan(fov / 2);
            for (let y = Math.ceil(horizon + 1); y < h; y += 2) {
                const distance = h * 0.41 / (y - horizon);
                if (distance > 20) continue;
                for (let x = 0; x < w; x += 4) {
                    const camera = (x / w - 0.5) * 2 * plane;
                    const worldX = player.x + distance * (directionX - directionY * camera);
                    const worldY = player.y + distance * (directionY + directionX * camera);
                    const u = worldX - Math.floor(worldX), v = worldY - Math.floor(worldY);
                    ctx.drawImage(floor, u * (floor.width - 1), v * (floor.height - 1), 1, 1, x, y, 4, 2);
                }
                ctx.fillStyle = `rgba(0,0,0,${Math.min(0.93, 0.48 + distance * 0.035)})`;
                ctx.fillRect(0, y, w, 2);
            }
        }
        for (let sx = 0; sx < w; sx++) {
            const camera = (sx / w - 0.5) * 2;
            const rayAngle = player.angle + Math.atan(camera * Math.tan(fov / 2));
            const rx = Math.cos(rayAngle), ry = Math.sin(rayAngle);
            let tx = Math.floor(player.x), ty = Math.floor(player.y);
            const ddx = Math.abs(1 / (rx || 0.00001)), ddy = Math.abs(1 / (ry || 0.00001));
            const stepX = rx < 0 ? -1 : 1, stepY = ry < 0 ? -1 : 1;
            let sideX = (rx < 0 ? player.x - tx : tx + 1 - player.x) * ddx;
            let sideY = (ry < 0 ? player.y - ty : ty + 1 - player.y) * ddy;
            let side = 0, cell = 0, dist = 30;
            for (let i = 0; i < 80; i++) {
                if (sideX < sideY) { sideX += ddx; tx += stepX; side = 0; }
                else { sideY += ddy; ty += stepY; side = 1; }
                // Empty floor is 0, so don't use `|| 1` here: that made every
                // open tile look like a wall and filled the view with one color.
                cell = map[ty] && map[ty][tx] !== undefined ? map[ty][tx] : 1;
                if (cell === 1 || cell === 2 || cell === 3 || cell === 5 || cell === 6) { dist = side ? sideY - ddy : sideX - ddx; break; }
            }
            const wallCoordinate = side === 0 ? player.y + dist * ry : player.x + dist * rx;
            const wallU = wallCoordinate - Math.floor(wallCoordinate);
            dist *= Math.cos(rayAngle - player.angle);
            depth[sx] = dist;
            const wallH = Math.min(h * 1.5, h * 0.82 / Math.max(0.12, dist));
            const top = horizon - wallH / 2;
            let tint = cell === 2 ? (gameMode==='halloween'?[190,112,39]:[185,38,42]) : cell === 3 ? [100,67,47] : cell === 5 ? [244,214,94] : cell === 6 ? [57,176,100] : worldMode === 'outside' ? (gameMode==='halloween'?[112,86,54]:[77,105,67]) : worldMode === 'armory' ? [103,83,59] : gameMode === 'regular' ? (activeOfficeRoom ? activeOfficeRoom.wallTint : [132,143,137]) : [91,75,105];
            const beam = Math.max(0, 1 - Math.abs(camera) * 0.72);
            const light = Math.max(0.12, (1 / (1 + dist * dist * 0.055)) * (0.34 + beam * 1.7))
                * (1 - lampFlicker * 0.28);
            if (side) tint = tint.map(v => v * 0.72);
            const textureShift = (sx * 0.18 + Math.sin((sx + player.x * 12) * 0.15)) * 8;
            const wallLight = 0.9 + Math.sin(textureShift) * 0.08;
            ctx.fillStyle = `rgb(${Math.floor(tint[0]*light*wallLight)},${Math.floor(tint[1]*light*wallLight)},${Math.floor(tint[2]*light*wallLight)})`;
            ctx.fillRect(sx, top, 1.5, wallH);
            ctx.fillStyle = `rgba(255,255,255,${0.08 + (Math.sin(textureShift + 1.4) + 1) * 0.04})`;
            ctx.fillRect(sx, top, 1.1, wallH * 0.24);
            if (gameMode === 'regular' && worldMode === 'house' && cell === 1) {
            const wallBottom = top + wallH;
                const nextCell = side === 0 ? map[ty]?.[tx + stepX] : map[ty + stepY]?.[tx];
                const officeDoor = nextCell === 0 && (tx * 7 + ty * 11) % 3 !== 0;
                if (officeDoor && wallU > 0.12 && wallU < 0.88) {
                    ctx.fillStyle = '#252d2a';
                    ctx.fillRect(sx, top + wallH * 0.16, 1.5, wallH * 0.84);
                    ctx.fillStyle = '#68756c';
                    ctx.fillRect(sx, top + wallH * 0.17, 1.5, wallH * 0.035);
                    ctx.fillStyle = '#394640';
                    ctx.fillRect(sx, top + wallH * 0.205, 1.5, wallH * 0.76);
                    ctx.fillStyle = 'rgba(172, 191, 177, 0.34)';
                    ctx.fillRect(sx, top + wallH * 0.27, 1.5, wallH * 0.19);
                    ctx.fillStyle = 'rgba(20, 28, 26, 0.6)';
                    ctx.fillRect(sx, top + wallH * 0.5, 1.5, wallH * 0.025);
                    if (wallU > 0.72 && wallU < 0.75) {
                        ctx.fillStyle = '#d2b778';
                        ctx.fillRect(sx, top + wallH * 0.59, 2, Math.max(2, wallH * 0.025));
                    }
                } else {
                    const panelSeam = wallU < 0.025 || (wallU > 0.49 && wallU < 0.51) || wallU > 0.975;
                    if (panelSeam) {
                        ctx.fillStyle = 'rgba(36, 47, 43, 0.42)';
                        ctx.fillRect(sx, top + wallH * 0.12, 1.5, wallH * 0.78);
                    }
                    ctx.fillStyle = 'rgba(184, 191, 173, 0.2)';
                    ctx.fillRect(sx, top + wallH * 0.69, 1.5, Math.max(1, wallH * 0.018));
                    ctx.fillStyle = 'rgba(37, 48, 43, 0.68)';
                    ctx.fillRect(sx, top + wallH * 0.9, 1.5, Math.max(1, wallH * 0.055));
                }
            }
            if (materials.length) {
                const material = materials[cell === 3 ? 1 : cell === 2 || cell === 6 ? 2 : 0];
                ctx.drawImage(material, Math.floor(wallU * (material.width - 1)), 0, 1, material.height,
                    sx, top, 1.5, wallH);
                ctx.fillStyle = `rgba(0,0,0,${1 - Math.min(1, light * (side ? 0.72 : 1))})`;
                ctx.fillRect(sx, top, 1.5, wallH);
                if (cell === 2 || cell === 5 || cell === 6) {
                    ctx.fillStyle = cell === 2 ? 'rgba(170,20,20,.25)' : cell === 6 ? 'rgba(20,170,70,.2)' : 'rgba(220,180,40,.15)';
                    ctx.fillRect(sx, top, 1.5, wallH);
                }
            }
            ctx.fillStyle = `rgba(0,0,0,${Math.min(0.82, dist * 0.025)})`;
            ctx.fillRect(sx, 0, 1.5, h);
        }

        // Render pickups and the creature as perspective sprites.
        const things = [];
        if (worldMode === 'armory') {
            things.push(
                { x: 18.5, y: 14.5, icon: '🔫', size: 0.75, glow: '#f1c46e', lamp: true },
                { x: 18.5, y: 16.5, icon: '🔪', size: 0.62, glow: '#d7dce0', lamp: true },
                { x: 22.5, y: 15.5, icon: '🧰', size: 0.82, glow: '#c58c50' },
                { x: 22.5, y: 10.5, icon: '🗄️', size: 0.78, glow: '#8ca9b7' },
                { x: 25.5, y: 12.5, icon: '📻', size: 0.42, glow: '#6fe4df' },
                { x: 25.5, y: 18.5, icon: '🩹', size: 0.42, glow: '#79e3a0' },
                { x: 22.5, y: 20.5, icon: '📦', size: 0.62, glow: '#ad7446' },
                { x: 14.5, y: 9.5, icon: '🚨', size: 0.36, glow: '#f3544f', lamp: true }
            );
        }
        if (worldMode === 'house' && gameMode === 'regular') {
            if (!greenDoorOpen) things.push({ x: GREEN_DOOR_POS.x + 0.5, y: GREEN_DOOR_POS.y + 0.5, icon: '🚪', size: 0.7, glow: '#42f078' });
            else if (!ownedWeapons.lightsaber) things.push({ x: 12.5, y: 8.5, icon: '⚔️', size: 0.58, glow: '#55dfff' });
            MAZE_ROOMS.forEach(room => things.push({
                x: room.x + 0.5,
                y: room.y + 0.5,
                icon: room.icon,
                size: 0.34,
                glow: room.color,
                lamp: true
            }));
            MAZE_ROOMS.forEach(room => {
                things.push({ x: room.x + 2.5, y: room.y + 1.3, label: room.name, decor: 'officeSign', size: 0.38, glow: room.color });
                room.furnishings.forEach(item => things.push({ ...item, glow: room.color }));
            });
            things.push(...fragmentPositions.filter((_, i) => !player.hasCode[i]).map((p, i) => ({
                x: p.x + 0.5,
                y: p.y + 0.5,
                icon: '✦',
                size: 0.46,
                glow: keyGuards[i].active ? '#ffb347' : '#ffe66d',
                codeGlow: true,
                decor: 'code'
            })));
            keyGuards.forEach(g => {
                if(g.active) things.push({x:g.x,y:g.y,icon:'👹',size:.72,glow:g.color,hasEyes:true});
            });
            lamps.forEach(lamp => things.push({x:lamp.x,y:lamp.y,icon:'✦',size:.2,glow:'#ffe9a1',lamp:true}));
            mazeDetails.forEach(detail => things.push(detail));
            if (secretWall.discovered) {
                if (!secretCacheClaimed) things.push({ x: 9.5, y: 8.5, icon: '🧰', size: 0.68, glow: '#f0bf62' });
                things.push(
                    { x: 8.5, y: 9.5, icon: '📜', size: 0.32, glow: '#c7aa76' },
                    { x: 10.5, y: 9.5, icon: '🕯️', size: 0.28, glow: '#ffc56a', lamp: true }
                );
            }
            const apparition = findApparitionSpot(now);
            if (apparition) things.push({ ...apparition, decor: 'apparition', size: 0.84, glow: '#a9c2b8' });
            for (let y = 2; y < MAP_H - 2; y += 3) {
                for (let x = 2; x < MAP_W - 2; x += 4) {
                    if (map[y][x] !== 0) continue;
                    if ((x + y) % 6 === 0) things.push({ x: x + 0.5, y: y + 0.5, size: 0.14, glow: '#8dbd96', decor: 'moss' });
                    if ((x * 3 + y * 5) % 11 === 0) things.push({ x: x + 0.5, y: y + 0.5, size: 0.18, glow: '#ffb25a', decor: 'torch' });
                }
            }
        }
        boostPickups.filter(p => p.active).forEach(p => things.push({
            x: p.x,
            y: p.y,
            icon: p.type === 'health' ? '❤' : '⚡',
            size: p.type === 'health' ? 0.42 : 0.38,
            glow: p.type === 'health' ? '#6df7a3' : '#7ad8ff'
        }));
        weaponPickups.filter(p => p.active).forEach(p => things.push({
            x: p.x,
            y: p.y,
            icon: p.type === 'laser' ? '☄️' : '💥',
            size: p.type === 'laser' ? 0.7 : 0.52,
            glow: p.type === 'laser' ? '#7de5ff' : '#d6a5ff',
            hasEyes: false,
            lamp: p.light === true,
            lightPickup: true
        }));
        if (worldMode === 'house' && gameMode==='halloween') {
            if(ghost.active) things.push({x:ghost.x,y:ghost.y,icon:'👻',size:.88,glow:'#bdfcff',hasEyes:true});
            else if(ghostKeyDropped && !carKeyFound) things.push({x:ghostKeyPos.x,y:ghostKeyPos.y,icon:'🔑',size:.42,glow:'#ffe45c'});
            [[5.5,6.5],[24.5,7.5],[6.5,24.5],[23.5,24.5]].forEach(([x,y])=>things.push({x,y,icon:'🕯️',size:.28,glow:'#ffae43',lamp:true}));
        }
        if (worldMode === 'outside' && gameMode === 'halloween') {
            ghosts.filter(g => g.active).forEach(g => things.push({x:g.x,y:g.y,icon:'👻',size:.82,glow:'#bdfcff',hasEyes:true}));
        }
        if (worldMode === 'house' && gameMode==='regular' && gameState === 'playing' && !player.inCloset && monster.active) things.push({x:monster.x,y:monster.y,icon:monster.stunTimer>0?'💫':'👹',size:.78,glow:'#ff1717',hasEyes:true});
        if (worldMode === 'house' && gameMode==='regular' && gameState === 'playing' && !player.inCloset) stalkers.filter(s => s.active).forEach(s => things.push({x:s.x,y:s.y,icon:s.stunTimer>0?'💫':'👾',size:.7,glow:s.color,hasEyes:true}));
        if (worldMode === 'house' && gameMode === 'regular' && gameState === 'playing' && !player.inCloset) {
            roomHunters.filter(hunter => hunter.active).forEach(hunter => things.push({
                x: hunter.x,
                y: hunter.y,
                icon: hunter.stunTimer > 0 ? '💫' : '👹',
                size: 0.78,
                glow: hunter.color,
                hasEyes: true
            }));
        }
        if (worldMode === 'house' && map[EXIT_POS.y][EXIT_POS.x] === 2) things.push({x:EXIT_POS.x+.5,y:EXIT_POS.y+.5,icon:'🚪',size:.68,glow:'#ff2525'});
        if (worldMode === 'outside') {
            if (gameMode==='regular' && challengeMode === null && !carKeyFound) things.push({x:CAR_KEY_POS.x,y:CAR_KEY_POS.y,icon:'🔑',size:.42,glow:'#ffe45c'});
            things.push({x:CAR_POS.x,y:CAR_POS.y,icon:'🚗',size:1.25,glow:'#65baff'});
            if (challengeMode === 'tornado') {
                disasterCaches.filter(cache => cache.active).forEach(cache => things.push({
                    x: cache.x, y: cache.y, icon: '📦', size: 0.62, glow: '#ffd76a'
                }));
                things.push({ x: tornado.x, y: tornado.y, icon: '🌪️', size: 2.4, glow: '#c6c8dc' });
            } else if (challengeMode === 'tsunami') {
                for (let x = 4.5; x < MAP_W - 2; x += 5) {
                    things.push({ x, y: Math.max(1.5, tsunamiFrontY), icon: '🌊', size: 1.1, glow: '#53d9ff' });
                }
                things.push({ x: 15.5, y: 2.5, icon: '🚩', size: 0.8, glow: '#ffe277' });
            }
            const outdoorScenery = gameMode==='halloween' ? [
                {x:15.5,y:3.5,icon:'🌕',size:1.2,glow:'#ffe7a0'},
                {x:4.5,y:5.5,icon:'🌲',size:1.05,glow:'#6d9b59'},
                {x:11.5,y:6.5,icon:'🪦',size:.62,glow:'#b9a3d6'},
                {x:14.5,y:23.5,icon:'🌲',size:1.05,glow:'#587c49'},
                {x:27.5,y:5.5,icon:'🌲',size:1.05,glow:'#587c49'},
                {x:5.5,y:12.5,icon:'🪦',size:.62,glow:'#b9a3d6'},
                {x:10.5,y:16.5,icon:'🎃',size:.48,glow:'#ff922e'},
                {x:16.5,y:18.5,icon:'🎃',size:.48,glow:'#ff922e'},
                {x:17.2,y:15.5,icon:'🏚️',size:.8,glow:'#ff9f43'}
            ] : [
                {x:4.5,y:4.5,icon:'🌳',size:1.05,glow:'#76a761'},
                {x:14.5,y:4.5,icon:'🌳',size:1.05,glow:'#76a761'},
                {x:25.5,y:4.5,icon:'🌲',size:1.05,glow:'#618d58'},
                {x:4.5,y:25.5,icon:'🌲',size:1.05,glow:'#618d58'},
                {x:14.5,y:15.5,icon:'🪨',size:.55,glow:'#b8b6a7'},
                {x:25.5,y:15.5,icon:'🌳',size:1.05,glow:'#76a761'},
                {x:14.5,y:25.5,icon:'🌼',size:.42,glow:'#e6cf6a'}
            ];
            outdoorScenery.forEach(item=>things.push(item));
            if(gameMode==='halloween' && halloweenStage==='yard' && boss.hp>0) things.push({x:boss.x,y:boss.y,icon:'🌾',size:1.15,glow:'#ff8a32',hasEyes:true});
            if (gameMode==='regular' && boss.hp > 0) {
                if(bossPhase===1) things.push({x:boss.x,y:boss.y,icon:'👾',size:1.12,glow:'#ff3158',hasEyes:true});
                else {
                    things.push({x:boss.x,y:boss.y,icon:'👾',size:.72,glow:'#ff3158',hasEyes:true});
                    for(let piece=0;piece<3;piece++) {
                        const a=Date.now()/320+piece*Math.PI*2/3;
                        things.push({x:boss.x+Math.cos(a)*.75,y:boss.y+Math.sin(a)*.75,icon:'🔻',size:.34,glow:'#ff8c48'});
                    }
                }
            }
        }
        things.sort((a,b)=>Math.hypot(b.x-player.x,b.y-player.y)-Math.hypot(a.x-player.x,a.y-player.y));
        for (const obj of things) {
            const dx=obj.x-player.x, dy=obj.y-player.y, dist=Math.hypot(dx,dy);
            let rel=Math.atan2(dy,dx)-player.angle;
            while(rel>Math.PI) rel-=Math.PI*2; while(rel< -Math.PI) rel+=Math.PI*2;
            if(Math.abs(rel)>fov*.62 || dist<.25) continue;
            const x=w/2+(Math.tan(rel)/Math.tan(fov/2))*w/2;
            const col=Math.max(0,Math.min(w-1,Math.floor(x)));
            if(dist>depth[col]+.2) continue;
            const size=Math.min(h*.8, h*obj.size/dist);
            ctx.globalAlpha=Math.max(.2, Math.min(1, 2.8/dist));
            if (obj.lamp && gameMode === 'regular' && worldMode === 'house') {
                const flicker = Math.sin(now / 115 + obj.x * 9 + obj.y * 13);
                ctx.globalAlpha *= 0.58 + (flicker + 1) * 0.21;
            }
            ctx.shadowColor=obj.glow; ctx.shadowBlur=20;
            ctx.font=`${Math.floor(size)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
            const spriteY = obj.lamp
                ? horizon - size * 0.8
                : obj.decor === 'officeSign'
                    ? horizon - size * 0.52
                    : horizon + size * .12;
            if (obj.lamp) {
                const glow = ctx.createRadialGradient(x,spriteY,1,x,spriteY,size*2.3);
                glow.addColorStop(0,'rgba(255,226,145,.34)'); glow.addColorStop(1,'rgba(255,220,130,0)');
                ctx.fillStyle=glow; ctx.fillRect(x-size*2.3,spriteY-size*2.3,size*4.6,size*4.6);
            }
            const artworkDrawn = drawArtwork(obj, x, spriteY, size, depth, dist);
            if (artworkDrawn) {
                // Artwork replaces the matching procedural sprite.
            } else if (obj.decor === 'officeSign') {
                const signWidth = size * 3;
                const signHeight = size * 0.72;
                ctx.shadowColor = obj.glow;
                ctx.shadowBlur = 12;
                ctx.fillStyle = '#17221f';
                ctx.fillRect(x - signWidth / 2, spriteY - signHeight / 2, signWidth, signHeight);
                ctx.strokeStyle = obj.glow;
                ctx.lineWidth = Math.max(1, size * 0.035);
                ctx.strokeRect(x - signWidth / 2, spriteY - signHeight / 2, signWidth, signHeight);
                ctx.fillStyle = '#dfe8d8';
                ctx.font = `bold ${Math.max(8, Math.floor(size * 0.24))}px "Courier New"`;
                ctx.fillText(obj.label, x, spriteY);
                ctx.shadowBlur = 0;
            } else if (obj.decor === 'officeDesk') {
                const baseY = spriteY + size * 0.28;
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#242a28';
                ctx.beginPath();
                ctx.ellipse(x, baseY + size * 0.2, size * 0.78, size * 0.22, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#5d5144';
                ctx.fillRect(x - size * 0.72, baseY - size * 0.08, size * 1.44, size * 0.18);
                ctx.fillStyle = '#766754';
                ctx.fillRect(x - size * 0.68, baseY + size * 0.08, size * 0.1, size * 0.56);
                ctx.fillRect(x + size * 0.58, baseY + size * 0.08, size * 0.1, size * 0.56);
                ctx.fillStyle = '#243c40';
                ctx.fillRect(x - size * 0.27, baseY - size * 0.42, size * 0.55, size * 0.32);
                ctx.fillStyle = '#89b5aa';
                ctx.fillRect(x - size * 0.22, baseY - size * 0.37, size * 0.45, size * 0.21);
                ctx.fillStyle = '#343b39';
                ctx.fillRect(x - size * 0.06, baseY - size * 0.1, size * 0.12, size * 0.1);
                ctx.shadowBlur = 0;
            } else if (obj.decor === 'officeCabinet') {
                const cabinetY = spriteY - size * 0.55;
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#414b47';
                ctx.fillRect(x - size * 0.37, cabinetY, size * 0.74, size * 1.1);
                ctx.strokeStyle = '#8c9990';
                ctx.lineWidth = Math.max(1, size * 0.035);
                ctx.strokeRect(x - size * 0.37, cabinetY, size * 0.74, size * 1.1);
                for (let drawer = 0; drawer < 3; drawer++) {
                    const y = cabinetY + size * (0.12 + drawer * 0.31);
                    ctx.strokeStyle = '#9ca69a';
                    ctx.strokeRect(x - size * 0.29, y, size * 0.58, size * 0.27);
                    ctx.fillStyle = '#d2c59d';
                    ctx.fillRect(x - size * 0.035, y + size * 0.11, size * 0.07, size * 0.035);
                }
                ctx.shadowBlur = 0;
            } else if (obj.decor === 'officeChair') {
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 7;
                ctx.fillStyle = '#303a3b';
                ctx.beginPath();
                ctx.roundRect(x - size * 0.35, spriteY - size * 0.38, size * 0.7, size * 0.48, size * 0.1);
                ctx.fill();
                ctx.fillStyle = '#536367';
                ctx.fillRect(x - size * 0.31, spriteY + size * 0.06, size * 0.62, size * 0.18);
                ctx.fillStyle = '#9ca49a';
                ctx.fillRect(x - size * 0.045, spriteY + size * 0.24, size * 0.09, size * 0.3);
                ctx.fillRect(x - size * 0.34, spriteY + size * 0.52, size * 0.68, size * 0.06);
                ctx.fillRect(x - size * 0.32, spriteY + size * 0.52, size * 0.055, size * 0.17);
                ctx.fillRect(x + size * 0.26, spriteY + size * 0.52, size * 0.055, size * 0.17);
                ctx.shadowBlur = 0;
            } else if (obj.decor === 'officePaper') {
                ctx.save();
                ctx.translate(x, spriteY + size * 0.24);
                ctx.rotate(-0.16);
                ctx.fillStyle = 'rgba(205, 207, 186, 0.9)';
                ctx.fillRect(-size * 0.42, -size * 0.28, size * 0.84, size * 0.56);
                ctx.strokeStyle = '#817d6e';
                ctx.lineWidth = Math.max(1, size * 0.025);
                for (let line = -1; line <= 1; line++) {
                    ctx.beginPath();
                    ctx.moveTo(-size * 0.29, line * size * 0.12);
                    ctx.lineTo(size * 0.25, line * size * 0.12);
                    ctx.stroke();
                }
                ctx.restore();
            } else if (obj.decor === 'officeWhiteboard') {
                const boardY = spriteY - size * 0.48;
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#343c39';
                ctx.fillRect(x - size * 0.7, boardY, size * 1.4, size * 0.86);
                ctx.strokeStyle = '#a3aaa0';
                ctx.lineWidth = Math.max(1, size * 0.045);
                ctx.strokeRect(x - size * 0.7, boardY, size * 1.4, size * 0.86);
                ctx.fillStyle = '#c8c9b3';
                ctx.fillRect(x - size * 0.61, boardY + size * 0.09, size * 1.22, size * 0.66);
                ctx.strokeStyle = '#667d78';
                ctx.lineWidth = Math.max(1, size * 0.025);
                for (let note = 0; note < 3; note++) {
                    const noteX = x - size * 0.45 + note * size * 0.37;
                    ctx.beginPath();
                    ctx.moveTo(noteX, boardY + size * 0.22);
                    ctx.lineTo(noteX + size * 0.2, boardY + size * (0.38 + (note % 2) * 0.12));
                    ctx.stroke();
                }
                ctx.fillStyle = '#a54a43';
                ctx.fillRect(x - size * 0.48, boardY + size * 0.6, size * 0.32, size * 0.08);
                ctx.fillStyle = '#426b87';
                ctx.fillRect(x + size * 0.16, boardY + size * 0.6, size * 0.32, size * 0.08);
                ctx.shadowBlur = 0;
            } else if (obj.decor === 'officeWaterCooler') {
                const baseY = spriteY + size * 0.46;
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#d0d1c4';
                ctx.fillRect(x - size * 0.28, spriteY - size * 0.05, size * 0.56, size * 0.62);
                ctx.fillStyle = '#8bc4cf';
                ctx.beginPath();
                ctx.moveTo(x - size * 0.2, spriteY - size * 0.12);
                ctx.lineTo(x - size * 0.17, spriteY - size * 0.55);
                ctx.quadraticCurveTo(x, spriteY - size * 0.72, x + size * 0.17, spriteY - size * 0.55);
                ctx.lineTo(x + size * 0.2, spriteY - size * 0.12);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#6e8d87';
                ctx.fillRect(x - size * 0.07, baseY - size * 0.38, size * 0.14, size * 0.08);
                ctx.fillStyle = '#af443e';
                ctx.beginPath();
                ctx.arc(x - size * 0.09, baseY - size * 0.24, size * 0.035, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#4e91a0';
                ctx.beginPath();
                ctx.arc(x + size * 0.09, baseY - size * 0.24, size * 0.035, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else if (obj.decor === 'officeVending') {
                const machineY = spriteY - size * 0.55;
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 9;
                ctx.fillStyle = '#39443f';
                ctx.fillRect(x - size * 0.48, machineY, size * 0.96, size * 1.18);
                ctx.fillStyle = '#9aab9c';
                ctx.fillRect(x - size * 0.38, machineY + size * 0.1, size * 0.76, size * 0.72);
                for (let shelf = 0; shelf < 3; shelf++) {
                    const shelfY = machineY + size * (0.2 + shelf * 0.2);
                    ctx.fillStyle = '#71847b';
                    ctx.fillRect(x - size * 0.34, shelfY + size * 0.14, size * 0.68, size * 0.025);
                    for (let snack = 0; snack < 4; snack++) {
                        ctx.fillStyle = ['#b86e54', '#d1b76e', '#648d9b', '#9f9b76'][(shelf + snack) % 4];
                        ctx.fillRect(x - size * 0.29 + snack * size * 0.16, shelfY, size * 0.1, size * 0.14);
                    }
                }
                ctx.fillStyle = '#4a544f';
                ctx.fillRect(x - size * 0.28, machineY + size * 0.91, size * 0.56, size * 0.16);
                ctx.fillStyle = '#d8c47b';
                ctx.fillRect(x + size * 0.27, machineY + size * 0.2, size * 0.08, size * 0.12);
                ctx.shadowBlur = 0;
            } else if (obj.decor === 'moss') {
                ctx.fillStyle = '#5b7c54';
                ctx.fillRect(x - size * 10, spriteY + 10, size * 20, size * 10);
                ctx.fillStyle = 'rgba(132, 191, 120, 0.55)';
                ctx.fillRect(x - size * 6, spriteY + 4, size * 12, size * 8);
            } else if (obj.decor === 'torch') {
                ctx.fillStyle = '#4f3a2d';
                ctx.fillRect(x - size * 2, spriteY - size * 18, size * 4, size * 16);
                ctx.fillStyle = '#ffb35f';
                ctx.beginPath();
                ctx.arc(x, spriteY - size * 22, size * 8, 0, Math.PI * 2);
                ctx.fill();
            } else if (obj.decor === 'apparition') {
                ctx.globalAlpha *= 0.52;
                ctx.fillStyle = '#899b94';
                ctx.beginPath();
                ctx.moveTo(x, spriteY - size * 0.95);
                ctx.lineTo(x - size * 0.46, spriteY - size * 0.28);
                ctx.lineTo(x - size * 0.34, spriteY + size * 0.48);
                ctx.lineTo(x, spriteY + size * 0.3);
                ctx.lineTo(x + size * 0.34, spriteY + size * 0.48);
                ctx.lineTo(x + size * 0.46, spriteY - size * 0.28);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(190, 224, 210, 0.72)';
                ctx.fillRect(x - size * 0.19, spriteY - size * 0.61, size * 0.08, size * 0.035);
                ctx.fillRect(x + size * 0.11, spriteY - size * 0.61, size * 0.08, size * 0.035);
            } else if (obj.decor === 'blood') {
                ctx.fillStyle = 'rgba(88, 5, 13, 0.78)';
                ctx.beginPath();
                ctx.ellipse(x, spriteY + size * 0.16, size * 0.9, size * 0.24, -0.16, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(148, 17, 27, 0.68)';
                ctx.beginPath();
                ctx.arc(x - size * 0.32, spriteY + size * 0.08, size * 0.16, 0, Math.PI * 2);
                ctx.arc(x + size * 0.46, spriteY + size * 0.2, size * 0.1, 0, Math.PI * 2);
                ctx.fill();
            } else if (obj.decor === 'claws') {
                ctx.strokeStyle = 'rgba(117, 25, 31, 0.78)';
                ctx.lineWidth = Math.max(1, size * 0.075);
                ctx.lineCap = 'round';
                for (let mark = -1; mark <= 1; mark++) {
                    ctx.beginPath();
                    ctx.moveTo(x + mark * size * 0.38, spriteY - size * 0.2);
                    ctx.lineTo(x + mark * size * 0.38 + size * 0.08, spriteY + size * 0.22);
                    ctx.stroke();
                }
            } else if (obj.decor === 'bones') {
                ctx.strokeStyle = 'rgba(174, 165, 139, 0.78)';
                ctx.lineWidth = Math.max(1, size * 0.13);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x - size * 0.55, spriteY - size * 0.16);
                ctx.lineTo(x + size * 0.55, spriteY + size * 0.16);
                ctx.moveTo(x - size * 0.55, spriteY + size * 0.16);
                ctx.lineTo(x + size * 0.55, spriteY - size * 0.16);
                ctx.stroke();
                ctx.fillStyle = '#b8ad91';
                ctx.beginPath();
                ctx.arc(x, spriteY, size * 0.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (obj.decor === 'paper') {
                ctx.save();
                ctx.translate(x, spriteY);
                ctx.rotate(-0.12);
                ctx.fillStyle = 'rgba(173, 158, 124, 0.72)';
                ctx.fillRect(-size * 0.58, -size * 0.38, size * 1.16, size * 0.76);
                ctx.strokeStyle = 'rgba(65, 53, 42, 0.72)';
                ctx.lineWidth = Math.max(1, size * 0.07);
                for (let line = -1; line <= 1; line++) {
                    ctx.beginPath();
                    ctx.moveTo(-size * 0.35, line * size * 0.15);
                    ctx.lineTo(size * (line === 1 ? 0.12 : 0.35), line * size * 0.15);
                    ctx.stroke();
                }
                ctx.restore();
            } else if (obj.decor === 'glass') {
                ctx.fillStyle = 'rgba(129, 190, 197, 0.72)';
                ctx.beginPath();
                ctx.moveTo(x - size * 0.62, spriteY + size * 0.18);
                ctx.lineTo(x - size * 0.12, spriteY - size * 0.4);
                ctx.lineTo(x + size * 0.05, spriteY + size * 0.28);
                ctx.lineTo(x + size * 0.58, spriteY - size * 0.12);
                ctx.lineTo(x + size * 0.3, spriteY + size * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = 'rgba(207, 240, 235, 0.72)';
                ctx.lineWidth = Math.max(1, size * 0.06);
                ctx.beginPath();
                ctx.moveTo(x - size * 0.12, spriteY - size * 0.28);
                ctx.lineTo(x + size * 0.05, spriteY + size * 0.2);
                ctx.stroke();
            } else if (obj.decor === 'web') {
                ctx.strokeStyle = 'rgba(177, 184, 174, 0.58)';
                ctx.lineWidth = Math.max(1, size * 0.045);
                for (let ray = 0; ray < 4; ray++) {
                    const angle = ray * Math.PI / 4;
                    ctx.beginPath();
                    ctx.moveTo(x, spriteY);
                    ctx.lineTo(x + Math.cos(angle) * size * 0.8, spriteY + Math.sin(angle) * size * 0.8);
                    ctx.stroke();
                }
                for (let ring = 1; ring <= 2; ring++) {
                    ctx.beginPath();
                    ctx.ellipse(x, spriteY, size * ring * 0.24, size * ring * 0.24, 0, Math.PI, Math.PI * 1.75);
                    ctx.stroke();
                }
            } else if (obj.decor === 'code') {
                const glowRing = ctx.createRadialGradient(x, spriteY, 1, x, spriteY, size * 18);
                glowRing.addColorStop(0, 'rgba(255, 245, 152, 0.9)');
                glowRing.addColorStop(0.45, 'rgba(255, 212, 75, 0.45)');
                glowRing.addColorStop(1, 'rgba(255, 212, 75, 0)');
                ctx.fillStyle = glowRing;
                ctx.fillRect(x - size * 18, spriteY - size * 18, size * 36, size * 36);
                ctx.fillStyle = '#ffd94d';
                ctx.beginPath();
                ctx.arc(x, spriteY, size * 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff9d1';
                ctx.fillRect(x - size * 3, spriteY - size * 10, size * 6, size * 20);
                ctx.fillRect(x - size * 10, spriteY - size * 3, size * 20, size * 6);
            } else {
                ctx.fillStyle = obj.lamp ? '#fff0bd' : '#ffffff';
                ctx.fillText(obj.icon,x,spriteY); 
            }
            if (obj.hasEyes && !artworkDrawn) {
                const eyeW = size * 0.12;
                const eyeH = size * 0.09;
                ctx.fillStyle = '#ff3d46';
                ctx.fillRect(x - eyeW * 2.2, spriteY - eyeH * 1.3, eyeW, eyeH);
                ctx.fillRect(x + eyeW * 0.8, spriteY - eyeH * 1.3, eyeW, eyeH);
            }
            ctx.shadowBlur=0; ctx.globalAlpha=1;
        }
        // Dark vignette keeps the flashlight beam clear and the edges threatening.
        const vignette=ctx.createRadialGradient(w/2,horizon,w*.08,w/2,horizon,w*.75);
        vignette.addColorStop(0,'rgba(0,0,0,0)'); vignette.addColorStop(.55,'rgba(0,0,0,.2)'); vignette.addColorStop(1,'rgba(0,0,0,.88)');
        ctx.fillStyle=vignette; ctx.fillRect(0,0,w,h);
        drawMazeAtmosphere(now, w, h, horizon);
        if (lampFlicker > 0.02) {
            ctx.fillStyle = `rgba(5, 2, 6, ${lampFlicker * 0.12})`;
            ctx.fillRect(0, 0, w, h);
        }
        if (gameMode === 'regular' && worldMode === 'house' && player.health < 55) {
            const intensity = (1 - player.health / 55) * (0.55 + (Math.sin(now / 360) + 1) * 0.18);
            const heartbeat = ctx.createRadialGradient(w / 2, h / 2, w * 0.22, w / 2, h / 2, w * 0.78);
            heartbeat.addColorStop(0, 'rgba(75, 0, 0, 0)');
            heartbeat.addColorStop(0.62, 'rgba(75, 0, 0, 0)');
            heartbeat.addColorStop(1, `rgba(120, 0, 12, ${intensity * 0.34})`);
            ctx.fillStyle = heartbeat;
            ctx.fillRect(0, 0, w, h);
        }
        if (gameMode === 'regular' && worldMode === 'house' && monster.active) {
            const nearestThreat = Math.min(
                Math.hypot(player.x - monster.x, player.y - monster.y),
                ...stalkers.map(stalker => Math.hypot(player.x - stalker.x, player.y - stalker.y)),
                ...roomHunters.filter(hunter => hunter.active).map(hunter => Math.hypot(player.x - hunter.x, player.y - hunter.y)),
                ...keyGuards.filter(guard => guard.active).map(guard => Math.hypot(player.x - guard.x, player.y - guard.y))
            );
            const danger = Math.max(monster.state === 'hunt' ? 0.72 : 0, Math.max(0, 1 - nearestThreat / 7) * 0.6);
            if (danger > 0.02) {
                const pulse = 0.78 + Math.sin(now / 170) * 0.22;
                const warning = ctx.createRadialGradient(w / 2, horizon, w * 0.12, w / 2, horizon, w * 0.78);
                warning.addColorStop(0, 'rgba(70,0,0,0)');
                warning.addColorStop(0.62, 'rgba(90,0,0,0)');
                warning.addColorStop(1, `rgba(145,0,12,${danger * pulse * 0.58})`);
                ctx.fillStyle = warning;
                ctx.fillRect(0, 0, w, h);
            }
        }
        if (gameMode === 'halloween') {
            drawFlashlightOverlay();
        }
        ctx.fillStyle='rgba(220,225,210,.42)'; ctx.fillRect(w/2-1,horizon-5,2,10); ctx.fillRect(w/2-5,horizon-1,10,2);
        drawGhostCapture();

        drawHands();

        if (worldMode === 'outside' && challengeMode) {
            ctx.fillStyle='rgba(5,10,14,.82)'; ctx.fillRect(18,18,360,58);
            ctx.fillStyle=challengeMode==='tornado'?'#e0d9ff':'#a8edff';
            ctx.font='bold 14px "Courier New"'; ctx.textAlign='left'; ctx.textBaseline='top';
            ctx.fillText(challengeMode==='tornado'?'TORNADO RUN':'TSUNAMI ESCAPE',28,24);
            ctx.fillStyle='#edf4f7'; ctx.font='12px "Courier New"';
            const challengeStatus=challengeMode==='tornado'
                ? `SUPPLIES  ${3-disasterCaches.filter(cache=>!cache.active).length}/3  ·  STORM ${Math.hypot(player.x-tornado.x,player.y-tornado.y).toFixed(0)}m`
                : `HIGH GROUND  ·  WAVE ${Math.max(0,tsunamiFrontY).toFixed(0)}m`;
            ctx.fillText(challengeStatus,28,48);
        } else if (worldMode === 'outside' && (gameMode==='regular' || halloweenStage==='yard')) {
            // Outdoor enemy health display and first-person pistol.
            ctx.fillStyle='rgba(8,8,12,.82)'; ctx.fillRect(18,18,310,58);
            ctx.fillStyle='#fff'; ctx.font='bold 14px "Courier New"'; ctx.textAlign='left'; ctx.textBaseline='top';
            const outdoorLabel=gameMode==='halloween'?'SCARECROW':`PHASE ${bossPhase}`;
            ctx.fillText(boss.hp > 0 ? `${outdoorLabel}  ${boss.hp} / ${boss.maxHp} HP` : (gameMode==='halloween'?'SCARECROW DEFEATED':'BOSS DEFEATED'),28,24);
            ctx.fillStyle='#3b2429'; ctx.fillRect(28,46,288,14);
            ctx.fillStyle=boss.hp>0?'#ed344e':'#42c983'; ctx.fillRect(28,46,288*(boss.hp/boss.maxHp),14);
            ctx.strokeStyle='rgba(255,255,255,.65)'; ctx.strokeRect(28,46,288,14);
            ctx.save();
            ctx.translate(w-150,h-20);
            ctx.fillStyle='#704b3f'; ctx.beginPath(); ctx.moveTo(-15,25); ctx.lineTo(-70,75); ctx.lineTo(28,75); ctx.lineTo(18,25); ctx.fill();
            ctx.fillStyle='#252a31'; ctx.fillRect(-12,-8,92,27);
            ctx.fillStyle='#69737c'; ctx.fillRect(12,-17,55,11);
            ctx.fillStyle='#171b20'; ctx.fillRect(56,-14,19,5);
            ctx.fillStyle='#343a42'; ctx.fillRect(0,-2,34,17);
            if(muzzleFlash>0) { ctx.fillStyle='#fff2a1'; ctx.shadowColor='#ff9c32'; ctx.shadowBlur=25; ctx.beginPath(); ctx.moveTo(77,-15); ctx.lineTo(115,-5); ctx.lineTo(78,1); ctx.fill(); ctx.shadowBlur=0; }
            ctx.restore();
            if(gameMode==='regular' && Math.hypot(player.x-CAR_POS.x,player.y-CAR_POS.y)<=3.5) {
                ctx.fillStyle='#eaf4ff'; ctx.font='bold 18px "Courier New"'; ctx.textAlign='center'; ctx.textBaseline='alphabetic';
                ctx.fillText(carKeyFound ? (boss.hp>0?'DEFEAT THE BOSS · THEN PRESS F':'PRESS F TO ESCAPE') : 'FIND THE CAR KEY',w/2,h-42);
            }
        }
        if(gameMode==='halloween' && halloweenStage==='house') {
            ctx.fillStyle='rgba(8,8,12,.84)'; ctx.fillRect(18,18,290,58);
            ctx.fillStyle='#eaffff'; ctx.font='bold 14px "Courier New"'; ctx.textAlign='left'; ctx.textBaseline='top';
            ctx.fillText(ghost.active?`GHOST  ${ghost.hp} / ${ghost.maxHp} HP`:'GHOST DEFEATED',28,24);
            ctx.fillStyle='#243a3b'; ctx.fillRect(28,46,268,14);
            ctx.fillStyle=ghost.active?'#7de5e5':'#42c983'; ctx.fillRect(28,46,268*(ghost.hp/ghost.maxHp),14);
            ctx.strokeStyle='rgba(255,255,255,.65)'; ctx.strokeRect(28,46,268,14);
        }

        // Live overhead radar: the red blip tracks the monster across the maze.
        const radarSize = 166, radarX = w - radarSize - 18, radarY = 18;
        ctx.fillStyle='rgba(5,10,11,.86)'; ctx.fillRect(radarX,radarY,radarSize,radarSize);
        ctx.strokeStyle='rgba(152,190,164,.65)'; ctx.lineWidth=1.5; ctx.strokeRect(radarX,radarY,radarSize,radarSize);
        ctx.fillStyle='#c8dec9'; ctx.font='bold 12px "Courier New"'; ctx.textAlign='left'; ctx.textBaseline='top';
        const radarTitle=challengeMode==='tornado'
            ? 'RADAR · WIND FUNNEL'
            : challengeMode==='tsunami'
                ? 'RADAR · WAVE FRONT'
                : gameMode==='halloween'
            ? (halloweenStage==='house'?'RADAR · GHOST':'RADAR · SCARECROW')
            : (worldMode==='armory'?'RADAR · SAFE ROOM':worldMode==='house'?'RADAR · RED = SIGHT':'RADAR · RED = BOSS');
        ctx.fillText(radarTitle,radarX+7,radarY+5);
        const radarScale=4.1, mapPixel=MAP_W*radarScale, mapX=radarX+(radarSize-mapPixel)/2, mapY=radarY+19;
        for(let my=0;my<MAP_H;my++) for(let mx=0;mx<MAP_W;mx++) {
            if(map[my][mx]===1) { ctx.fillStyle='rgba(156,173,158,.52)'; ctx.fillRect(mapX+mx*radarScale,mapY+my*radarScale,radarScale,radarScale); }
        }
        if(worldMode==='house' && gameMode==='regular') {
            const doorX=mapX+(GREEN_DOOR_POS.x+0.5)*radarScale;
            const doorY=mapY+(GREEN_DOOR_POS.y+0.5)*radarScale;
            const pulse=.8+.2*Math.sin(Date.now()/180);
            ctx.fillStyle=`rgba(65,255,125,${pulse})`; ctx.shadowColor='#42f078'; ctx.shadowBlur=10;
            ctx.beginPath(); ctx.arc(doorX,doorY,4.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
            if(secretWall.discovered && !greenDoorClueFound) {
                const clueX=mapX+8.5*radarScale, clueY=mapY+9.5*radarScale;
                ctx.fillStyle='#ffd76a'; ctx.shadowColor='#ffd76a'; ctx.shadowBlur=8;
                ctx.font='bold 10px "Courier New"'; ctx.textAlign='center'; ctx.textBaseline='middle';
                ctx.fillText('?',clueX,clueY); ctx.shadowBlur=0;
            }
            if (worldMode==='outside' && challengeMode==='tornado') {
                ctx.fillStyle='#ffd76a'; ctx.shadowColor='#ffd76a'; ctx.shadowBlur=7;
                disasterCaches.filter(cache=>cache.active).forEach(cache=>{
                    ctx.beginPath(); ctx.arc(mapX+cache.x*radarScale,mapY+cache.y*radarScale,3.5,0,Math.PI*2); ctx.fill();
                });
                ctx.fillStyle='#e4e7ff'; ctx.shadowColor='#d5d8ff'; ctx.shadowBlur=10;
                ctx.beginPath(); ctx.arc(mapX+tornado.x*radarScale,mapY+tornado.y*radarScale,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
            }
            if (worldMode==='outside' && challengeMode==='tsunami') {
                const waveY=mapY+Math.max(0,tsunamiFrontY)*radarScale;
                ctx.beginPath(); ctx.moveTo(mapX,waveY);
                for(let x=0;x<=MAP_W*radarScale;x+=4) ctx.lineTo(mapX+x,waveY+Math.sin(x*.12+Date.now()*.01)*2);
                ctx.strokeStyle='#53d9ff'; ctx.lineWidth=2; ctx.shadowColor='#53d9ff'; ctx.shadowBlur=6; ctx.stroke(); ctx.shadowBlur=0;
                ctx.fillStyle='#ffe277'; ctx.beginPath(); ctx.arc(mapX+15.5*radarScale,mapY+2.5*radarScale,4,0,Math.PI*2); ctx.fill();
            }
            ctx.fillStyle='#8affaa'; ctx.font='bold 8px "Courier New"'; ctx.textAlign='left'; ctx.textBaseline='top';
            ctx.fillText(greenDoorOpen?'GREEN = OPEN DOOR':greenDoorClueFound?'GREEN = CODE 1234':'GREEN = LOCKED · ? = NOTE',radarX+7,radarY+148);
        }
        if(gameState==='playing' && worldMode==='house' && gameMode==='regular') {
            const mrx=mapX+monster.x*radarScale, mry=mapY+monster.y*radarScale;
            const rangePx=MONSTER_SIGHT_RANGE*radarScale;
            ctx.beginPath(); ctx.moveTo(mrx,mry);
            ctx.arc(mrx,mry,rangePx,monster.angle-MONSTER_SIGHT_ANGLE/2,monster.angle+MONSTER_SIGHT_ANGLE/2);
            ctx.closePath(); ctx.fillStyle='rgba(255,48,48,.12)'; ctx.fill();
            ctx.beginPath(); ctx.arc(mrx,mry,rangePx,0,Math.PI*2);
            ctx.setLineDash([4,4]); ctx.strokeStyle='rgba(255,90,90,.62)'; ctx.lineWidth=1.2; ctx.stroke(); ctx.setLineDash([]);
            ctx.beginPath(); ctx.moveTo(mrx,mry);
            ctx.arc(mrx,mry,rangePx,monster.angle-MONSTER_SIGHT_ANGLE/2,monster.angle+MONSTER_SIGHT_ANGLE/2);
            ctx.strokeStyle='rgba(255,90,90,.48)'; ctx.stroke();
            for(const stalker of stalkers.filter(s => s.active)) {
                ctx.fillStyle=stalker.color; ctx.shadowColor=stalker.color; ctx.shadowBlur=8;
                ctx.beginPath(); ctx.arc(mapX+stalker.x*radarScale,mapY+stalker.y*radarScale,3.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
            }
            for (const hunter of roomHunters) if (hunter.active) {
                ctx.fillStyle = hunter.color; ctx.shadowColor = hunter.color; ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(mapX + hunter.x * radarScale, mapY + hunter.y * radarScale, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            }
            for(const guard of keyGuards) if(guard.active) {
                ctx.fillStyle=guard.color; ctx.shadowColor=guard.color; ctx.shadowBlur=8;
                ctx.beginPath(); ctx.arc(mapX+guard.x*radarScale,mapY+guard.y*radarScale,3.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
            }
        }
        if(gameState==='playing' && gameMode==='halloween' && halloweenStage==='house' && ghost.active) {
            ctx.fillStyle='#bdfcff'; ctx.shadowColor='#8ff'; ctx.shadowBlur=9;
            ctx.beginPath(); ctx.arc(mapX+ghost.x*radarScale,mapY+ghost.y*radarScale,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        if(!player.inCloset) {
            const px=mapX+player.x*radarScale, py=mapY+player.y*radarScale;
            ctx.fillStyle='#7de5ff'; ctx.beginPath(); ctx.arc(px,py,3.5,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='#7de5ff'; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+Math.cos(player.angle)*8,py+Math.sin(player.angle)*8); ctx.stroke();
        }
        if(gameState==='playing' && worldMode==='house' && gameMode==='regular' && !player.inCloset) {
            const pulse=.75+.25*Math.sin(Date.now()/150);
            ctx.fillStyle=`rgba(255,55,55,${pulse})`; ctx.shadowColor='#ff2525'; ctx.shadowBlur=10;
            ctx.beginPath(); ctx.arc(mapX+monster.x*radarScale,mapY+monster.y*radarScale,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        if(gameState==='playing' && worldMode==='outside' && boss.hp>0) {
            ctx.fillStyle=gameMode==='halloween'?'#ffbd55':'#ff465e'; ctx.shadowColor=gameMode==='halloween'?'#ff9d35':'#ff253e'; ctx.shadowBlur=9;
            ctx.beginPath(); ctx.arc(mapX+boss.x*radarScale,mapY+boss.y*radarScale,4.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }

        if (player.inCloset) {
            ctx.fillStyle='rgba(0,0,0,.88)'; ctx.fillRect(0,0,w,h);
            ctx.fillStyle='#aaa'; ctx.font='bold 18px "Courier New"'; ctx.textAlign='center';
            ctx.fillText('(hidden in closet — press E to exit)', w/2, 40);
        }

        // Message
        if (worldMode === 'armory') {
            ctx.fillStyle = 'rgba(8, 8, 8, 0.78)';
            ctx.fillRect(w / 2 - 210, 22, 420, 38);
            ctx.fillStyle = '#ffe0a0';
            ctx.font = 'bold 17px "Courier New"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('SAFE ROOM  ·  WEAPON BENCH', w / 2, 41);
        }
        if (message && messageTimer > 0) {
            ctx.font = 'bold 20px "Courier New"';
            ctx.fillStyle = '#fff8e7';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 12;
            ctx.textAlign = 'center';
            ctx.fillText(message, w/2, 555);
            ctx.shadowBlur = 0;
        }

        // Game over overlays
        if (gameState === 'won') {
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#d4ffa2';
            ctx.font = 'bold 54px "Courier New"';
            ctx.textAlign = 'center';
            const victoryTitle = challengeMode === 'tornado'
                ? 'TORNADO ESCAPED!'
                : challengeMode === 'tsunami'
                    ? 'YOU REACHED HIGH GROUND!'
                    : gameMode === 'halloween' ? 'YOU ESCAPED HALLOWEEN!' : 'YOU ESCAPED!';
            ctx.fillText(victoryTitle, w/2, 280);
            ctx.font = 'bold 22px "Courier New"';
            ctx.fillStyle = '#ccc';
            ctx.fillText(disasterModesUnlocked && challengeMode === null
                ? '🌪️ TORNADO + 🌊 TSUNAMI MODES UNLOCKED ABOVE'
                : 'press R or click RESTART', w/2, 360);
        } else if (gameState === 'lost') {
            ctx.fillStyle = 'rgba(20,0,0,0.85)';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 54px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('YOU DIED', w/2, 280);
            ctx.font = 'bold 22px "Courier New"';
            ctx.fillStyle = '#ccc';
            ctx.fillText('press R or click RESTART', w/2, 360);
        }

        // Keep the weapon as the final front-most layer.
        drawHands();
        ctx.restore();
    }

    // ---------- MAIN LOOP ----------
    let lastTime = performance.now();

    function gameLoop(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        secretWeaponAnimationTimer = Math.max(0, secretWeaponAnimationTimer - dt);

        if (gameState === 'playing') {
            updatePlayer(dt);
            updateDisasterChallenge(dt);
            updateMonster(dt);
            updateStalkers(dt);
            updateRoomHunters(dt);
            updateKeyGuards(dt);
            updateBoss(dt);
            updateGhost(dt);
            if (captureFX) {
                captureFX.life -= dt;
                if (captureFX.life <= 0) captureFX = null;
            }
            weaponCooldown = Math.max(0, weaponCooldown - dt);
            shotCooldown = Math.max(0, shotCooldown - dt);
            muzzleFlash = Math.max(0, muzzleFlash - dt);
            screenShake = Math.max(0, screenShake - dt);
            const currentWeapon = WEAPON_DEFS[player.weapon] || WEAPON_DEFS.pistol;
            document.getElementById('weaponStatus').textContent = powerUpTimer > 0
                ? '⚡ BOOST'
                : (worldMode === 'outside'
                    ? (shotCooldown > 0 ? `${currentWeapon.icon} ${shotCooldown.toFixed(1)}s` : `${currentWeapon.icon} ${currentWeapon.label}`)
                    : (weaponCooldown > 0 ? `${currentWeapon.icon} ${weaponCooldown.toFixed(1)}s` : `${currentWeapon.icon} ${currentWeapon.label}`));
            if (messageTimer > 0) {
                messageTimer -= dt;
                if (messageTimer <= 0) message = '';
            }
            document.getElementById('health').textContent = Math.floor(player.health);
        }

        draw();

        if (keys.e && !ePressed) {
            ePressed = true;
            interact();
        } else if (!keys.e) {
            ePressed = false;
        }
        if (keys.space && !spacePressed) {
            spacePressed = true;
            useWeapon();
        } else if (!keys.space) {
            spacePressed = false;
        }
        if (keys.f && !fPressed) {
            fPressed = true;
            useCar();
        } else if (!keys.f) {
            fPressed = false;
        }

        requestAnimationFrame(gameLoop);
    }

    // ---------- INPUT ----------
    const movementKeys = {
        KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
        ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd'
    };

    window.addEventListener('keydown', (e) => {
        if(gameState==='puzzle') {
            if(e.key==='Escape' && e.target!==document.getElementById('doorCodeInput')) cancelDoorPuzzle();
            if(e.target===document.getElementById('doorCodeInput')) e.stopPropagation();
            else { e.preventDefault(); e.stopPropagation(); }
            return;
        }
        const key = movementKeys[e.code] || e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key)) {
            keys[key] = true;
            e.preventDefault();
        } else if (key === 'shift') {
            keys.shift = true;
            e.preventDefault();
        } else if (key === 'e') {
            keys.e = true;
            e.preventDefault();
        } else if (key === 'f') {
            keys.f = true;
            e.preventDefault();
        } else if (key === ' ') {
            keys.space = true;
            e.preventDefault();
        } else if (key === 'g') {
            shootBoss();
            e.preventDefault();
        } else if (key === 'v') {
            switchWeapon();
            e.preventDefault();
        } else if ((e.code === 'Digit5' || e.code === 'Numpad5') && !e.repeat) {
            secretWeaponAnimationTimer = SECRET_WEAPON_ANIMATION_DURATION;
            e.preventDefault();
        } else if (key === 'l' && !e.repeat) {
            awardMoney(1000, 'bonus credits');
            e.preventDefault();
        } else if (key === 'r') {
            resetGame();
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = movementKeys[e.code] || e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key)) {
            keys[key] = false;
            e.preventDefault();
        } else if (key === 'shift') {
            keys.shift = false;
            e.preventDefault();
        } else if (key === 'e') {
            keys.e = false;
            e.preventDefault();
        } else if (key === 'f') {
            keys.f = false;
            e.preventDefault();
        } else if (key === ' ') {
            keys.space = false;
            e.preventDefault();
        }
    });

    // A keyup can be missed if the window loses focus while a key is held.
    window.addEventListener('blur', () => {
        Object.keys(keys).forEach(key => { keys[key] = false; });
    });

    document.querySelectorAll('[data-movement-key]').forEach(button => {
        const key = button.dataset.movementKey;
        const release = () => {
            keys[key] = false;
            button.setAttribute('aria-pressed', 'false');
        };
        button.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            keys[key] = true;
            button.setAttribute('aria-pressed', 'true');
            button.setPointerCapture(e.pointerId);
        });
        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
        button.addEventListener('lostpointercapture', release);
    });

    // Prevent scroll on arrow keys/space
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
    }, false);

    document.getElementById('restartBtn').addEventListener('click', resetGame);
    document.querySelectorAll('[data-keypad-digit]').forEach(button => {
        button.addEventListener('click', () => {
            const input = document.getElementById('doorCodeInput');
            if (input.value.length < input.maxLength) input.value += button.dataset.keypadDigit;
            input.focus();
            document.getElementById('puzzleFeedback').textContent = '';
        });
    });
    document.querySelectorAll('[data-keypad-action]').forEach(button => {
        button.addEventListener('click', () => {
            const input = document.getElementById('doorCodeInput');
            input.value = button.dataset.keypadAction === 'clear' ? '' : input.value.slice(0, -1);
            input.focus();
            document.getElementById('puzzleFeedback').textContent = '';
        });
    });
    document.getElementById('doorPuzzleForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const entered = document.getElementById('doorCodeInput').value.trim();
        if (activePuzzle === 'greenDoor' && entered === GREEN_DOOR_CODE) {
            document.getElementById('doorPuzzle').hidden = true;
            gameState = 'playing';
            unlockGreenDoor();
        } else if (activePuzzle === 'exit' && Number(entered) === HUMAN_CHECK_ANSWER) {
            doorPuzzleSolved = true;
            document.getElementById('doorPuzzle').hidden = true;
            gameState = 'playing';
            message = 'Human check passed. The door unlocks!';
            messageTimer = 2;
            enterOutside();
        } else if (activePuzzle === 'greenDoor') {
            document.getElementById('puzzleFeedback').textContent = 'Incorrect code. The green door stays locked.';
            const form = document.getElementById('doorPuzzleForm');
            form.classList.remove('wrong-code');
            void form.offsetWidth;
            form.classList.add('wrong-code');
            window.setTimeout(() => form.classList.remove('wrong-code'), 600);
            document.getElementById('doorCodeInput').select();
        } else {
            document.getElementById('puzzleFeedback').textContent = 'Not quite. 2 + 3 = 5 — try again.';
            document.getElementById('doorCodeInput').select();
        }
    });
    document.getElementById('puzzleCancel').addEventListener('click', cancelDoorPuzzle);
    document.getElementById('enterMazeBtn').addEventListener('click', enterMazeFromArmory);
    document.querySelectorAll('[data-shop-weapon]').forEach(button => {
        button.addEventListener('click', () => buyOrEquipWeapon(button.dataset.shopWeapon));
    });
    document.querySelectorAll('[data-shop-upgrade]').forEach(button => {
        button.addEventListener('click', () => buyUpgrade(button.dataset.shopUpgrade));
    });
    document.getElementById('regularMode').addEventListener('click', () => {
        selectedMode='regular';
        resetGame();
    });
    document.getElementById('halloweenMode').addEventListener('click', () => {
        selectedMode='halloween';
        resetGame();
    });
    document.getElementById('tornadoMode').addEventListener('click', () => startDisasterMode('tornado'));
    document.getElementById('tsunamiMode').addEventListener('click', () => startDisasterMode('tsunami'));
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) shootBoss();
    });

    // Initialize & start
    resetGame();
    updateDisasterModeButtons();
    requestAnimationFrame(gameLoop);
})();
