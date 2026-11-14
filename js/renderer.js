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

  tileAtClient(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const sx = (clientX - rect.left) * (this.canvas.width / rect.width);
    const sy = (clientY - rect.top) * (this.canvas.height / rect.height);
    return {
      x: Math.floor(sx / this.tileSize + this.cameraX),
      y: Math.floor(sy / this.tileSize + this.cameraY),
    };
  }

  drawHover(game) {
    const hover = game.hoverTile;
    if (!hover) return;
    const { ctx, tileSize } = this;
    const x = this.screenX(hover.x);
    const y = this.screenY(hover.y);
    const color = hover.kind === 'enemy' ? '#e0556b' : '#f6dea0';
    const pad = Math.max(2, tileSize * 0.07);
    const len = Math.max(6, tileSize * 0.26);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, tileSize * 0.055);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(x + pad, y + pad + len); ctx.lineTo(x + pad, y + pad); ctx.lineTo(x + pad + len, y + pad);
    ctx.moveTo(x + tileSize - pad - len, y + pad); ctx.lineTo(x + tileSize - pad, y + pad); ctx.lineTo(x + tileSize - pad, y + pad + len);
    ctx.moveTo(x + pad, y + tileSize - pad - len); ctx.lineTo(x + pad, y + tileSize - pad); ctx.lineTo(x + pad + len, y + tileSize - pad);
    ctx.moveTo(x + tileSize - pad - len, y + tileSize - pad); ctx.lineTo(x + tileSize - pad, y + tileSize - pad); ctx.lineTo(x + tileSize - pad, y + tileSize - pad - len);
    ctx.stroke();
    ctx.restore();
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

    const startX = Math.floor(this.cameraX) - 1;
    const endX = Math.ceil(this.cameraX + this.viewTilesX) + 1;
    const startY = Math.floor(this.cameraY) - 1;
    const endY = Math.ceil(this.cameraY + this.viewTilesY) + 1;
    for (let y = startY; y <= endY; y++) {
      const ty = clamp(y, 0, game.world.height - 1);
      for (let x = startX; x <= endX; x++) {
        const tx = clamp(x, 0, game.world.width - 1);
        drawTile(ctx, game.world.getTile(tx, ty), this.screenX(x), this.screenY(y), tileSize, tx, ty, game.time);
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

    this.drawHover(game);

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

    if (game.clickMarker) {
      const x = this.screenX(game.clickMarker.x);
      const y = this.screenY(game.clickMarker.y);
      const pulse = 0.55 + Math.sin(game.time * 7) * 0.25;
      ctx.save();
      ctx.strokeStyle = `rgba(246,222,160,${pulse})`;
      ctx.lineWidth = Math.max(2, tileSize * 0.055);
      ctx.beginPath();
      ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(246,222,160,${pulse * 0.6})`;
      ctx.beginPath();
      ctx.arc(x + tileSize / 2, y + tileSize / 2, Math.max(2, tileSize * 0.07), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    this.drawOffscreenMarkers(game);

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

    const touch = document.body.classList.contains('touch-mode');
    if (touch) return;
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

    if (game.auto && game.autoStatus) {
      const status = `自动 · ${game.autoStatus}`;
      ctx.font = 'bold 12px monospace';
      const statusWidth = ctx.measureText(status).width + 18;
      ctx.fillStyle = 'rgba(9,14,23,.78)';
      ctx.fillRect(12, 48, statusWidth, 25);
      ctx.strokeStyle = 'rgba(120,220,160,.5)';
      ctx.strokeRect(12.5, 48.5, statusWidth - 1, 24);
      ctx.fillStyle = '#a7edbc';
      ctx.fillText(status, 21, 65);
    }
  }

  drawOffscreenMarkers(game) {
    if (!game.started || game.player.dead || game.world.map.safe) return;
    const { ctx, canvas, tileSize } = this;
    const margin = 26;
    for (const enemy of game.world.enemies) {
      if (enemy.dead) continue;
      if (Math.hypot(enemy.px - game.player.px, enemy.py - game.player.py) > 8) continue;
      const sx = (enemy.px - this.cameraX) * tileSize + tileSize / 2;
      const sy = (enemy.py - this.cameraY) * tileSize + tileSize / 2;
      if (sx > margin && sx < canvas.width - margin && sy > margin && sy < canvas.height - margin) continue;
      const angle = Math.atan2(sy - canvas.height / 2, sx - canvas.width / 2);
      const x = clamp(sx, margin, canvas.width - margin);
      const y = clamp(sy, margin, canvas.height - margin);
      const alpha = clamp(0.42 + Math.sin(game.time * 6) * 0.16, 0.22, 0.68);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = enemy.boss ? '#ffb14a' : '#e86565';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-7, 6.5);
      ctx.lineTo(-7, -6.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
