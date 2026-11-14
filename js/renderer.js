import { TS, drawEnemy, drawItemDrop, drawNPC, drawPlayer, drawSlash, drawTile } from './sprites.js';
import { clamp } from './utils.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tileSize = 48;
    this.scale = 3;
    this.viewTilesX = 20;
    this.viewTilesY = 14;
    this.cameraX = 0;
    this.cameraY = 0;
    this.ctx.imageSmoothingEnabled = false;
  }

  setViewport(width, height, tileSize) {
    const w = Math.max(256, Math.round(width));
    const h = Math.max(224, Math.round(height));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.tileSize = tileSize;
    this.scale = tileSize / TS;
    this.viewTilesX = w / tileSize;
    this.viewTilesY = h / tileSize;
    this.ctx.imageSmoothingEnabled = false;
  }

  updateCamera(game) {
    const maxX = Math.max(0, game.world.width - this.viewTilesX);
    const maxY = Math.max(0, game.world.height - this.viewTilesY);
    this.cameraX = game.world.width < this.viewTilesX
      ? (game.world.width - this.viewTilesX) / 2
      : clamp(game.player.px + 0.5 - this.viewTilesX / 2, 0, maxX);
    this.cameraY = game.world.height < this.viewTilesY
      ? (game.world.height - this.viewTilesY) / 2
      : clamp(game.player.py + 0.5 - this.viewTilesY / 2, 0, maxY);
  }

  screenX(tileX) {
    return Math.round((tileX - this.cameraX) * this.tileSize);
  }

  screenY(tileY) {
    return Math.round((tileY - this.cameraY) * this.tileSize);
  }

  render(game) {
    const { ctx, canvas, tileSize } = this;
    this.updateCamera(game);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#101720';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startX = Math.max(0, Math.floor(this.cameraX) - 1);
    const endX = Math.min(game.world.width - 1, Math.ceil(this.cameraX + this.viewTilesX) + 1);
    const startY = Math.max(0, Math.floor(this.cameraY) - 1);
    const endY = Math.min(game.world.height - 1, Math.ceil(this.cameraY + this.viewTilesY) + 1);
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        drawTile(ctx, game.world.getTile(x, y), this.screenX(x), this.screenY(y), tileSize, x, y, game.time);
      }
    }

    for (const drop of game.world.itemDrops) {
      drawItemDrop(ctx, drop, this.screenX(drop.x), this.screenY(drop.y), tileSize, game.time);
    }

    const entities = [
      ...game.world.npcs.map(entity => ({ kind: 'npc', entity, y: entity.y })),
      ...game.world.enemies.filter(enemy => !enemy.dead).map(entity => ({ kind: 'enemy', entity, y: entity.py })),
      { kind: 'player', entity: game.player, y: game.player.py },
    ].sort((a, b) => a.y - b.y);

    for (const item of entities) {
      const entity = item.entity;
      const ex = item.kind === 'npc' ? entity.x : entity.px;
      const ey = item.kind === 'npc' ? entity.y : entity.py;
      const x = this.screenX(ex);
      const y = this.screenY(ey);
      if (item.kind === 'npc') {
        drawNPC(ctx, entity, x, y, tileSize);
        if (Math.hypot(entity.x - game.player.px, entity.y - game.player.py) < 4) {
          ctx.font = `${Math.max(10, Math.round(tileSize * 0.24))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(0,0,0,.65)';
          ctx.fillRect(x + tileSize / 2 - ctx.measureText(entity.name).width / 2 - 4, y - tileSize * 0.43, ctx.measureText(entity.name).width + 8, tileSize * 0.32);
          ctx.fillStyle = '#fff3c4';
          ctx.fillText(entity.name, x + tileSize / 2, y - tileSize * 0.19);
        }
      } else if (item.kind === 'enemy') {
        drawEnemy(ctx, entity, x, y, tileSize);
        if (entity.hp < entity.maxHp || entity.boss) {
          const width = tileSize * (entity.boss ? 1.25 : 0.85);
          const barX = x + (tileSize - width) / 2;
          const barY = y - tileSize * 0.16;
          ctx.fillStyle = 'rgba(0,0,0,.75)';
          ctx.fillRect(barX - 1, barY - 1, width + 2, 6);
          ctx.fillStyle = entity.boss ? '#d74a52' : '#e76666';
          ctx.fillRect(barX, barY, width * entity.hp / entity.maxHp, 4);
        }
      } else {
        drawPlayer(ctx, entity, x, y, tileSize);
      }
    }

    for (const effect of game.effects) {
      const progress = 1 - effect.life / effect.duration;
      const x = this.screenX(effect.x);
      const y = this.screenY(effect.y);
      if (effect.type === 'slash') {
        drawSlash(ctx, x, y, tileSize, effect.color, progress);
      } else if (effect.type === 'burst') {
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = effect.color || '#ff9a55';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize * (0.2 + progress * 0.65), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (effect.type === 'text') {
        ctx.save();
        ctx.globalAlpha = Math.min(1, effect.life * 3);
        ctx.font = `bold ${Math.max(13, Math.round(tileSize * 0.34))}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,.7)';
        ctx.fillText(effect.text, x + tileSize / 2 + 2, y - progress * tileSize + 2);
        ctx.fillStyle = effect.color || '#fff';
        ctx.fillText(effect.text, x + tileSize / 2, y - progress * tileSize);
        ctx.restore();
      }
    }

    const label = `${game.world.map.name}${game.world.map.safe ? ' · 安全区' : ''}`;
    ctx.font = 'bold 13px monospace';
    const labelWidth = ctx.measureText(label).width + 22;
    ctx.fillStyle = 'rgba(9,14,23,.78)';
    ctx.fillRect(12, 12, labelWidth, 31);
    ctx.strokeStyle = 'rgba(230,196,108,.45)';
    ctx.strokeRect(12.5, 12.5, labelWidth - 1, 30);
    ctx.fillStyle = '#f5dfa2';
    ctx.textAlign = 'left';
    ctx.fillText(label, 23, 32);
  }
}
