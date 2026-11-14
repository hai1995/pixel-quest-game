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
    this.cameraSnap = true;
    this.shakeTime = 0;
    this.shakePower = 0;
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

  shake(power = 4, duration = 0.16) {
    this.shakePower = Math.max(this.shakePower, power);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  snapCamera() {
    this.cameraSnap = true;
  }

  updateCamera(game, dt) {
    const maxX = Math.max(0, game.world.width - this.viewTilesX);
    const maxY = Math.max(0, game.world.height - this.viewTilesY);
    const targetX = game.world.width < this.viewTilesX
      ? (game.world.width - this.viewTilesX) / 2
      : clamp(game.player.px + 0.5 - this.viewTilesX / 2, 0, maxX);
    const targetY = game.world.height < this.viewTilesY
      ? (game.world.height - this.viewTilesY) / 2
      : clamp(game.player.py + 0.5 - this.viewTilesY / 2, 0, maxY);

    if (this.cameraSnap) {
      this.cameraX = targetX;
      this.cameraY = targetY;
      this.cameraSnap = false;
      return;
    }
    const k = Math.min(1, dt * 11);
    this.cameraX += (targetX - this.cameraX) * k;
    this.cameraY += (targetY - this.cameraY) * k;
    if (Math.abs(targetX - this.cameraX) < 0.004) this.cameraX = targetX;
    if (Math.abs(targetY - this.cameraY) < 0.004) this.cameraY = targetY;
  }

  screenX(tileX) {
    return Math.round((tileX - this.cameraX) * this.tileSize);
  }

  screenY(tileY) {
    return Math.round((tileY - this.cameraY) * this.tileSize);
  }

  render(game) {
    const { ctx, canvas, tileSize } = this;
    const dt = game.dt || 0;
    this.updateCamera(game, dt);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#101720';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const falloff = Math.min(1, this.shakeTime / 0.16);
      shakeX = (Math.random() * 2 - 1) * this.shakePower * falloff;
      shakeY = (Math.random() * 2 - 1) * this.shakePower * falloff;
      if (this.shakeTime === 0) this.shakePower = 0;
    }

    ctx.save();
    ctx.translate(Math.round(shakeX), Math.round(shakeY));

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
      const isNpc = item.kind === 'npc';
      const ex = isNpc ? entity.x : entity.px;
      const ey = isNpc ? entity.y : entity.py;
      const x = this.screenX(ex);
      const y = this.screenY(ey);

      if (isNpc) {
        drawNPC(ctx, entity, x, y, tileSize);
        if (Math.hypot(entity.x - game.player.px, entity.y - game.player.py) < 4) {
          ctx.font = `${Math.max(10, Math.round(tileSize * 0.24))}px sans-serif`;
          ctx.textAlign = 'center';
          if (!entity._labelWidth) entity._labelWidth = ctx.measureText(entity.name).width;
          ctx.fillStyle = 'rgba(0,0,0,.65)';
          ctx.fillRect(x + tileSize / 2 - entity._labelWidth / 2 - 4, y - tileSize * 0.43, entity._labelWidth + 8, tileSize * 0.32);
          ctx.fillStyle = '#fff3c4';
          ctx.fillText(entity.name, x + tileSize / 2, y - tileSize * 0.19);
        }
      } else if (item.kind === 'enemy') {
        drawEnemy(ctx, entity, x, y, tileSize);
        if (entity.windup > 0) {
          const pulse = 0.5 + Math.sin(game.time * 30) * 0.3;
          ctx.save();
          ctx.strokeStyle = `rgba(255,110,90,${pulse})`;
          ctx.lineWidth = Math.max(2, tileSize * 0.07);
          ctx.beginPath();
          ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize * 0.52, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(255,200,120,${pulse})`;
          ctx.font = `bold ${Math.round(tileSize * 0.5)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('!', x + tileSize / 2, y - tileSize * 0.06);
          ctx.restore();
        }
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
        const lunge = (entity.attackAnim || 0) * tileSize * 0.18;
        const lx = entity.dir === 'left' ? -lunge : entity.dir === 'right' ? lunge : 0;
        const ly = entity.dir === 'up' ? -lunge : entity.dir === 'down' ? lunge : 0;
        drawPlayer(ctx, entity, x + lx, y + ly, tileSize);
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

    ctx.restore();

    const hpRatio = game.player.hp / game.player.maxHp;
    if (hpRatio < 0.35 && !game.player.dead && game.started) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const pulse = 0.2 + Math.sin(game.time * 5) * 0.07 + (0.35 - hpRatio);
      const gradient = ctx.createRadialGradient(cx, cy, Math.min(canvas.width, canvas.height) * 0.3, cx, cy, Math.max(canvas.width, canvas.height) * 0.72);
      gradient.addColorStop(0, 'rgba(150,15,25,0)');
      gradient.addColorStop(1, `rgba(150,15,25,${clamp(pulse, 0, 0.6)})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (game.fade > 0) {
      ctx.fillStyle = `rgba(6,9,14,${clamp(game.fade * 2.6, 0, 0.92)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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
