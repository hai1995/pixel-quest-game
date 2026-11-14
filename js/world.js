import { MAPS, NPCS, TILE, TILE_PROPS } from './data.js';
import { choice, distCheb, rand, uuid } from './utils.js';
import { Enemy } from './enemy.js';

export class World {
  constructor() {
    this.currentMapId = 'town';
    this.map = MAPS.town;
    this.tiles = this.map.rows;
    this.npcs = [];
    this.enemies = [];
    this.itemDrops = [];
    this.resourceRespawns = [];
    this.tileStates = new Map();
    this.respawnQueues = new Map();
    this.enemyRespawnTimer = 0;
    this.loadMap('town');
  }

  reset(mapId = 'town') {
    this.tileStates.clear();
    this.respawnQueues.clear();
    this.itemDrops = [];
    this.loadMap(mapId);
  }

  loadMap(id) {
    const map = MAPS[id] || MAPS.town;
    this.currentMapId = MAPS[id] ? id : 'town';
    this.map = map;
    if (!this.tileStates.has(this.currentMapId)) {
      this.tileStates.set(this.currentMapId, map.rows.map(row => row.slice()));
    }
    this.tiles = this.tileStates.get(this.currentMapId);
    this.width = Math.max(...this.tiles.map(row => row.length));
    this.height = this.tiles.length;
    this.spawnX = map.spawn.x;
    this.spawnY = map.spawn.y;
    this.portals = map.portals || [];
    this.npcs = Object.entries(NPCS)
      .filter(([, npc]) => npc.map === this.currentMapId)
      .map(([id, npc]) => ({ ...npc, id }));
    this.enemies = [];
    this.itemDrops = [];
    if (!this.respawnQueues.has(this.currentMapId)) this.respawnQueues.set(this.currentMapId, []);
    this.resourceRespawns = this.respawnQueues.get(this.currentMapId);
    this.spawnEnemies();
    this.enemyRespawnTimer = 1.5;
  }

  enemyTargetCount() {
    return this.currentMapId === 'dungeon' ? 9 : 13;
  }

  reachableTiles(from) {
    if (!from) return null;
    const seen = new Set([`${from.x},${from.y}`]);
    const queue = [[from.x, from.y]];
    let head = 0;
    while (head < queue.length) {
      const [x, y] = queue[head++];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || !TILE_PROPS[this.getTile(nx, ny)]?.walk) continue;
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
    return seen;
  }

  spawnNormalEnemy(avoid = null, reachable = null, minDistance = 8) {
    const types = (this.map.enemies || []).filter(type => type !== 'dragon');
    if (!types.length) return false;
    if (reachable) {
      const pool = [];
      for (const key of reachable) {
        const [x, y] = key.split(',').map(Number);
        if (avoid && distCheb({ x, y }, avoid) < minDistance) continue;
        if (this.getEnemyAt(x, y) || this.getPortalAt(x, y)) continue;
        if (this.npcs.some(npc => npc.x === x && npc.y === y)) continue;
        pool.push({ x, y });
      }
      if (!pool.length) return false;
      const pos = choice(pool);
      this.enemies.push(new Enemy(choice(types), pos.x, pos.y));
      return true;
    }
    for (let attempts = 0; attempts < 300; attempts++) {
      const x = rand(1, this.width - 2);
      const y = rand(1, this.height - 2);
      if (!this.isWalkable(x, y)) continue;
      if (this.getPortalAt(x, y)) continue;
      if (this.npcs.some(npc => npc.x === x && npc.y === y)) continue;
      if (avoid && distCheb({ x, y }, avoid) < minDistance) continue;
      this.enemies.push(new Enemy(choice(types), x, y));
      return true;
    }
    return false;
  }

  spawnEnemies() {
    if (!(this.map.enemies || []).length || this.map.safe) return;
    const spawn = { x: this.spawnX, y: this.spawnY };
    const reachable = this.reachableTiles(spawn);
    let attempts = 0;
    while (this.enemies.length < this.enemyTargetCount() && attempts++ < 200) {
      const before = this.enemies.length;
      this.spawnNormalEnemy(spawn, reachable, 5);
      if (this.enemies.length === before) break;
    }
    if (this.map.boss && this.isWalkable(this.map.boss.x, this.map.boss.y)) {
      this.enemies.push(new Enemy(this.map.boss.id, this.map.boss.x, this.map.boss.y));
    }
  }

  updateEnemyRespawn(dt, game) {
    if (this.map.safe || !(this.map.enemies || []).length) return;
    this.enemyRespawnTimer -= dt;
    if (this.enemyRespawnTimer > 0) return;
    this.enemyRespawnTimer = 2.2;
    const aliveNormals = this.enemies.filter(enemy => !enemy.dead && !enemy.boss).length;
    if (aliveNormals >= this.enemyTargetCount()) return;
    const player = game?.player;
    if (!player || player.dead) return;
    this.spawnNormalEnemy(player, this.reachableTiles(player));
  }

  getTile(x, y) {
    if (y < 0 || y >= this.tiles.length || x < 0 || x >= (this.tiles[y]?.length || 0)) return TILE.WALL;
    return this.tiles[y][x];
  }

  setTile(x, y, tile) {
    if (y >= 0 && y < this.tiles.length && x >= 0 && x < this.tiles[y].length) this.tiles[y][x] = tile;
  }

  isWalkable(x, y, entity = null) {
    const tile = this.getTile(x, y);
    if (!TILE_PROPS[tile]?.walk) return false;
    if (this.npcs.some(npc => npc.x === x && npc.y === y)) return false;
    const occupant = this.getEnemyAt(x, y);
    if (occupant && occupant !== entity) return false;
    return true;
  }

  isWalkableIgnoringEnemies(x, y) {
    const tile = this.getTile(x, y);
    if (!TILE_PROPS[tile]?.walk) return false;
    return !this.npcs.some(npc => npc.x === x && npc.y === y);
  }

  getFrontTile(player) {
    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = dirs[player.dir] || dirs.down;
    const x = player.x + dx;
    const y = player.y + dy;
    return { x, y, tile: this.getTile(x, y) };
  }

  getNearbyNPC(player, range = 1) {
    let best = null;
    let bestDistance = Infinity;
    for (const npc of this.npcs) {
      const distance = distCheb(player, npc);
      if (distance <= range && distance < bestDistance) {
        best = npc;
        bestDistance = distance;
      }
    }
    return best;
  }

  getEnemyAt(x, y) {
    return this.enemies.find(enemy => !enemy.dead && enemy.x === x && enemy.y === y) || null;
  }

  getPortalAt(x, y) {
    return this.portals.find(portal => portal.x === x && portal.y === y) || null;
  }

  addItemDrop(id, qty, x, y) {
    const drop = { uid: uuid(), id, qty, x, y, age: 0 };
    this.itemDrops.push(drop);
    return drop;
  }

  pickupItemDrop(uid) {
    const index = this.itemDrops.findIndex(drop => drop.uid === uid);
    if (index < 0) return null;
    return this.itemDrops.splice(index, 1)[0];
  }

  scheduleTileRespawn(x, y, tile, seconds = 35) {
    this.resourceRespawns.push({ x, y, tile, time: seconds });
  }

  update(dt, game) {
    for (const enemy of this.enemies) enemy.update(dt, this, game.player, game);
    this.enemies = this.enemies.filter(enemy => !enemy.dead);
    this.updateEnemyRespawn(dt, game);
    for (const drop of this.itemDrops) drop.age += dt;
    for (const resource of this.resourceRespawns) {
      resource.time -= dt;
      if (resource.time > 0) continue;
      const blocked = this.getEnemyAt(resource.x, resource.y)
        || (game.player.x === resource.x && game.player.y === resource.y);
      if (blocked) {
        resource.time = 1.2;
        continue;
      }
      this.setTile(resource.x, resource.y, resource.tile);
      resource.done = true;
    }
    this.resourceRespawns = this.resourceRespawns.filter(resource => !resource.done);
    this.respawnQueues.set(this.currentMapId, this.resourceRespawns);
  }
}
