import { TILE, TILE_PROPS } from './data.js';

export const TS = 16;

const rect = (ctx, color, x, y, w, h) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
};

export function drawTile(ctx, id, x, y, size, tileX = 0, tileY = 0, time = 0) {
  const u = size / TS;
  const prop = TILE_PROPS[id] || TILE_PROPS[TILE.GRASS];
  rect(ctx, prop.color, x, y, size + 1, size + 1);
  const seed = (tileX * 13 + tileY * 7) & 3;

  if ([TILE.GRASS, TILE.FLOWER].includes(id)) {
    rect(ctx, '#327137', x + (2 + seed * 3) * u, y + 4 * u, u, 2 * u);
    rect(ctx, '#4b9146', x + (11 - seed) * u, y + 11 * u, u, 2 * u);
    if (id === TILE.FLOWER) {
      rect(ctx, '#f6d65c', x + 7 * u, y + 6 * u, 2 * u, 2 * u);
      rect(ctx, seed % 2 ? '#ef7ca8' : '#e9ecff', x + 6 * u, y + 5 * u, 4 * u, u);
      rect(ctx, '#286634', x + 7 * u, y + 8 * u, u, 4 * u);
    }
  } else if (id === TILE.PATH || id === TILE.DIRT || id === TILE.SAND) {
    rect(ctx, id === TILE.SAND ? '#c7b471' : '#927c51', x + (3 + seed * 2) * u, y + 5 * u, 2 * u, u);
    rect(ctx, id === TILE.SAND ? '#f0dda0' : '#c5af79', x + (10 - seed) * u, y + 12 * u, 2 * u, u);
  } else if (id === TILE.WATER) {
    const wave = Math.floor(time * 2 + tileX + tileY) % 3;
    rect(ctx, '#65a8e0', x + (2 + wave * 3) * u, y + 4 * u, 5 * u, u);
    rect(ctx, '#285fa8', x + (9 - wave * 2) * u, y + 11 * u, 5 * u, u);
  } else if (id === TILE.LAVA) {
    const wave = Math.floor(time * 2 + tileX * 0.7 + tileY) % 3;
    rect(ctx, '#7a1f12', x + (2 + wave * 3) * u, y + 4 * u, 6 * u, 2 * u);
    rect(ctx, '#f07a2a', x + (8 - wave * 2) * u, y + 9 * u, 5 * u, 2 * u);
    rect(ctx, '#ffd35c', x + (4 + wave * 4) * u, y + 12 * u, 2 * u, u);
  } else if (id === TILE.TREE || id === TILE.BUSH) {
    if (id === TILE.TREE) rect(ctx, '#6d4827', x + 7 * u, y + 10 * u, 3 * u, 6 * u);
    const baseY = id === TILE.TREE ? 2 : 6;
    rect(ctx, '#183f25', x + 3 * u, y + (baseY + 3) * u, 11 * u, 7 * u);
    rect(ctx, '#286536', x + 5 * u, y + baseY * u, 7 * u, 8 * u);
    rect(ctx, '#3f8445', x + 6 * u, y + (baseY + 1) * u, 3 * u, 3 * u);
    rect(ctx, '#71a74d', x + 6 * u, y + (baseY + 1) * u, u, u);
  } else if (id === TILE.ROCK || id === TILE.STONE) {
    rect(ctx, '#51535b', x + 3 * u, y + 8 * u, 11 * u, 6 * u);
    rect(ctx, '#858991', x + 5 * u, y + 5 * u, 7 * u, 7 * u);
    rect(ctx, '#b0b2b5', x + 6 * u, y + 6 * u, 3 * u, 2 * u);
  } else if (id === TILE.WALL) {
    rect(ctx, '#454751', x, y, size, size);
    rect(ctx, '#6c6e78', x + u, y + u, 14 * u, 6 * u);
    rect(ctx, '#777983', x + u, y + 9 * u, 14 * u, 6 * u);
    rect(ctx, '#34353d', x + 7 * u, y + u, u, 6 * u);
    rect(ctx, '#34353d', x + 4 * u, y + 9 * u, u, 6 * u);
    rect(ctx, '#34353d', x + 12 * u, y + 9 * u, u, 6 * u);
  } else if (id === TILE.FLOOR) {
    rect(ctx, '#5a3a25', x, y, size, size);
    rect(ctx, '#7a5030', x, y + u, size, 6 * u);
    rect(ctx, '#6a4329', x, y + 9 * u, size, 6 * u);
    rect(ctx, '#3d2a20', x + 8 * u, y + u, u, 6 * u);
  } else if (id === TILE.DOOR) {
    rect(ctx, '#3b2419', x + 2 * u, y, 12 * u, size);
    rect(ctx, '#986035', x + 4 * u, y + u, 8 * u, 15 * u);
    rect(ctx, '#e4bd53', x + 10 * u, y + 8 * u, u, u);
  } else if ([TILE.ORE_COPPER, TILE.ORE_IRON, TILE.ORE_GOLD].includes(id)) {
    rect(ctx, '#454750', x + 2 * u, y + 6 * u, 12 * u, 8 * u);
    rect(ctx, '#747680', x + 4 * u, y + 4 * u, 8 * u, 8 * u);
    const ore = id === TILE.ORE_COPPER ? '#d68b54' : id === TILE.ORE_IRON ? '#d4d9e4' : '#ffdc4a';
    rect(ctx, ore, x + 5 * u, y + 6 * u, 3 * u, 3 * u);
    rect(ctx, ore, x + 10 * u, y + 9 * u, 2 * u, 3 * u);
  } else if (id === TILE.CHEST) {
    rect(ctx, '#3b2417', x + 2 * u, y + 5 * u, 12 * u, 9 * u);
    rect(ctx, '#a9662e', x + 3 * u, y + 4 * u, 10 * u, 5 * u);
    rect(ctx, '#c28a3d', x + 3 * u, y + 10 * u, 10 * u, 3 * u);
    rect(ctx, '#f1ce5a', x + 7 * u, y + 8 * u, 2 * u, 4 * u);
  } else if (id === TILE.PORTAL) {
    const pulse = Math.sin(time * 4) * u;
    rect(ctx, '#30275d', x + 2 * u, y + 2 * u, 12 * u, 12 * u);
    rect(ctx, '#7457c8', x + 4 * u - pulse / 2, y + 4 * u - pulse / 2, 8 * u + pulse, 8 * u + pulse);
    rect(ctx, '#c1a7ff', x + 7 * u, y + 5 * u, 2 * u, 6 * u);
  } else if (id === TILE.BRIDGE || id === TILE.WOOD_PILE) {
    rect(ctx, '#54371f', x, y + 3 * u, size, 12 * u);
    for (let i = 0; i < 4; i++) rect(ctx, '#9a6936', x, y + (3 + i * 3) * u, size, 2 * u);
  }
}

export function drawPlayer(ctx, player, x, y, size) {
  const u = size / TS;
  const bob = player.moving ? Math.floor(player.animFrame / 5) % 2 : 0;
  const flash = player.hurtFlash > 0;
  const skin = flash ? '#fff' : '#f2bd8f';
  const hair = flash ? '#fff' : '#493225';
  const shirt = flash ? '#fff' : '#3f78b5';
  rect(ctx, 'rgba(0,0,0,.25)', x + 3 * u, y + 14 * u, 10 * u, 2 * u);
  rect(ctx, '#293347', x + 4 * u, y + (12 + bob) * u, 3 * u, 3 * u);
  rect(ctx, '#293347', x + 9 * u, y + (12 - bob) * u, 3 * u, 3 * u);
  rect(ctx, shirt, x + 4 * u, y + 7 * u, 8 * u, 6 * u);
  rect(ctx, '#d9e3ef', x + 6 * u, y + 8 * u, 4 * u, 2 * u);
  rect(ctx, skin, x + 3 * u, y + 8 * u, u, 4 * u);
  rect(ctx, skin, x + 12 * u, y + 8 * u, u, 4 * u);
  rect(ctx, skin, x + 4 * u, y + 2 * u, 8 * u, 6 * u);
  rect(ctx, hair, x + 4 * u, y + u, 8 * u, 3 * u);
  rect(ctx, hair, x + 3 * u, y + 2 * u, 2 * u, 3 * u);
  if (player.dir === 'left') rect(ctx, '#25242c', x + 5 * u, y + 5 * u, u, u);
  else if (player.dir === 'right') rect(ctx, '#25242c', x + 10 * u, y + 5 * u, u, u);
  else if (player.dir === 'down') {
    rect(ctx, '#25242c', x + 6 * u, y + 5 * u, u, u);
    rect(ctx, '#25242c', x + 10 * u, y + 5 * u, u, u);
  }
  if (player.shieldTime > 0) {
    ctx.strokeStyle = 'rgba(100,190,255,.8)';
    ctx.lineWidth = Math.max(1, u);
    ctx.strokeRect(x + u, y, 14 * u, 15 * u);
  }
}

export function drawEnemy(ctx, enemy, x, y, size) {
  const u = size / TS;
  const c = enemy.hitFlash > 0 ? '#fff' : enemy.defData.color;
  const bob = Math.floor(enemy.animFrame) % 2;
  rect(ctx, 'rgba(0,0,0,.28)', x + 2 * u, y + 14 * u, 12 * u, 2 * u);
  if (enemy.type === 'slime') {
    rect(ctx, c, x + 3 * u, y + (7 + bob) * u, 10 * u, 7 * u);
    rect(ctx, c, x + 5 * u, y + (5 + bob) * u, 6 * u, 3 * u);
    rect(ctx, '#173c2a', x + 5 * u, y + 9 * u, 2 * u, 2 * u);
    rect(ctx, '#173c2a', x + 10 * u, y + 9 * u, 2 * u, 2 * u);
  } else if (enemy.type === 'bat') {
    rect(ctx, c, x + 1 * u, y + (6 + bob) * u, 6 * u, 5 * u);
    rect(ctx, c, x + 9 * u, y + (6 + bob) * u, 6 * u, 5 * u);
    rect(ctx, '#3b294d', x + 6 * u, y + 5 * u, 4 * u, 8 * u);
    rect(ctx, '#ff6b6b', x + 7 * u, y + 7 * u, u, u);
  } else {
    const big = enemy.boss ? 1 : 0;
    rect(ctx, c, x + (3 - big) * u, y + (6 - big) * u, (10 + big * 2) * u, (8 + big) * u);
    rect(ctx, c, x + 4 * u, y + (2 - big) * u, 8 * u, 7 * u);
    rect(ctx, enemy.boss ? '#ffd45c' : '#f4e6ca', x + 5 * u, y + 5 * u, 2 * u, 2 * u);
    rect(ctx, enemy.boss ? '#ffd45c' : '#f4e6ca', x + 10 * u, y + 5 * u, 2 * u, 2 * u);
    rect(ctx, '#2b2025', x + 6 * u, y + 5 * u, u, u);
    rect(ctx, '#2b2025', x + 10 * u, y + 5 * u, u, u);
    if (enemy.boss) {
      rect(ctx, '#772b29', x + u, y + 2 * u, 3 * u, 9 * u);
      rect(ctx, '#772b29', x + 12 * u, y + 2 * u, 3 * u, 9 * u);
    }
  }
  if (enemy.elite) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,206,90,.8)';
    ctx.lineWidth = Math.max(1, u);
    ctx.strokeRect(x + 2 * u, y + u, 12 * u, 14 * u);
    ctx.restore();
  }
}

export function drawNPC(ctx, npc, x, y, size) {
  const u = size / TS;
  const colors = { merchant: '#b06bc0', blacksmith: '#9b623b', elder: '#ddd5bd', hunter: '#4e8a50', miner: '#b08b45', fisher: '#4c91b8', sage: '#7650a8' };
  rect(ctx, 'rgba(0,0,0,.24)', x + 3 * u, y + 14 * u, 10 * u, 2 * u);
  rect(ctx, colors[npc.id] || '#8877aa', x + 4 * u, y + 7 * u, 8 * u, 7 * u);
  rect(ctx, '#e9b88c', x + 4 * u, y + 2 * u, 8 * u, 6 * u);
  rect(ctx, '#ddd5c7', x + 4 * u, y + u, 8 * u, 2 * u);
  rect(ctx, '#25242c', x + 6 * u, y + 5 * u, u, u);
  rect(ctx, '#25242c', x + 10 * u, y + 5 * u, u, u);
  if (npc.quest) {
    ctx.font = `bold ${Math.max(10, 7 * u)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdc55';
    ctx.fillText('!', x + 8 * u, y - 2 * u);
  }
}

export function drawItemDrop(ctx, drop, x, y, size, time = 0) {
  const u = size / TS;
  const bob = Math.sin(time * 4 + drop.x) * u;
  rect(ctx, 'rgba(0,0,0,.2)', x + 5 * u, y + 13 * u, 6 * u, 2 * u);
  rect(ctx, '#f4d35e', x + 5 * u, y + 5 * u + bob, 6 * u, 6 * u);
  rect(ctx, '#fff2a8', x + 6 * u, y + 6 * u + bob, 2 * u, 2 * u);
}

export function drawSlash(ctx, x, y, size, color = '#fff2b0', progress = 0) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = Math.max(0, 1 - progress);
  ctx.lineWidth = Math.max(2, size / 10);
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.55, -Math.PI * 0.8 + progress, Math.PI * 0.25 + progress);
  ctx.stroke();
  ctx.restore();
}
