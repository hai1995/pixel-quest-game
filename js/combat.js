import { randf } from './utils.js';

function physicalDamage(player, enemy, multiplier = 1) {
  const crit = Math.random() < 0.15;
  const base = player.atk * multiplier * randf(0.88, 1.12);
  return { damage: Math.max(1, Math.round(base - enemy.def * 0.55)), crit };
}

export function playerAttack(game, target) {
  const enemy = target || game.findAdjacentEnemy();
  if (!enemy) return false;
  const { damage, crit } = physicalDamage(game.player, enemy);
  game.faceTarget(enemy);
  game.hitEnemy(enemy, damage, crit ? '暴击' : '攻击');
  game.player.gainSkillXp('attack', 3);
  return true;
}

export function powerStrike(game, target) {
  const enemy = target || game.findAdjacentEnemy();
  if (!enemy) return false;
  const { damage } = physicalDamage(game.player, enemy, 1.8);
  game.faceTarget(enemy);
  game.hitEnemy(enemy, damage, '强力一击', '#ffb45e');
  game.player.gainSkillXp('attack', 6);
  return true;
}

export function fireball(game, target) {
  const enemy = target || game.findNearestEnemy(7);
  if (!enemy) return false;
  const damage = Math.max(1, Math.round((game.player.atk * 1.5 + game.player.level * 3) * randf(0.9, 1.1) - enemy.def * 0.2));
  game.faceTarget(enemy);
  game.hitEnemy(enemy, damage, '火球术', '#ff813d');
  game.addEffect({ type: 'burst', x: enemy.px, y: enemy.py, color: '#ff813d', duration: 0.45 });
  return true;
}

export function whirlwind(game) {
  const enemies = game.world.enemies.filter(enemy => !enemy.dead && Math.hypot(enemy.px - game.player.px, enemy.py - game.player.py) <= 1.75);
  if (!enemies.length) return false;
  for (const enemy of enemies) {
    const { damage } = physicalDamage(game.player, enemy, 1.15);
    game.hitEnemy(enemy, damage, '旋风斩', '#ffe276');
  }
  game.addEffect({ type: 'slash', x: game.player.px, y: game.player.py, color: '#ffe276', duration: 0.45 });
  game.player.gainSkillXp('attack', 5);
  return true;
}
