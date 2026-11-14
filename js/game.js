import { ACTIVE_SKILLS, ITEMS, MAPS, QUESTS, RECIPES, TILE, TILE_PROPS } from './data.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { World } from './world.js';
import { Renderer } from './renderer.js';
import { QuestSystem } from './quests.js';
import { UI } from './ui.js';
import { fireball, playerAttack, powerStrike, whirlwind } from './combat.js';
import { distCheb } from './utils.js';

const SAVE_KEY = 'pixel-quest-save';
const SKILL_KEYS = { '1': 'heal', '2': 'power_strike', '3': 'fireball', '4': 'whirlwind', '5': 'shield' };
const SKILL_COOLDOWNS = { heal: 6, power_strike: 2.5, fireball: 3, whirlwind: 5, shield: 10 };

export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.player = new Player();
    this.world = new World();
    this.quests = new QuestSystem(this.player);
    this.effects = [];
    this.started = false;
    this.time = 0;
    this.lastTime = 0;
    this.saveTimer = 0;
    this.hudTimer = 0;
    this.attackCooldown = 0;
    this.gatherCooldown = 0;
    this.deathTimer = 0;
    this.dialogue = null;
    this.syncPlayerToSpawn();
    this.ui = new UI(this);
  }

  start() {
    const loop = timestamp => {
      const dt = this.lastTime ? Math.min(0.05, (timestamp - this.lastTime) / 1000) : 0;
      this.lastTime = timestamp;
      this.time += dt;
      if (this.started) this.update(dt);
      this.renderer.render(this);
      this.input.endFrame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  newGame() {
    this.player = new Player();
    this.quests = new QuestSystem(this.player);
    this.world.loadMap('town');
    this.syncPlayerToSpawn();
    this.effects = [];
    this.dialogue = null;
    this.started = true;
    this.saveTimer = 0;
    this.attackCooldown = 0;
    this.gatherCooldown = 0;
    this.input.reset();
    this.ui.closeMenu();
    this.ui.hideDialogue();
    this.ui.combatLog.innerHTML = '';
    document.getElementById('start-screen').classList.add('hidden');
    this.ui.log('欢迎来到黎明村，勇者！', 'good');
    this.ui.toast('冒险开始！使用方向键或摇杆移动', 'good');
    this.save();
  }

  continueGame() {
    try {
      const save = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!save?.player) {
        this.ui.toast('没有找到存档', 'bad');
        return false;
      }
      this.player = new Player();
      this.player.loadSave(save.player);
      this.quests = new QuestSystem(this.player);
      this.quests.loadSave(save.quests);
      this.world.loadMap(this.player.mapId);
      if (!this.world.isWalkable(this.player.x, this.player.y, this.player)) this.syncPlayerToSpawn();
      else this.player.setTile(this.player.x, this.player.y);
      this.player.mapId = this.world.currentMapId;
      this.effects = [];
      this.dialogue = null;
      this.started = true;
      this.saveTimer = 0;
      this.input.reset();
      this.ui.closeMenu();
      this.ui.hideDialogue();
      document.getElementById('start-screen').classList.add('hidden');
      this.ui.toast('存档已读取，欢迎回来！', 'good');
      this.ui.log(`回到${this.world.map.name}`, 'good');
      return true;
    } catch (error) {
      console.error('Failed to load save:', error);
      this.ui.toast('存档损坏，请开始新游戏', 'bad');
      return false;
    }
  }

  save() {
    if (!this.started || this.player.dead) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, player: this.player.toSave(), quests: this.quests.toSave(), savedAt: Date.now() }));
    } catch (error) {
      console.warn('Unable to save game:', error);
    }
  }

  syncPlayerToSpawn() {
    this.player.setTile(this.world.spawnX, this.world.spawnY);
    this.player.mapId = this.world.currentMapId;
  }

  update(dt) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.gatherCooldown = Math.max(0, this.gatherCooldown - dt);
    this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt);
    this.player.invulnTime = Math.max(0, this.player.invulnTime - dt);
    this.player.shieldTime = Math.max(0, this.player.shieldTime - dt);
    Object.keys(this.player.skillCooldowns).forEach(id => {
      this.player.skillCooldowns[id] = Math.max(0, this.player.skillCooldowns[id] - dt);
    });
    this.updateEffects(dt);
    this.handleInput();

    if (this.player.dead) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.respawn();
      this.updateHud(dt);
      return;
    }

    if (!this.ui.currentMenu && !this.dialogue) {
      this.updateMovement(dt);
      this.world.update(dt, this);
      this.pickupDrops();
      this.player.restoreMp(dt * 0.7);
      if (this.world.map.safe) this.player.heal(dt * 1.2);
    }

    this.saveTimer += dt;
    if (this.saveTimer >= 5) {
      this.saveTimer = 0;
      this.save();
    }
    this.updateHud(dt);
  }

  updateHud(dt) {
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.ui.update();
    }
  }

  handleInput() {
    const pressed = this.input.pressed;
    if (pressed.has('escape')) {
      if (this.ui.currentMenu) this.ui.closeMenu();
      else if (this.dialogue) this.closeDialogue();
      return;
    }

    const menuKeys = { i: 'inventory', b: 'inventory', k: 'skills', c: 'character', q: 'quests', m: 'map' };
    for (const [key, menu] of Object.entries(menuKeys)) {
      if (pressed.has(key)) this.toggleMenu(menu);
    }
    if (this.ui.currentMenu || this.player.dead) return;

    if (this.dialogue) {
      if (pressed.has('space') || pressed.has('e')) this.advanceDialogue();
      return;
    }
    if (pressed.has('space')) this.tryAttack();
    if (pressed.has('e')) this.interact();
    if (pressed.has('f')) this.gather();
    Object.entries(SKILL_KEYS).forEach(([key, skill]) => {
      if (pressed.has(key)) this.useActiveSkill(skill);
    });
  }

  updateMovement(dt) {
    let dx = this.input.dirX;
    let dy = this.input.dirY;
    if (dx !== 0 && dy !== 0 && Math.abs(this.input.vjoy.y) > Math.abs(this.input.vjoy.x)) dx = 0;
    else if (dx !== 0 && dy !== 0) dy = 0;

    if (this.player.moving) {
      const p = this.player;
      const step = p.moveSpeed * dt;
      const remain = Math.hypot(p.targetPx - p.px, p.targetPy - p.py);
      if (remain <= step) {
        p.px = p.targetPx;
        p.py = p.targetPy;
        p.x = p.targetX;
        p.y = p.targetY;
        p.moving = false;
        this.checkPortal();
      } else {
        p.px += ((p.targetPx - p.px) / remain) * step;
        p.py += ((p.targetPy - p.py) / remain) * step;
        p.animFrame++;
      }
    }

    if (!this.player.moving && (dx !== 0 || dy !== 0)) {
      let nx = this.player.x;
      let ny = this.player.y;
      if (dx !== 0) {
        nx += dx;
        this.player.dir = dx > 0 ? 'right' : 'left';
      } else {
        ny += dy;
        this.player.dir = dy > 0 ? 'down' : 'up';
      }
      if (this.world.isWalkable(nx, ny, this.player)) {
        this.player.targetX = nx;
        this.player.targetY = ny;
        this.player.targetPx = nx;
        this.player.targetPy = ny;
        this.player.moving = true;
        this.player.animFrame++;
      }
    }
  }

  checkPortal() {
    const portal = this.world.getPortalAt(this.player.x, this.player.y);
    if (!portal || !MAPS[portal.to]) return;
    this.world.loadMap(portal.to);
    this.player.setTile(portal.toX, portal.toY);
    this.player.mapId = this.world.currentMapId;
    this.effects = [];
    this.ui.toast(`来到 ${this.world.map.name}`);
    this.ui.log(`进入${this.world.map.name}`);
    this.save();
  }

  findAdjacentEnemy() {
    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = dirs[this.player.dir] || dirs.down;
    const facing = this.world.getEnemyAt(this.player.x + dx, this.player.y + dy);
    if (facing) return facing;
    return this.world.enemies
      .filter(enemy => !enemy.dead && distCheb(this.player, enemy) <= 1 && Math.hypot(enemy.px - this.player.px, enemy.py - this.player.py) <= 1.6)
      .sort((a, b) => Math.hypot(a.px - this.player.px, a.py - this.player.py) - Math.hypot(b.px - this.player.px, b.py - this.player.py))[0] || null;
  }

  findNearestEnemy(range = 7) {
    return this.world.enemies
      .filter(enemy => !enemy.dead && Math.hypot(enemy.px - this.player.px, enemy.py - this.player.py) <= range)
      .sort((a, b) => Math.hypot(a.px - this.player.px, a.py - this.player.py) - Math.hypot(b.px - this.player.px, b.py - this.player.py))[0] || null;
  }

  faceTarget(target) {
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    this.player.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  tryAttack() {
    if (this.attackCooldown > 0) return;
    this.attackCooldown = 0.32;
    const target = this.findAdjacentEnemy();
    const effectPos = target || { px: this.player.px, py: this.player.py };
    this.addEffect({ type: 'slash', x: effectPos.px, y: effectPos.py, color: '#fff0ad', duration: 0.24 });
    if (!playerAttack(this, target)) this.ui.toast('附近没有可攻击的敌人');
  }

  useActiveSkill(id) {
    const skill = ACTIVE_SKILLS[id];
    if (!skill || this.player.dead || this.ui.currentMenu || this.dialogue) return false;
    if (!this.player.hasActiveSkill(id)) {
      this.ui.toast(`${skill.name}需要 ${skill.unlock} 级解锁`, 'bad');
      return false;
    }
    if ((this.player.skillCooldowns[id] || 0) > 0) {
      this.ui.toast(`${skill.name}尚在冷却`);
      return false;
    }
    if (this.player.mp < skill.mp) {
      this.ui.toast('法力不足', 'bad');
      return false;
    }

    let success = false;
    if (id === 'heal') {
      if (this.player.hp >= this.player.maxHp) {
        this.ui.toast('生命值已满');
        return false;
      }
      const healed = this.player.heal(50);
      this.addEffect({ type: 'text', x: this.player.px, y: this.player.py, text: `+${Math.round(healed)}`, color: '#72ef8b', duration: 0.8 });
      this.ui.log(`治愈术恢复 ${Math.round(healed)} 点生命`, 'good');
      success = true;
    } else if (id === 'shield') {
      this.player.shieldTime = 5;
      this.ui.log('护盾展开：受到伤害降低 50%', 'good');
      success = true;
    } else if (id === 'power_strike') success = powerStrike(this, this.findAdjacentEnemy());
    else if (id === 'fireball') success = fireball(this, this.findNearestEnemy(7));
    else if (id === 'whirlwind') success = whirlwind(this);

    if (!success) {
      this.ui.toast('技能范围内没有敌人');
      return false;
    }
    this.player.spendMp(skill.mp);
    this.player.skillCooldowns[id] = SKILL_COOLDOWNS[id];
    return true;
  }

  hitEnemy(enemy, damage, label = '攻击', color = '#ffe085') {
    if (!enemy || enemy.dead) return;
    const actual = enemy.takeDamage(damage);
    this.addEffect({ type: 'text', x: enemy.px, y: enemy.py, text: `${label === '暴击' ? '暴击 ' : ''}-${actual}`, color, duration: 0.75 });
    this.ui.log(`${label}：对${enemy.name}造成 ${actual} 点伤害`, label === '暴击' ? 'crit' : 'info');
    if (enemy.dead) this.onEnemyKilled(enemy);
  }

  onEnemyKilled(enemy) {
    const loot = enemy.dropLoot();
    this.player.gold += loot.gold;
    loot.items.forEach(item => this.world.addItemDrop(item.id, item.qty, enemy.x, enemy.y));
    const levels = this.player.gainXp(enemy.xp);
    this.player.gainSkillXp('attack', Math.max(4, Math.round(enemy.xp / 4)));
    this.quests.onKill(enemy.type);
    this.ui.log(`击败${enemy.name}，获得 ${enemy.xp} 经验、${loot.gold} 金币`, 'good');
    if (levels) this.onLevelUp(levels);
    if (enemy.boss) this.ui.toast('巨龙已被击败！你成为了屠龙勇士！', 'good');
  }

  onLevelUp(levels) {
    this.ui.toast(`升级！当前等级 ${this.player.level}，生命与法力已恢复`, 'good');
    Object.entries(ACTIVE_SKILLS).forEach(([id, skill]) => {
      if (this.player.level - levels < skill.unlock && this.player.level >= skill.unlock) this.ui.toast(`解锁技能：${skill.name}`, 'good');
    });
  }

  damagePlayer(rawAttack, enemy) {
    if (this.player.dead || this.world.map.safe) return;
    const damage = Math.max(1, Math.round(rawAttack * (0.9 + Math.random() * 0.2) - this.player.def * 0.48));
    const actual = this.player.takeDamage(damage);
    if (!actual) return;
    this.addEffect({ type: 'text', x: this.player.px, y: this.player.py, text: `-${actual}`, color: '#ff6878', duration: 0.75 });
    this.ui.log(`${enemy.name}对你造成 ${actual} 点伤害`, 'bad');
    this.player.gainSkillXp('defense', 2);
    if (this.player.dead) {
      this.player.moving = false;
      this.deathTimer = 1.5;
      this.input.reset();
      this.ui.toast('你倒下了……即将返回黎明村', 'bad');
    }
  }

  respawn() {
    const lost = Math.floor(this.player.gold * 0.1);
    this.player.gold -= lost;
    this.world.loadMap('town');
    this.syncPlayerToSpawn();
    this.player.dead = false;
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;
    this.player.invulnTime = 2;
    this.ui.closeMenu();
    this.closeDialogue();
    this.ui.toast(`已在村庄复活${lost ? `，损失 ${lost} 金币` : ''}`);
    this.save();
  }

  gatherTargets() {
    const front = this.world.getFrontTile(this.player);
    const positions = [front,
      { x: this.player.x, y: this.player.y - 1 },
      { x: this.player.x + 1, y: this.player.y },
      { x: this.player.x, y: this.player.y + 1 },
      { x: this.player.x - 1, y: this.player.y },
    ];
    const seen = new Set();
    return positions.filter(pos => {
      const key = `${pos.x},${pos.y}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(pos => ({ ...pos, tile: this.world.getTile(pos.x, pos.y) }));
  }

  gather() {
    if (this.gatherCooldown > 0 || this.player.moving) return;
    const target = this.gatherTargets().find(pos => {
      const props = TILE_PROPS[pos.tile];
      return props?.chop || props?.mine || props?.fish || props?.chest;
    });
    if (!target) {
      this.ui.toast('附近没有可采集的资源');
      return;
    }
    const props = TILE_PROPS[target.tile];
    const weapon = ITEMS[this.player.equipment.weapon];
    if (props.chop && weapon?.tool !== 'axe') {
      this.ui.toast('需要装备斧子才能砍伐', 'bad');
      return;
    }
    if (props.mine && weapon?.tool !== 'pick') {
      this.ui.toast('需要装备镐子才能采矿', 'bad');
      return;
    }
    if (props.fish && weapon?.tool !== 'rod') {
      this.ui.toast('需要装备鱼竿才能钓鱼', 'bad');
      return;
    }

    this.gatherCooldown = 0.45;
    let itemId;
    let skillId;
    let xp;
    if (props.chop) {
      itemId = 'wood';
      skillId = 'woodcut';
      xp = 12;
    } else if (props.mine) {
      itemId = props.mine === 'stone' ? 'stone' : `${props.mine}_ore`;
      skillId = 'mining';
      xp = props.mine === 'gold' ? 35 : props.mine === 'iron' ? 24 : 15;
    } else if (props.fish) {
      itemId = 'fish';
      skillId = 'fishing';
      xp = 14;
    }

    if (props.chest) {
      const gold = 25 + Math.floor(Math.random() * 50);
      this.player.gold += gold;
      this.player.addItem('hp_potion', 1);
      this.world.setTile(target.x, target.y, this.world.currentMapId === 'town' ? TILE.GRASS : TILE.FLOOR);
      this.ui.toast(`打开宝箱：${gold} 金币和生命药水`, 'good');
    } else {
      this.player.addItem(itemId, 1);
      const levels = this.player.gainSkillXp(skillId, xp);
      this.quests.onGather(itemId, 1);
      this.addEffect({ type: 'text', x: target.x, y: target.y, text: `+1 ${ITEMS[itemId].name}`, color: '#8fe69a', duration: 0.85 });
      this.ui.log(`获得 ${ITEMS[itemId].name} × 1`, 'good');
      if (levels) this.ui.toast(`${skillId === 'woodcut' ? '伐木' : skillId === 'mining' ? '采矿' : '钓鱼'}技能升级！`, 'good');
      if (!props.fish) {
        const replacement = ['cave', 'dungeon'].includes(this.world.currentMapId) ? TILE.FLOOR : TILE.GRASS;
        this.world.setTile(target.x, target.y, replacement);
        this.world.scheduleTileRespawn(target.x, target.y, target.tile);
      }
    }
    this.save();
  }

  interact() {
    const npc = this.world.getNearbyNPC(this.player);
    if (npc) {
      this.startDialogue(npc);
      return;
    }
    const chest = this.gatherTargets().find(pos => TILE_PROPS[pos.tile]?.chest);
    if (chest) {
      this.gather();
      return;
    }
    this.ui.toast('附近没有可交互的对象');
  }

  startDialogue(npc) {
    if (this.player.moving) return;
    this.dialogue = { npc, stage: 0 };
    this.ui.showDialogue(npc.name, npc.dialog);
  }

  advanceDialogue() {
    if (!this.dialogue) return;
    const { npc, stage } = this.dialogue;
    if (stage > 0) {
      this.closeDialogue();
      return;
    }
    if (npc.quest) {
      const state = this.quests.states[npc.quest];
      const quest = QUESTS[npc.quest];
      if (!state) {
        this.quests.startQuest(npc.quest);
        this.dialogue.stage = 1;
        this.ui.showDialogue(npc.name, `已接受任务「${quest.name}」：${quest.desc}。完成后回来找我。`);
        this.ui.toast(`接受任务：${quest.name}`, 'good');
        return;
      }
      if (this.quests.isComplete(npc.quest)) {
        const reward = this.quests.turnIn(npc.quest);
        this.dialogue.stage = 1;
        this.ui.showDialogue(npc.name, `做得好！这是你的奖励：${reward.gold || 0} 金币、${reward.xp || 0} 经验。`);
        this.ui.toast(`完成任务：${quest.name}`, 'good');
        this.save();
        return;
      }
      if (state.status !== 'turnedIn') {
        this.ui.showDialogue(npc.name, `任务进度：${state.progress}/${quest.qty}。继续努力！`);
        this.dialogue.stage = 1;
        return;
      }
    }
    if (npc.shop) {
      this.closeDialogue();
      this.ui.openMenu('shop');
      return;
    }
    if (npc.craft) {
      this.closeDialogue();
      this.ui.openMenu('craft');
      return;
    }
    this.closeDialogue();
  }

  closeDialogue() {
    this.dialogue = null;
    this.ui.hideDialogue();
  }

  pickupDrops() {
    const nearby = this.world.itemDrops.filter(drop => Math.hypot(drop.x - this.player.px, drop.y - this.player.py) < 0.75);
    for (const drop of nearby) {
      const picked = this.world.pickupItemDrop(drop.uid);
      if (!picked) continue;
      this.player.addItem(picked.id, picked.qty);
      this.ui.toast(`拾取 ${ITEMS[picked.id].name} × ${picked.qty}`, 'good');
    }
  }

  toggleMenu(type) {
    if (!this.started || this.player.dead) return;
    if (this.dialogue) this.closeDialogue();
    if (this.ui.currentMenu === type) this.ui.closeMenu();
    else this.ui.openMenu(type);
  }

  useItem(id) {
    if (this.player.useItem(id)) {
      this.ui.toast(`使用了${ITEMS[id].name}`, 'good');
      this.ui.refreshMenu();
      this.save();
    } else this.ui.toast('现在无法使用该物品', 'bad');
  }

  equipItem(id) {
    if (this.player.equip(id)) {
      this.ui.toast(`已装备${ITEMS[id].name}`, 'good');
      this.ui.refreshMenu();
      this.save();
    }
  }

  unequipItem(slot) {
    if (this.player.unequip(slot)) {
      this.ui.refreshMenu();
      this.save();
    }
  }

  buyItem(id) {
    const item = ITEMS[id];
    if (!item || this.player.gold < item.price) {
      this.ui.toast('金币不足', 'bad');
      return;
    }
    this.player.gold -= item.price;
    this.player.addItem(id, 1);
    this.ui.toast(`购买${item.name} × 1`, 'good');
    this.ui.refreshMenu();
    this.save();
  }

  sellItem(id) {
    const item = ITEMS[id];
    if (!item || !this.player.countItem(id)) return;
    const price = Math.max(1, Math.floor(item.price * 0.5));
    this.player.removeItem(id, 1);
    this.player.gold += price;
    this.ui.toast(`出售${item.name}，获得 ${price} 金币`, 'good');
    this.ui.refreshMenu();
    this.save();
  }

  craft(recipeId) {
    const recipe = RECIPES.find(entry => entry.id === recipeId);
    if (!recipe) return;
    if (this.player.skills[recipe.skill].level < recipe.lv) {
      this.ui.toast('技能等级不足', 'bad');
      return;
    }
    if (!this.player.hasItems(recipe.mats)) {
      this.ui.toast('材料不足', 'bad');
      return;
    }
    Object.entries(recipe.mats).forEach(([id, qty]) => this.player.removeItem(id, qty));
    this.player.addItem(recipe.out, recipe.outQty);
    const levels = this.player.gainSkillXp(recipe.skill, 20 + recipe.lv * 2);
    this.ui.toast(`制作成功：${recipe.name} × ${recipe.outQty}`, 'good');
    if (levels) this.ui.toast('制作技能升级！', 'good');
    this.ui.refreshMenu();
    this.save();
  }

  addEffect(effect) {
    this.effects.push({ ...effect, life: effect.duration || 0.5 });
  }

  updateEffects(dt) {
    this.effects.forEach(effect => { effect.life -= dt; });
    this.effects = this.effects.filter(effect => effect.life > 0);
  }
}
