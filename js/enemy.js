import { ENEMIES } from './data.js';
import { choice, distCheb, rand, randf, uuid } from './utils.js';

export class Enemy {
  constructor(type, x, y) {
    this.id = uuid();
    this.type = type;
    this.defData = ENEMIES[type];
    this.name = this.defData.name;
    this.isEnemy = true;
    this.boss = !!this.defData.boss;
    this.level = this.defData.lvl;
    this.maxHp = this.defData.hp;
    this.hp = this.maxHp;
    this.atk = this.defData.atk;
    this.def = this.defData.def;
    this.xp = this.defData.xp;
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.homeX = x;
    this.homeY = y;
    this.targetX = x;
    this.targetY = y;
    this.dir = 'down';
    this.state = 'idle';
    this.moving = false;
    this.moveSpeed = this.boss ? 1.65 : type === 'wolf' ? 2.7 : 2.05;
    this.attackCooldown = randf(0, 0.6);
    this.windup = 0;
    this.wanderCooldown = randf(0.5, 2.5);
    this.hitFlash = 0;
    this.animFrame = 0;
    this.dead = false;
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
    this.moving = true;
  }

  tryMove(dx, dy, world, player) {
    if (this.moving) return false;
    const nx = this.x + dx;
    const ny = this.y + dy;
    if ((nx === player.x && ny === player.y) || !world.isWalkable(nx, ny, this)) return false;
    if (Math.abs(dx) > 0) this.dir = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) this.dir = dy > 0 ? 'down' : 'up';
    this.setTarget(nx, ny);
    return true;
  }

  update(dt, world, player, game) {
    if (this.dead) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.wanderCooldown -= dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (this.moving) {
      const dx = this.targetX - this.px;
      const dy = this.targetY - this.py;
      const remain = Math.hypot(dx, dy);
      const step = this.moveSpeed * dt;
      if (remain <= step) {
        this.px = this.targetX;
        this.py = this.targetY;
        this.x = this.targetX;
        this.y = this.targetY;
        this.moving = false;
      } else {
        this.px += dx / remain * step;
        this.py += dy / remain * step;
        this.animFrame += dt * 8;
      }
      return;
    }

    const distance = distCheb(this, player);
    const aggro = this.boss ? 20 : 6;
    if (!player.dead && distance <= aggro) {
      this.state = distance <= 1 ? 'attack' : 'chase';
      if (distance <= 1) {
        this.dir = Math.abs(player.x - this.x) > Math.abs(player.y - this.y)
          ? (player.x > this.x ? 'right' : 'left')
          : (player.y > this.y ? 'down' : 'up');
        if (this.windup > 0) {
          this.windup -= dt;
          if (this.windup <= 0) {
            this.windup = 0;
            if (distCheb(this, player) <= 1 && !player.dead) game.damagePlayer(this.atk, this);
            this.attackCooldown = this.boss ? 1.35 : 1.15;
          }
          return;
        }
        if (this.attackCooldown <= 0) this.windup = this.boss ? 0.42 : 0.3;
        return;
      }
      this.windup = 0;

      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const horizontalFirst = Math.abs(dx) >= Math.abs(dy);
      const moves = horizontalFirst
        ? [[Math.sign(dx), 0], [0, Math.sign(dy)]]
        : [[0, Math.sign(dy)], [Math.sign(dx), 0]];
      for (const [mx, my] of moves) {
        if ((mx || my) && this.tryMove(mx, my, world, player)) break;
      }
      return;
    }

    this.state = 'idle';
    this.windup = 0;
    if (this.wanderCooldown <= 0) {
      this.wanderCooldown = randf(1.4, 3.8);
      if (!this.boss && Math.random() < 0.65) {
        const [dx, dy] = choice([[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]);
        if (distCheb({ x: this.x + dx, y: this.y + dy }, { x: this.homeX, y: this.homeY }) <= 4) {
          this.tryMove(dx, dy, world, player);
        }
      }
    }
  }

  takeDamage(amount) {
    if (this.dead) return 0;
    const actual = Math.max(1, Math.round(amount));
    this.hp = Math.max(0, this.hp - actual);
    this.hitFlash = 0.16;
    if (this.hp <= 0) this.dead = true;
    return actual;
  }

  dropLoot() {
    const items = [];
    for (const drop of this.defData.drops) {
      if (Math.random() <= drop.chance) items.push({ id: drop.id, qty: drop.qty || 1 });
    }
    return { gold: rand(this.defData.gold[0], this.defData.gold[1]), items };
  }
}
