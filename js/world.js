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
    this.loadMap('town');
  }

  loadMap(id) {
    const map = MAPS[id] || MAPS.town;
    this.currentMapId = MAPS[id] ? id : 'town';
    this.map = map;
    this.tiles = map.rows;
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
    this.resourceRespawns = [];
    this.spawnEnemies();
  }

  spawnEnemies() {
    const types = this.map.enemies || [];
    if (!types.length || this.map.safe) return;
    const normalTypes = types.filter(type => type !== 'dragon');
    const targetCount = this.currentMapId === 'dungeon' ? 9 : 13;
    let attempts = 0;
    while (this.enemies.length < targetCount && attempts++ < 500) {
      const x = rand(1, this.width - 2);
      const y = rand(1, this.height - 2);
      if (!this.isWalkable(x, y) || this.getEnemyAt(x, y) || this.getPortalAt(x, y)) continue;
      if (distCheb({ x, y }, { x: this.spawnX, y: this.spawnY }) < 5) continue;
      if (this.npcs.some(npc => npc.x === x && npc.y === y)) continue;
      this.enemies.push(new Enemy(choice(normalTypes), x, y));
    }
    if (this.map.boss && this.isWalkable(this.map.boss.x, this.map.boss.y)) {
      this.enemies.push(new Enemy(this.map.boss.id, this.map.boss.x, this.map.boss.y));
    }
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
    for (const drop of this.itemDrops) drop.age += dt;
    for (const resource of this.resourceRespawns) {
      resource.time -= dt;
      if (resource.time <= 0 && !this.getEnemyAt(resource.x, resource.y)) this.setTile(resource.x, resource.y, resource.tile);
    }
    this.resourceRespawns = this.resourceRespawns.filter(resource => resource.time > 0);
  }
}
