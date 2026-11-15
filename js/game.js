import { ACHIEVEMENTS, ACTIVE_SKILLS, AUTO_MODES, ENEMIES, ITEMS, MAPS, NPCS, QUESTS, RECIPES, SETTINGS, SHOP_ITEMS, TILE, TILE_PROPS } from './data.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { World } from './world.js';
import { Renderer } from './renderer.js';
import { QuestSystem } from './quests.js';
import { UI } from './ui.js';
import { fireball, playerAttack, powerStrike, whirlwind } from './combat.js';
import { choice, distCheb, rand } from './utils.js';
import { setMuted, sfx } from './audio.js';

const GATHER_TOOLS = {
  copper_ore: 'pick', iron_ore: 'pick', gold_ore: 'pick', stone: 'pick',
  wood: 'axe', fish: 'rod',
};

const SAVE_KEY = 'pixel-quest-save';
const SETTINGS_KEY = 'pixel-quest-settings';
const SKILL_KEYS = { '1': 'heal', '2': 'power_strike', '3': 'fireball', '4': 'whirlwind', '5': 'shield' };
const SKILL_COOLDOWNS = { heal: 6, power_strike: 2.5, fireball: 3, whirlwind: 5, shield: 10 };

const defaultStats = () => ({
  kills: 0, elites: 0, bosses: 0, wood: 0, ore: 0, fish: 0, frost: 0,
  chests: 0, quests: 0, deaths: 0, goldEarned: 0, playtime: 0, maps: [], frostBeast: 0,
});

export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.settings = this.loadSettings();
    this.applySettings();
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
    this.bumpCooldown = 0;
    this.deathTimer = 0;
    this.hitStop = 0;
    this.fade = 0;
    this.auto = false;
    this.autoMode = 'all';
    this.autoStatus = '';
    this.autoPotionCooldown = 0;
    this.autoManaCooldown = 0;
    this.autoShopCooldown = 0;
    this.autoRepathCooldown = 0;
    this.autoUnreachable = new Map();
    this.autoRoamTarget = null;
    this.autoRestocking = false;
    this.autoRestockCooldown = 0;
    this.autoWeaponBeforeTool = null;
    this.autoStuckTime = 0;
    this.autoWatchKey = '';
    this.autoWatchGold = -1;
    this.autoDialogueTime = 0;
    this.pathCache = null;
    this.clickPath = null;
    this.clickGoal = null;
    this.clickMarker = null;
    this.clickAction = null;
    this.clickAttack = null;
    this.clickGoalKey = '';
    this.clickRepathCooldown = 0;
    this.clickAttackMisses = 0;
    this.clickMoveMisses = 0;
    this.hoverTile = null;
    this.dt = 0;
    this.dialogue = null;
    this.contactNpc = null;
    this.retaliateTarget = null;
    this.retaliateTime = 0;
    this.stats = defaultStats();
    this.achievements = [];
    this.achievementTimer = 0;
    this.syncPlayerToSpawn();
    this.ui = new UI(this);
  }

  start() {
    const loop = timestamp => {
      const dt = this.lastTime ? Math.min(0.05, (timestamp - this.lastTime) / 1000) : 0;
      this.lastTime = timestamp;
      this.time += dt;
      this.dt = dt;
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
    this.world.reset('town');
    this.syncPlayerToSpawn();
    this.effects = [];
    this.dialogue = null;
    this.contactNpc = null;
    this.stats = defaultStats();
    this.stats.maps.push('town');
    this.achievements = [];
    this.achievementTimer = 0;
    this.started = true;
    this.saveTimer = 0;
    this.attackCooldown = 0;
    this.gatherCooldown = 0;
    this.hitStop = 0;
    this.fade = 0.4;
    this.renderer.snapCamera();
    this.input.reset();
    this.clearHover();
    this.auto = false;
    this.autoMode = 'all';
    this.pathCache = null;
    this.cancelClickMove();
    this.autoUnreachable.clear();
    this.autoRoamTarget = null;
    this.autoRestocking = false;
    this.autoWeaponBeforeTool = null;
    this.autoPotionCooldown = 0;
    this.autoManaCooldown = 0;
    this.autoShopCooldown = 0;
    this.deathTimer = 0;
    this.retaliateTarget = null;
    this.retaliateTime = 0;
    this.syncAutoUI();
    this.ui.closeMenu();
    this.ui.hideDialogue();
    this.ui.combatLog.innerHTML = '';
    document.getElementById('start-screen').classList.add('hidden');
    this.ui.log('欢迎来到黎明村，勇者！', 'good');
    this.ui.toast('冒险开始！点击地图移动，点击怪物/资源/NPC 自动交互', 'good');
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
      this.stats = { ...defaultStats(), ...(save.stats && typeof save.stats === 'object' ? save.stats : {}) };
      this.stats.maps = Array.isArray(save.stats?.maps) ? [...new Set(save.stats.maps.filter(id => MAPS[id]))] : [];
      this.achievements = Array.isArray(save.achievements) ? save.achievements.filter(id => ACHIEVEMENTS[id]) : [];
      this.achievementTimer = 0;
      this.trackMap();
      this.effects = [];
      this.dialogue = null;
      this.contactNpc = null;
      this.started = true;
      this.saveTimer = 0;
      this.fade = 0.4;
      this.renderer.snapCamera();
      this.input.reset();
      this.clearHover();
      this.auto = !!save.auto || !!this.settings.autoStart;
      this.autoMode = AUTO_MODES[save.autoMode] ? save.autoMode : 'all';
      this.pathCache = null;
      this.cancelClickMove();
      this.autoUnreachable.clear();
      this.autoRoamTarget = null;
      this.autoRestocking = false;
      this.autoWeaponBeforeTool = null;
      this.autoPotionCooldown = 0;
      this.autoManaCooldown = 0;
      this.autoShopCooldown = 0;
      this.deathTimer = 0;
      this.retaliateTarget = null;
      this.retaliateTime = 0;
      this.syncAutoUI();
      this.ui.closeMenu();
      this.ui.hideDialogue();
      document.getElementById('start-screen').classList.add('hidden');
      this.ui.toast('存档已读取，自动冒险已开始！', 'good');
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
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 2, auto: this.auto, autoMode: this.autoMode, player: this.player.toSave(), quests: this.quests.toSave(), stats: this.stats, achievements: this.achievements, savedAt: Date.now() }));
    } catch (error) {
      console.warn('Unable to save game:', error);
    }
  }

  loadSettings() {
    const defaults = Object.fromEntries(SETTINGS.map(item => [item.id, item.def]));
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (saved && typeof saved === 'object') {
        Object.keys(defaults).forEach(id => {
          if (typeof saved[id] === 'boolean') defaults[id] = saved[id];
        });
      }
    } catch {
      // 忽略损坏的设置数据，使用默认值
    }
    return defaults;
  }

  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Unable to save settings:', error);
    }
  }

  applySettings() {
    setMuted(!this.settings.sound);
    this.renderer.shakeEnabled = this.settings.shake;
  }

  toggleSetting(id) {
    const def = SETTINGS.find(item => item.id === id);
    if (!def) return;
    this.settings[id] = !this.settings[id];
    this.applySettings();
    this.saveSettings();
    sfx.menu();
    if (this.ui) {
      this.ui.toast(`${def.name}：${this.settings[id] ? '开启' : '关闭'}`, 'good');
      this.ui.refreshMenu();
    }
  }

  syncPlayerToSpawn() {
    this.player.setTile(this.world.spawnX, this.world.spawnY);
    this.player.mapId = this.world.currentMapId;
  }

  update(dt) {
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      this.updateHud(dt);
      return;
    }
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.clickRepathCooldown = Math.max(0, this.clickRepathCooldown - dt);
    this.gatherCooldown = Math.max(0, this.gatherCooldown - dt);
    this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt);
    this.player.invulnTime = Math.max(0, this.player.invulnTime - dt);
    this.retaliateTime = Math.max(0, this.retaliateTime - dt);
    this.player.shieldTime = Math.max(0, this.player.shieldTime - dt);
    this.player.attackAnim = Math.max(0, (this.player.attackAnim || 0) - dt * 7);
    this.bumpCooldown = Math.max(0, (this.bumpCooldown || 0) - dt);
    this.autoPotionCooldown = Math.max(0, this.autoPotionCooldown - dt);
    this.autoManaCooldown = Math.max(0, this.autoManaCooldown - dt);
    this.autoShopCooldown = Math.max(0, this.autoShopCooldown - dt);
    this.fade = Math.max(0, this.fade - dt);
    this.stats.playtime += dt;
    this.trackMap();
    this.achievementTimer += dt;
    if (this.achievementTimer >= 1) {
      this.achievementTimer = 0;
      this.checkAchievements();
    }
    Object.keys(this.player.skillCooldowns).forEach(id => {
      this.player.skillCooldowns[id] = Math.max(0, this.player.skillCooldowns[id] - dt);
    });
    this.updateEffects(dt);
    this.handleInput();
    if (!this.auto) this.tryManualRetaliate();
    if (this.hoverTile && (this.ui.currentMenu || this.dialogue || this.player.dead)) this.clearHover();

    if (this.player.dead) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.respawn();
      this.updateHud(dt);
      return;
    }

    if (this.auto && this.dialogue) {
      this.autoDialogueTime += dt;
      if (this.autoDialogueTime > 2) {
        this.autoDialogueTime = 0;
        this.closeDialogue();
      }
    }

    // 菜单打开时世界与自动模式继续运行，移动与点击行动也不会被中断
    if (!this.dialogue) {
      this.updateMovement(dt);
      this.updateClickMove();
      this.world.update(dt, this);
      this.pickupDrops();
      this.runAuto(dt);
      this.player.restoreMp(dt * 0.7);
      if (this.world.map.safe) this.player.heal(dt * 1.2);
    }

    if (this.auto) this.updateAutoWatchdog(dt);

    this.saveTimer += dt;
    if (this.saveTimer >= 5) {
      this.saveTimer = 0;
      if (this.settings.autoSave) this.save();
    }
    this.updateHud(dt);
  }

  updateAutoWatchdog(dt) {
    if (this.ui.currentMenu || this.dialogue || this.world.map.safe || this.player.moving || this.attackCooldown > 0) {
      this.autoStuckTime = 0;
      return;
    }
    const key = `${this.player.x},${this.player.y}`;
    if (key !== this.autoWatchKey || this.player.gold !== this.autoWatchGold) {
      this.autoWatchKey = key;
      this.autoWatchGold = this.player.gold;
      this.autoStuckTime = 0;
      return;
    }
    this.autoStuckTime += dt;
    // 长时间原地不动且没有攻击/收入，说明寻路卡住了，清空缓存重新找目标
    if (this.autoStuckTime > 10) {
      this.autoStuckTime = 0;
      this.pathCache = null;
      this.autoRoamTarget = null;
      this.autoRepathCooldown = 0;
      this.autoUnreachable.clear();
      this.setAutoStatus('重新寻路');
    }
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

    const menuKeys = { i: 'inventory', b: 'inventory', k: 'skills', c: 'character', q: 'quests', m: 'map', h: 'achievements', o: 'settings' };
    for (const [key, menu] of Object.entries(menuKeys)) {
      if (pressed.has(key)) this.toggleMenu(menu);
    }
    if (pressed.has('t')) this.toggleAuto();
    if (this.ui.currentMenu || this.player.dead) return;

    if (this.dialogue) {
      if (pressed.has('space') || pressed.has('e')) this.advanceDialogue();
      return;
    }
    if (this.input.keys.has('space')) this.tryAttack();
    if (pressed.has('e')) this.interact();
    if (pressed.has('f')) this.gather();
    Object.entries(SKILL_KEYS).forEach(([key, skill]) => {
      if (pressed.has(key)) this.useActiveSkill(skill);
    });
  }

  updateMovement(dt) {
    let dx = 0;
    let dy = 0;
    if (!this.dialogue && !this.player.dead) {
      dx = this.input.dirX;
      dy = this.input.dirY;
    }
    if (dx !== 0 && dy !== 0) dy = 0;

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
        sfx.step();
        if (!this.checkPortal()) this.checkNpcContact();
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
      } else if (this.bumpCooldown <= 0) {
        this.bumpCooldown = 0.42;
        sfx.step();
        this.checkNpcContact();
      }
    }
  }

  // 走到 NPC 旁边或撞上 NPC 时自动交谈
  checkNpcContact() {
    if (this.auto || this.player.dead || this.player.moving || this.ui.currentMenu || this.dialogue) return;
    const npc = this.world.getNearbyNPC(this.player);
    if (!npc) {
      this.contactNpc = null;
      return;
    }
    if (this.contactNpc === npc) return;
    this.contactNpc = npc;
    this.startDialogue(npc);
  }

  clickToMove(clientX, clientY) {
    if (!this.started || this.player.dead) return false;
    if (this.ui.currentMenu || this.dialogue) return false;
    const tile = this.renderer.tileAtClient(clientX, clientY);
    if (!tile) return false;
    const { x: tx, y: ty } = tile;
    if (tx < 0 || ty < 0 || tx >= this.world.width || ty >= this.world.height) return false;
    const enemy = this.world.getEnemyAt(tx, ty);
    const npc = !enemy && this.world.npcs.find(item => item.x === tx && item.y === ty);
    const props = TILE_PROPS[this.world.getTile(tx, ty)];
    const harvest = !!props && (props.chop || props.mine || props.fish || props.chest);
    if (tx === this.player.x && ty === this.player.y && !enemy && !npc && !harvest) {
      this.cancelClickMove();
      return true;
    }
    if (this.auto) this.toggleAuto();
    this.cancelClickMove();
    if (enemy) this.clickAttack = enemy;
    else if (npc) this.clickAction = { type: 'talk', npc };
    else if (harvest) this.clickAction = { type: 'gather', x: tx, y: ty };
    this.clickGoal = { x: tx, y: ty };
    this.clickMarker = { x: tx, y: ty };
    // 已经在交互范围内时直接执行，不再寻路
    if (distCheb(this.player, { x: tx, y: ty }) <= 1) {
      if (this.clickAction) {
        this.finishClickAction();
        return true;
      }
      if (this.clickAttack) {
        this.updateClickMove();
        return true;
      }
    }
    if (!this.player.moving) this.updateClickMove();
    return true;
  }

  findClickPath(tx, ty) {
    const world = this.world;
    const startX = this.player.x;
    const startY = this.player.y;
    if (tx === startX && ty === startY) return [];
    const walkable = (x, y) => world.isWalkable(x, y, this.player);
    const candidates = [];
    // 目标本身可通行时优先直达；树、矿、NPC、敌人等则走到相邻格
    if (walkable(tx, ty)) candidates.push({ x: tx, y: ty });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = tx + dx;
      const y = ty + dy;
      if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue;
      if (walkable(x, y) && !world.getPortalAt(x, y)) candidates.push({ x, y });
    }
    candidates.sort((a, b) => Math.hypot(a.x - startX, a.y - startY) - Math.hypot(b.x - startX, b.y - startY));
    let best = null;
    for (const target of candidates) {
      const steps = this.findPath(target.x, target.y);
      if (!steps.length) continue;
      if (target.x === tx && target.y === ty) return steps;
      if (!best || steps.length < best.length) best = steps;
    }
    return best;
  }

  updateClickMove() {
    if (!this.clickGoal && !this.clickAttack) return;
    if (this.input.dirX !== 0 || this.input.dirY !== 0) {
      this.cancelClickMove();
      return;
    }
    if (this.clickAttack) {
      const enemy = this.clickAttack;
      if (enemy.dead || !this.world.enemies.includes(enemy)) {
        this.cancelClickMove();
        return;
      }
      if (distCheb(this.player, enemy) <= 1) {
        if (!this.player.moving) {
          this.faceTarget(enemy);
          this.attackNow();
        }
        return;
      }
      // 敌人会移动，位置变化后重新规划路线
      const key = `${enemy.x},${enemy.y}`;
      if (key !== this.clickGoalKey) {
        this.clickGoalKey = key;
        this.clickGoal = { x: enemy.x, y: enemy.y };
        this.clickMarker = { x: enemy.x, y: enemy.y };
        this.clickPath = null;
      }
    }
    if (this.player.moving || this.clickRepathCooldown > 0) return;
    if (!this.clickPath) {
      const path = this.findClickPath(this.clickGoal.x, this.clickGoal.y);
      if (!path || !path.length) {
        if (this.clickAttack) {
          this.clickAttackMisses++;
          if (this.clickAttackMisses > 10) {
            this.cancelClickMove();
            this.ui.toast('无法接近目标');
            return;
          }
          this.clickRepathCooldown = 0.35;
          return;
        }
        this.cancelClickMove();
        this.ui.toast('无法前往该地点');
        return;
      }
      this.clickPath = path;
      this.clickAttackMisses = 0;
    }
    while (this.clickPath.length && this.clickPath[0].x === this.player.x && this.clickPath[0].y === this.player.y) {
      this.clickPath.shift();
    }
    if (!this.clickPath.length) {
      if (this.clickAction) this.finishClickAction();
      else if (this.clickAttack) {
        this.clickPath = null;
        this.clickGoalKey = '';
        this.clickRepathCooldown = 0.35;
      } else this.cancelClickMove();
      return;
    }
    const next = this.clickPath[0];
    const allowPortal = !!this.world.getPortalAt(next.x, next.y);
    if (!this.autoMove(next.x - this.player.x, next.y - this.player.y, allowPortal)) {
      if (this.clickAttack) {
        this.clickAttackMisses++;
        this.clickPath = null;
        this.clickRepathCooldown = 0.35;
        return;
      }
      this.clickMoveMisses++;
      if (this.clickMoveMisses > 2) {
        this.cancelClickMove();
        this.ui.toast('前路被挡住了');
        return;
      }
      // 怪物可能临时挡路，重新规划一次而不是直接放弃
      this.clickPath = null;
      this.clickRepathCooldown = 0.3;
      return;
    }
    this.clickMoveMisses = 0;
    this.clickPath.shift();
  }

  finishClickAction() {
    const action = this.clickAction;
    this.cancelClickMove();
    if (!action) return;
    if (action.type === 'gather') {
      const tile = this.world.getTile(action.x, action.y);
      const props = TILE_PROPS[tile];
      if (!props || !(props.chop || props.mine || props.fish || props.chest)) return;
      if (distCheb(this.player, action) > 1) return;
      this.gather({ x: action.x, y: action.y, tile });
    } else if (action.type === 'talk') {
      if (this.world.npcs.includes(action.npc) && distCheb(this.player, action.npc) <= 1) {
        this.startDialogue(action.npc);
      }
    }
  }

  cancelClickMove() {
    this.clickPath = null;
    this.clickGoal = null;
    this.clickMarker = null;
    this.clickAction = null;
    this.clickAttack = null;
    this.clickGoalKey = '';
    this.clickRepathCooldown = 0;
    this.clickAttackMisses = 0;
    this.clickMoveMisses = 0;
  }

  hoverAt(clientX, clientY) {
    if (!this.started || this.player.dead || this.ui.currentMenu || this.dialogue) {
      this.clearHover();
      return;
    }
    if (document.body.classList.contains('touch-mode')) return;
    const tile = this.renderer.tileAtClient(clientX, clientY);
    if (!tile || tile.x < 0 || tile.y < 0 || tile.x >= this.world.width || tile.y >= this.world.height) {
      this.clearHover();
      return;
    }
    const enemy = this.world.getEnemyAt(tile.x, tile.y);
    const npc = !enemy && this.world.npcs.find(item => item.x === tile.x && item.y === tile.y);
    const props = TILE_PROPS[this.world.getTile(tile.x, tile.y)];
    const harvest = !!props && (props.chop || props.mine || props.fish || props.chest);
    const kind = enemy ? 'enemy' : npc ? 'npc' : harvest ? 'resource' : null;
    if (!kind) {
      this.clearHover();
      return;
    }
    if (!this.hoverTile || this.hoverTile.x !== tile.x || this.hoverTile.y !== tile.y || this.hoverTile.kind !== kind) {
      this.hoverTile = { x: tile.x, y: tile.y, kind };
    }
    const cursor = enemy ? 'crosshair' : 'pointer';
    if (this.renderer.canvas.style.cursor !== cursor) this.renderer.canvas.style.cursor = cursor;
  }

  clearHover() {
    this.hoverTile = null;
    if (this.renderer.canvas.style.cursor !== 'crosshair') this.renderer.canvas.style.cursor = 'crosshair';
  }

  checkPortal() {
    const portal = this.world.getPortalAt(this.player.x, this.player.y);
    if (!portal || !MAPS[portal.to]) return false;
    this.cancelClickMove();
    this.clearHover();
    this.world.loadMap(portal.to);
    this.player.setTile(portal.toX, portal.toY);
    this.player.mapId = this.world.currentMapId;
    this.effects = [];
    this.pathCache = null;
    this.autoUnreachable.clear();
    this.autoRoamTarget = null;
    this.fade = 0.38;
    this.renderer.snapCamera();
    sfx.portal();
    this.ui.toast(`来到 ${this.world.map.name}`);
    this.ui.log(`进入${this.world.map.name}`);
    this.save();
    return true;
  }

  findAdjacentEnemy() {
    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = dirs[this.player.dir] || dirs.down;
    const facing = this.world.getEnemyAt(this.player.x + dx, this.player.y + dy);
    if (facing) return facing;
    return this.world.enemies
      .filter(enemy => !enemy.dead && distCheb(this.player, enemy) <= 1)
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
    this.cancelClickMove();
    this.attackNow();
  }

  attackNow() {
    if (this.attackCooldown > 0) return;
    const target = this.findAdjacentEnemy();
    this.attackCooldown = 0.26;
    this.player.attackAnim = 1;
    sfx.swing();
    if (!target) return;
    this.addEffect({ type: 'slash', x: target.px, y: target.py, color: '#fff0ad', duration: 0.22 });
    playerAttack(this, target);
  }

  toggleAuto() {
    this.auto = !this.auto;
    this.cancelClickMove();
    if (!this.auto) this.autoRestoreWeapon();
    this.resetAutoState();
    this.syncAutoUI();
    sfx.menu();
    const meta = AUTO_MODES[this.autoMode];
    this.ui.toast(this.auto ? `自动行动已开启：${meta.name} · ${meta.desc}` : '自动行动已关闭', this.auto ? 'good' : '');
    this.save();
  }

  setAutoMode(mode) {
    if (!AUTO_MODES[mode]) return;
    this.autoMode = mode;
    this.auto = true;
    this.cancelClickMove();
    this.resetAutoState();
    this.syncAutoUI();
    sfx.menu();
    const meta = AUTO_MODES[mode];
    this.ui.toast(`自动行动：${meta.name} · ${meta.desc}`, 'good');
    this.save();
  }

  resetAutoState() {
    this.autoStatus = '';
    this.pathCache = null;
    this.autoUnreachable.clear();
    this.autoRoamTarget = null;
    this.autoRestocking = false;
    this.autoRestockCooldown = 0;
    this.autoStuckTime = 0;
    this.autoWatchKey = '';
    this.autoWatchGold = -1;
    this.autoDialogueTime = 0;
    this.retaliateTarget = null;
    this.retaliateTime = 0;
  }

  syncAutoUI() {
    if (!this.auto) this.autoStatus = '';
    const label = this.auto ? `自动：${AUTO_MODES[this.autoMode]?.name || '全自动'}` : '自动动作';
    document.querySelectorAll('[data-auto]').forEach(button => {
      button.classList.toggle('auto-on', this.auto);
      button.setAttribute('aria-pressed', String(this.auto));
      button.title = label;
      button.setAttribute('aria-label', label);
    });
    document.querySelectorAll('[data-auto-mode]').forEach(button => {
      button.classList.toggle('active', this.auto && button.dataset.autoMode === this.autoMode);
    });
  }

  healOptions() {
    return Object.keys(this.player.inventory)
      .filter(id => ITEMS[id]?.type === 'consumable' && ITEMS[id].heal > 0 && (this.player.inventory[id] || 0) > 0)
      .sort((a, b) => ITEMS[a].heal - ITEMS[b].heal);
  }

  canUseHealSkill() {
    return this.player.hasActiveSkill('heal')
      && this.player.mp >= ACTIVE_SKILLS.heal.mp
      && (this.player.skillCooldowns.heal || 0) <= 0;
  }

  runAuto(dt = 0) {
    if (!this.auto || this.player.dead) return;
    this.autoRepathCooldown = Math.max(0, this.autoRepathCooldown - dt);
    this.autoRestockCooldown = Math.max(0, this.autoRestockCooldown - dt);
    this.tryAutoHeal();
    if (this.player.moving) return;
    if (this.world.map.safe) {
      this.autoRestocking = false;
      this.setAutoStatus('补给');
      if (this.autoSafeTasks()) return;
      this.autoLeaveSafeZone();
      return;
    }
    const p = this.player;
    const ratio = p.hp / p.maxHp;
    if ((ratio < 0.3 || (ratio < 0.45 && this.threatCount(2) >= 2)) && !this.autoCanHealSoon()) {
      this.setAutoStatus('撤退');
      if (this.autoRetreat()) return;
    }
    if (this.tryAutoRecover()) return;
    if (this.tryAutoRetaliate(ratio)) return;
    if (this.autoMode === 'all' && this.autoShouldTurnIn(ratio)) {
      this.setAutoStatus('交任务');
      if (this.autoRetreat()) return;
    }
    if (this.autoRestockTrip(ratio)) return;
    if ((this.autoMode === 'all' || this.autoMode === 'combat') && this.autoAdvanceMap(ratio)) return;
    if (this.tryAutoKite(ratio)) return;
    const adjacent = this.findAdjacentEnemy();
    if (adjacent) {
      if (this.enemyDanger(adjacent) && ratio < 0.55 && !this.autoCanHealSoon()) {
        this.setAutoStatus('撤退');
        if (this.autoRetreat()) return;
      }
      this.autoRestoreWeapon();
      this.setAutoStatus('战斗');
      this.tryAutoCombatSkills(adjacent);
      this.faceTarget(adjacent);
      if (this.attackCooldown <= 0) this.tryAttack();
      return;
    }
    if (this.autoMode !== 'combat') {
      const items = this.autoMode === 'all' ? null : this.autoGatherItems();
      if (this.tryAutoGather(items)) {
        this.setAutoStatus(this.autoMode === 'all' ? '采集' : this.autoGatherLabel());
        return;
      }
      if (this.autoSeekGather()) return;
      if (this.autoMode !== 'all' && this.autoTravelForGather(this.autoGatherItems())) return;
      if (this.autoMode !== 'all') this.setAutoStatus('升级中');
    }
    const target = this.pickAutoTarget();
    if (target) {
      const distance = Math.hypot(target.px - p.px, target.py - p.py);
      const acted = this.tryAutoRangedSkill(target, distance) || this.autoStepToward(target);
      if (acted) {
        this.setAutoStatus('追击');
        return;
      }
    }
    if (this.tryAutoLoot()) {
      this.setAutoStatus('拾取');
      return;
    }
    this.setAutoStatus('寻怪');
    this.autoRoam();
  }

  setAutoStatus(status) {
    this.autoStatus = status;
  }

  threatCount(range = 3) {
    return this.world.enemies.filter(enemy => !enemy.dead && distCheb(enemy, this.player) <= range).length;
  }

  enemyDanger(enemy) {
    return enemy.level - this.player.level >= 5;
  }

  tryAutoRecover() {
    const p = this.player;
    if (this.findNearestEnemy(6)) return false;
    const ratio = p.hp / p.maxHp;
    if (ratio < 0.75 && this.canUseHealSkill() && this.useActiveSkill('heal')) {
      this.setAutoStatus('休整');
      return true;
    }
    if (ratio < 0.5 && this.drinkHealPotion()) {
      this.setAutoStatus('休整');
      return true;
    }
    if (this.tryAutoRestoreMp()) {
      this.setAutoStatus('休整');
      return true;
    }
    return false;
  }

  tryManualRetaliate() {
    const target = this.retaliateTarget;
    if (!target || target.dead || !this.world.enemies.includes(target)) {
      this.retaliateTarget = null;
      return false;
    }
    if (this.retaliateTime <= 0 || this.player.dead || this.player.moving
      || this.ui.currentMenu || this.dialogue || this.world.map.safe) {
      if (this.retaliateTime <= 0) this.retaliateTarget = null;
      return false;
    }
    if (distCheb(this.player, target) > 1) return false;
    this.faceTarget(target);
    if (this.attackCooldown <= 0) this.tryAttack();
    return true;
  }

  tryAutoRetaliate(ratio) {
    const target = this.retaliateTarget;
    if (!target || target.dead || this.retaliateTime <= 0 || !this.world.enemies.includes(target)) {
      this.retaliateTarget = null;
      return false;
    }
    if (this.world.map.safe) return false;
    // 血量过低或越级过多时，生存优先，不强行还击
    if ((ratio < 0.3 || (this.enemyDanger(target) && ratio < 0.5)) && !this.autoCanHealSoon()) return false;
    const distance = Math.hypot(target.px - this.player.px, target.py - this.player.py);
    if (this.tryAutoRangedSkill(target, distance)) {
      this.setAutoStatus('反击');
      return true;
    }
    if (distCheb(this.player, target) <= 1) {
      this.autoRestoreWeapon();
      this.setAutoStatus('反击');
      this.tryAutoCombatSkills(target);
      this.faceTarget(target);
      if (this.attackCooldown <= 0) this.tryAttack();
      return true;
    }
    if (this.autoStepToward(target)) {
      this.setAutoStatus('反击');
      return true;
    }
    return false;
  }

  tryAutoKite(ratio) {
    const p = this.player;
    if (ratio > 0.5 || !p.hasActiveSkill('fireball')) return false;
    if (this.canUseHealSkill() || this.healOptions().length) return false;
    const enemy = this.findNearestEnemy(5);
    if (!enemy) return false;
    const distance = Math.hypot(enemy.px - p.px, enemy.py - p.py);
    if ((p.skillCooldowns.fireball || 0) <= 0 && p.mp >= ACTIVE_SKILLS.fireball.mp) {
      this.setAutoStatus('风筝');
      return this.useActiveSkill('fireball');
    }
    if (distance <= 3.2) {
      this.autoStepAway(enemy);
      return true;
    }
    return false;
  }

  autoRoam() {
    if (this.player.moving || this.autoRepathCooldown > 0) return;
    const p = this.player;
    const canFightDanger = p.hp / p.maxHp > 0.75;
    const enemies = this.world.enemies
      .filter(enemy => !enemy.dead && (canFightDanger || !this.enemyDanger(enemy)))
      .sort((a, b) => Math.hypot(a.px - p.px, a.py - p.py)
        - Math.hypot(b.px - p.px, b.py - p.py));
    // 主动寻怪：挨个尝试全图可反击的怪物，能走通就追过去
    for (const enemy of enemies) {
      if (this.autoStepToward(enemy)) {
        this.autoRoamTarget = null;
        this.setAutoStatus('寻怪');
        return;
      }
    }
    // 全图暂时没有可追击的怪物时，去远处尚未探索过的位置找怪，而不是在原地打转
    this.setAutoStatus('探索');
    this.autoExplore();
  }

  exploreKey(pos) {
    return `tile:${this.world.currentMapId}:${pos.x},${pos.y}`;
  }

  autoExplore() {
    const p = this.player;
    if (this.autoRoamTarget) {
      if (distCheb(p, this.autoRoamTarget) <= 1) {
        this.autoRoamTarget = null;
      } else if (this.autoPathStep(this.autoRoamTarget.x, this.autoRoamTarget.y)) {
        return;
      } else {
        this.autoUnreachable.set(this.exploreKey(this.autoRoamTarget), this.time + 6);
        this.autoRoamTarget = null;
      }
    }
    const target = this.pickExploreTarget();
    if (!target) return;
    this.autoRoamTarget = target;
    if (!this.autoPathStep(target.x, target.y)) {
      this.autoUnreachable.set(this.exploreKey(target), this.time + 6);
      this.autoRoamTarget = null;
    }
  }

  pickExploreTarget() {
    const p = this.player;
    const options = [];
    for (let i = 0; i < 60; i++) {
      const x = rand(1, this.world.width - 2);
      const y = rand(1, this.world.height - 2);
      if (!this.world.isWalkable(x, y, p)) continue;
      if (this.world.getPortalAt(x, y) || this.world.getEnemyAt(x, y)) continue;
      if (this.time < (this.autoUnreachable.get(this.exploreKey({ x, y })) || 0)) continue;
      const distance = distCheb(p, { x, y });
      if (distance < 6) continue;
      options.push({ x, y, distance });
    }
    if (!options.length) return null;
    options.sort((a, b) => b.distance - a.distance);
    // 优先去更远的地方，但保留随机性，避免反复走同一条路线
    return choice(options.slice(0, Math.max(1, Math.ceil(options.length / 3))));
  }

  autoCanHealSoon() {
    if (this.canUseHealSkill()) return true;
    return this.autoPotionCooldown <= 0 && this.healOptions().length > 0;
  }

  tryAutoCombatSkills(adjacent) {
    const p = this.player;
    const count = this.world.enemies.filter(enemy => !enemy.dead && distCheb(enemy, p) <= 1).length;
    const bossNear = this.world.enemies.some(enemy => !enemy.dead && enemy.boss && distCheb(enemy, p) <= 3);
    const reserve = p.hasActiveSkill('heal') && (p.skillCooldowns.heal || 0) <= 0 ? ACTIVE_SKILLS.heal.mp : 0;
    const available = p.mp - reserve;
    const pct = p.hp / p.maxHp;

    if (
      p.hasActiveSkill('shield')
      && (p.skillCooldowns.shield || 0) <= 0
      && available >= ACTIVE_SKILLS.shield.mp
      && pct < 0.7
      && (count >= 2 || bossNear)
      && this.useActiveSkill('shield')
    ) return;

    if (
      count >= 2
      && p.hasActiveSkill('whirlwind')
      && (p.skillCooldowns.whirlwind || 0) <= 0
      && available >= ACTIVE_SKILLS.whirlwind.mp
      && this.useActiveSkill('whirlwind')
    ) return;

    if (
      p.hasActiveSkill('power_strike')
      && (p.skillCooldowns.power_strike || 0) <= 0
      && available >= ACTIVE_SKILLS.power_strike.mp
    ) {
      this.useActiveSkill('power_strike');
    }
  }

  tryAutoRangedSkill(target, distance) {
    const p = this.player;
    if (!p.hasActiveSkill('fireball') || (p.skillCooldowns.fireball || 0) > 0) return false;
    if (distance < 2 || distance > 6) return false;
    const reserve = p.hasActiveSkill('heal') && (p.skillCooldowns.heal || 0) <= 0 ? ACTIVE_SKILLS.heal.mp : 0;
    if (p.mp - reserve < ACTIVE_SKILLS.fireball.mp) return false;
    return this.useActiveSkill('fireball');
  }

  pickAutoTarget(range = 7) {
    const p = this.player;
    const canFightDanger = p.hp / p.maxHp > 0.75;
    return this.world.enemies
      .filter(enemy => !enemy.dead && Math.hypot(enemy.px - p.px, enemy.py - p.py) <= range)
      .filter(enemy => canFightDanger || !this.enemyDanger(enemy))
      .sort((a, b) => {
        const hpA = a.hp / a.maxHp;
        const hpB = b.hp / b.maxHp;
        if (Math.abs(hpA - hpB) > 0.35) return hpA - hpB;
        return Math.hypot(a.px - p.px, a.py - p.py)
          - Math.hypot(b.px - p.px, b.py - p.py);
      })[0] || null;
  }

  tryAutoLoot() {
    if (this.player.moving || this.input.dirX !== 0 || this.input.dirY !== 0) return false;
    const drop = this.world.itemDrops
      .filter(item => {
        const d = Math.hypot(item.x - this.player.px, item.y - this.player.py);
        return d < 7.5 && d > 0.6;
      })
      .sort((a, b) => Math.hypot(a.x - this.player.px, a.y - this.player.py)
        - Math.hypot(b.x - this.player.px, b.y - this.player.py))[0];
    if (!drop) return false;
    return this.autoPathStep(drop.x, drop.y);
  }

  autoPathStep(tx, ty, ignoreEnemies = false) {
    if (this.player.moving || this.autoRepathCooldown > 0) return false;
    const key = `${this.world.currentMapId}:${tx},${ty}${ignoreEnemies ? ':free' : ''}`;
    let steps = this.pathCache && this.pathCache.key === key ? this.pathCache.steps : null;
    let index = steps ? steps.findIndex(step => step.x === this.player.x && step.y === this.player.y) : -1;
    if (!steps || index === -1 || index >= steps.length - 1) {
      steps = this.findPath(tx, ty, ignoreEnemies);
      this.pathCache = { key, steps };
      index = steps.findIndex(step => step.x === this.player.x && step.y === this.player.y);
      if (index === -1 || index >= steps.length - 1) return false;
    }
    const next = steps[index + 1];
    const isPortal = !!this.world.getPortalAt(tx, ty);
    if (!this.autoMove(next.x - this.player.x, next.y - this.player.y, isPortal)) {
      this.pathCache = null;
      this.autoRepathCooldown = 0.25;
      return false;
    }
    return true;
  }

  findPath(tx, ty, ignoreEnemies = false) {
    const world = this.world;
    const walkable = ignoreEnemies
      ? (x, y) => world.isWalkableIgnoringEnemies(x, y)
      : (x, y) => world.isWalkable(x, y, this.player);
    if (!walkable(tx, ty)) return [];
    const startX = this.player.x;
    const startY = this.player.y;
    if (startX === tx && startY === ty) return [];
    const startKey = `${startX},${startY}`;
    const queue = [[startX, startY]];
    const prev = new Map([[startKey, null]]);
    let head = 0;
    while (head < queue.length && head < 1200) {
      const [x, y] = queue[head++];
      if (x === tx && y === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (prev.has(key) || !walkable(nx, ny)) continue;
        // 除非目标就是传送门，否则路径绕开传送门，避免中途切换地图
        if (world.getPortalAt(nx, ny) && !(nx === tx && ny === ty)) continue;
        prev.set(key, [x, y]);
        queue.push([nx, ny]);
      }
    }
    if (!prev.has(`${tx},${ty}`)) return [];
    const steps = [];
    let current = [tx, ty];
    while (current) {
      steps.push({ x: current[0], y: current[1] });
      current = prev.get(`${current[0]},${current[1]}`);
    }
    return steps.reverse();
  }

  autoRetreat() {
    if (this.player.moving || this.input.dirX !== 0 || this.input.dirY !== 0) return false;
    if (this.world.map.safe) return false;
    const portal = this.world.portals.find(item => MAPS[item.to]?.safe) || this.world.portals[0];
    if (portal && this.autoPathStep(portal.x, portal.y)) return true;
    // 退路被怪物堵住时，按忽略怪物的路径靠近，先清掉挡路的敌人
    if (portal && this.autoPathStep(portal.x, portal.y, true)) return true;
    const enemy = this.findNearestEnemy(8);
    if (enemy) return !!this.autoStepAway(enemy);
    return false;
  }

  autoShouldTurnIn(ratio) {
    if (ratio < 0.5 || this.world.map.safe || this.findNearestEnemy(5)) return false;
    return this.pendingTurnIn();
  }

  pendingTurnIn() {
    return Object.values(NPCS).some(npc => {
      if (!npc.quest || npc.map !== 'town') return false;
      const state = this.quests.states[npc.quest];
      return state && state.status !== 'turnedIn' && this.quests.isComplete(npc.quest);
    });
  }

  mapMaxEnemyLevel(mapId) {
    return (MAPS[mapId]?.enemies || []).reduce((max, type) => Math.max(max, ENEMIES[type]?.lvl || 0), 0);
  }

  autoRestockTrip(ratio) {
    this.autoRestoreWeapon();
    if (this.autoRestocking) {
      this.setAutoStatus('回城换装');
      return this.autoRetreat();
    }
    if (this.autoRestockCooldown > 0) return false;
    if (ratio < 0.65 || this.findNearestEnemy(4) || (!this.autoNeedsGear() && !this.autoNeedsTool())) return false;
    if (this.world.currentMapId === 'dungeon') return false;
    this.autoRestocking = true;
    this.autoRestockCooldown = 120;
    this.setAutoStatus('回城换装');
    return this.autoRetreat();
  }

  autoAdvanceMap(ratio) {
    if (this.autoRestocking || (this.autoMode === 'all' && this.pendingTurnIn())) return false;
    if (ratio < 0.7 || this.findAdjacentEnemy()) return false;
    const currentId = this.world.currentMapId;
    const currentMax = this.mapMaxEnemyLevel(currentId);
    if (!currentMax || this.player.level < currentMax + 3) return false;
    if (this.autoMode === 'all' && this.killQuestBlocksAdvance(currentId)) return false;
    const portal = this.world.portals.find(item => {
      const next = MAPS[item.to];
      if (!next || next.safe) return false;
      const nextMax = this.mapMaxEnemyLevel(item.to);
      return nextMax > currentMax && this.player.level >= nextMax - 4;
    });
    if (!portal) return false;
    this.setAutoStatus('前往新地图');
    return this.autoPathStep(portal.x, portal.y);
  }

  killQuestBlocksAdvance(mapId) {
    const types = MAPS[mapId]?.enemies || [];
    return Object.entries(QUESTS).some(([id, quest]) => quest.type === 'kill'
      && types.includes(quest.target)
      && this.quests.states[id]?.status === 'active');
  }

  autoSafeTasks() {
    this.autoRestoreWeapon();
    if (this.player.hp / this.player.maxHp < 0.75) return false;
    if (this.autoMode === 'all') {
      const questNpc = this.autoQuestTarget();
      if (questNpc) {
        if (distCheb(this.player, questNpc) <= 1) {
          this.setAutoStatus('任务');
          return this.autoAdvanceQuest(questNpc);
        }
        const moving = this.autoApproach(questNpc.x, questNpc.y);
        if (moving) this.setAutoStatus('任务');
        return moving;
      }
    }
    const needsShop = this.autoNeedsSupplies() || this.autoNeedsTool() || this.autoNeedsFishingRod()
      || this.autoNeedsEquipment() || this.autoJunkItems().length;
    if (needsShop) {
      const merchant = this.world.npcs.find(npc => npc.shop);
      if (merchant) {
        if (distCheb(this.player, merchant) <= 1) {
          const acted = this.autoBuySupplies() || this.autoBuyFishingRod() || this.autoBuyTool()
            || this.autoBuyEquipment() || this.autoSellJunk();
          if (acted) this.setAutoStatus('补给');
          return acted;
        }
        const moving = this.autoApproach(merchant.x, merchant.y);
        if (moving) this.setAutoStatus('补给');
        return moving;
      }
    }
    if (this.autoMode === 'fish' || this.autoMode === 'gather') {
      const items = this.autoGatherItems();
      if (this.tryAutoGather(items) || this.autoSeekGather()) {
        this.setAutoStatus(this.autoGatherLabel());
        return true;
      }
    }
    if (this.autoMode === 'all' && this.autoGatherNeeds().has('fish')
      && (this.tryAutoGather() || this.autoSeekGather())) {
      this.setAutoStatus('钓鱼');
      return true;
    }
    if (this.autoShouldVisitBeach()) {
      const portal = this.world.portals.find(item => item.to === 'beach');
      if (portal) {
        const moving = this.autoPathStep(portal.x, portal.y);
        if (moving) this.setAutoStatus('去海滩');
        return moving;
      }
    }
    return false;
  }

  autoQuestTarget() {
    return this.world.npcs.find(npc => {
      if (!npc.quest) return false;
      const state = this.quests.states[npc.quest];
      if (!state) return true;
      return state.status !== 'turnedIn' && this.quests.isComplete(npc.quest);
    }) || null;
  }

  autoAdvanceQuest(npc) {
    const before = this.quests.states[npc.quest]?.status;
    this.startDialogue(npc);
    if (!this.dialogue) return false;
    this.advanceDialogue();
    const turnedIn = before !== 'turnedIn' && this.quests.states[npc.quest]?.status === 'turnedIn';
    if (this.dialogue) this.advanceDialogue();
    if (turnedIn) {
      const rewardItems = QUESTS[npc.quest]?.reward?.items || {};
      Object.keys(rewardItems).forEach(id => this.autoEquipBetter(id));
    }
    return true;
  }

  autoApproach(x, y) {
    const approaches = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
      .filter(pos => this.world.isWalkable(pos.x, pos.y, this.player))
      .sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y)
        - Math.hypot(b.x - this.player.x, b.y - this.player.y));
    for (const pos of approaches) {
      if (this.autoPathStep(pos.x, pos.y)) return true;
    }
    return false;
  }

  autoSupplyTargets() {
    const bossPrep = this.player.level >= 18
      && (this.quests.states.q_dragon?.status === 'active' || this.world.currentMapId === 'dungeon');
    return { hp: bossPrep ? 8 : 3, mp: bossPrep ? 3 : 1 };
  }

  autoNeedsSupplies() {
    const p = this.player;
    const target = this.autoSupplyTargets();
    const hpCount = this.healOptions().reduce((sum, id) => sum + p.countItem(id), 0);
    const mpCount = this.manaOptions().reduce((sum, id) => sum + p.countItem(id), 0);
    const needHp = hpCount < target.hp && p.gold >= ITEMS.hp_potion.price;
    const needMp = p.level >= 5 && mpCount < target.mp && p.gold >= ITEMS.mp_potion.price;
    return needHp || needMp;
  }

  autoBuySupplies() {
    if (this.autoShopCooldown > 0) return true;
    const p = this.player;
    const target = this.autoSupplyTargets();
    const hpCount = this.healOptions().reduce((sum, id) => sum + p.countItem(id), 0);
    const mpCount = this.manaOptions().reduce((sum, id) => sum + p.countItem(id), 0);
    if (hpCount < target.hp && p.gold >= ITEMS.hp_potion.price) {
      this.buyItem('hp_potion');
      this.autoShopCooldown = 0.6;
      return true;
    }
    if (p.level >= 5 && mpCount < target.mp && p.gold >= ITEMS.mp_potion.price) {
      this.buyItem('mp_potion');
      this.autoShopCooldown = 0.6;
      return true;
    }
    return false;
  }

  equipmentUpgrades() {
    const p = this.player;
    const budget = p.gold - (50 + p.level * 3);
    if (budget <= 0) return [];
    const best = new Map();
    for (const id of SHOP_ITEMS) {
      const item = ITEMS[id];
      if (!item?.slot || item.tool || item.price > budget) continue;
      if (p.countItem(id) > 0) continue;
      const current = p.equipment[item.slot];
      if (current && this.itemScore(id) <= this.itemScore(current)) continue;
      const picked = best.get(item.slot);
      if (!picked || this.itemScore(id) > this.itemScore(picked)) best.set(item.slot, id);
    }
    return [...best.values()].sort((a, b) => ITEMS[a].price - ITEMS[b].price);
  }

  autoNeedsEquipment() {
    return this.equipmentUpgrades().length > 0;
  }

  // 只有武器/护甲升级才值得中断战斗长途回城，饰品留到回城补给时再买
  autoNeedsGear() {
    return this.equipmentUpgrades().some(id => ['weapon', 'armor'].includes(ITEMS[id]?.slot));
  }

  autoBuyEquipment() {
    if (this.autoShopCooldown > 0) return false;
    const [id] = this.equipmentUpgrades();
    if (!id) return false;
    const goldBefore = this.player.gold;
    this.buyItem(id);
    if (this.player.gold === goldBefore) return false;
    this.autoEquipBetter(id);
    this.autoShopCooldown = 0.6;
    return true;
  }

  autoGatherNeeds() {
    const needs = new Set();
    for (const [id, quest] of Object.entries(QUESTS)) {
      if (quest.type !== 'gather') continue;
      const state = this.quests.states[id];
      if (!state || state.status !== 'active' || this.quests.isComplete(id)) continue;
      needs.add(quest.target);
    }
    return needs;
  }

  autoGatherItems() {
    switch (this.autoMode) {
      case 'chop': return ['wood'];
      case 'mine': return ['copper_ore', 'iron_ore', 'gold_ore', 'stone'];
      case 'fish': return ['fish'];
      case 'gather': return ['wood', 'copper_ore', 'iron_ore', 'gold_ore', 'stone', 'fish'];
      case 'combat': return [];
      default: return [...this.autoGatherNeeds()];
    }
  }

  autoGatherLabel() {
    return { chop: '砍树', mine: '挖矿', fish: '钓鱼', gather: '采集' }[this.autoMode] || '采集';
  }

  autoGatherToolReady(itemId) {
    const tool = GATHER_TOOLS[itemId];
    return !tool || this.ownsTool(tool);
  }

  autoNeededToolItem() {
    const p = this.player;
    const tools = new Set();
    for (const itemId of this.autoGatherItems()) {
      if (GATHER_TOOLS[itemId]) tools.add(GATHER_TOOLS[itemId]);
    }
    for (const tool of tools) {
      if (this.ownsTool(tool)) continue;
      const shopId = SHOP_ITEMS.find(id => ITEMS[id]?.tool === tool);
      if (!shopId || p.gold < ITEMS[shopId].price) continue;
      return shopId;
    }
    return null;
  }

  ownsTool(tool) {
    const p = this.player;
    if (ITEMS[p.equipment.weapon]?.tool === tool) return true;
    return Object.keys(p.inventory).some(id => ITEMS[id]?.tool === tool && p.countItem(id) > 0);
  }

  autoNeedsFishingRod() {
    if (this.autoMode === 'fish' || this.autoMode === 'gather') {
      return !this.ownsTool('rod') && this.player.gold >= ITEMS.fishing_rod.price;
    }
    if (this.quests.states.q_fish?.status === 'turnedIn') return false;
    if (this.ownsTool('rod')) return false;
    return this.player.gold >= ITEMS.fishing_rod.price;
  }

  autoBuyFishingRod() {
    if (this.autoShopCooldown > 0 || !this.autoNeedsFishingRod()) return false;
    this.buyItem('fishing_rod');
    this.autoShopCooldown = 0.6;
    return true;
  }

  autoShouldVisitBeach() {
    if (this.autoMode !== 'all') return false;
    if (this.world.currentMapId !== 'town') return false;
    if (this.quests.states.q_fish?.status === 'turnedIn') return false;
    return this.ownsTool('rod');
  }

  autoNeedsTool() {
    return !!this.autoNeededToolItem();
  }

  autoBuyTool() {
    if (this.autoShopCooldown > 0) return false;
    const id = this.autoNeededToolItem();
    if (!id) return false;
    const goldBefore = this.player.gold;
    this.buyItem(id);
    if (this.player.gold === goldBefore) return false;
    this.autoShopCooldown = 0.6;
    return true;
  }

  autoJunkItems() {
    const p = this.player;
    return Object.keys(p.inventory).filter(id => {
      const item = ITEMS[id];
      if (!item?.slot || item.tool || p.countItem(id) <= 0) return false;
      const current = p.equipment[item.slot];
      return !current || this.itemScore(id) <= this.itemScore(current);
    });
  }

  autoSellJunk() {
    if (this.autoShopCooldown > 0) return false;
    const [id] = this.autoJunkItems();
    if (!id) return false;
    this.sellItem(id);
    this.autoShopCooldown = 0.6;
    return true;
  }

  autoLeaveSafeZone() {
    if (this.player.moving) return;
    const ratio = this.player.hp / this.player.maxHp;
    if (ratio < 0.75) {
      if (this.canUseHealSkill()) this.useActiveSkill('heal');
      else this.drinkHealPotion();
      return;
    }
    if (this.autoMode !== 'all' && this.autoMode !== 'combat') {
      if (this.autoTravelForGather(this.autoGatherItems())) return;
    }
    const portal = this.world.portals.find(item => MAPS[item.to] && !MAPS[item.to].safe)
      || this.world.portals.find(item => item.to === 'town' && item.to !== this.world.currentMapId);
    if (portal) this.autoPathStep(portal.x, portal.y);
  }

  tryAutoHeal() {
    const p = this.player;
    if (this.autoPotionCooldown > 0) return false;
    const threat = this.threatCount(3);
    const threshold = threat >= 2 ? 0.62 : threat === 1 ? 0.5 : 0.4;
    if (p.hp / p.maxHp >= threshold) return false;
    if (this.canUseHealSkill() && this.useActiveSkill('heal')) {
      this.autoPotionCooldown = 1;
      return true;
    }
    return this.drinkHealPotion();
  }

  drinkHealPotion() {
    if (this.autoPotionCooldown > 0) return false;
    const p = this.player;
    const options = this.healOptions();
    if (!options.length) return false;
    const deficit = p.maxHp - p.hp;
    const pick = options.find(id => ITEMS[id].heal >= deficit * 0.8) || options[options.length - 1];
    if (!p.useItem(pick)) return false;
    sfx.heal();
    this.ui.log(`自动使用${ITEMS[pick].name}`, 'good');
    this.autoPotionCooldown = 1.2;
    return true;
  }

  manaOptions() {
    return Object.keys(this.player.inventory)
      .filter(id => ITEMS[id]?.type === 'consumable' && ITEMS[id].mana > 0 && (this.player.inventory[id] || 0) > 0)
      .sort((a, b) => ITEMS[a].mana - ITEMS[b].mana);
  }

  tryAutoRestoreMp() {
    const p = this.player;
    if (this.autoManaCooldown > 0 || p.mp / p.maxMp >= 0.4 || this.world.map.safe) return false;
    const options = this.manaOptions();
    if (!options.length) return false;
    const deficit = p.maxMp - p.mp;
    const pick = options.find(id => ITEMS[id].mana >= deficit * 0.8) || options[options.length - 1];
    if (!p.useItem(pick)) return false;
    this.ui.log(`自动使用${ITEMS[pick].name}`, 'good');
    this.autoManaCooldown = 1.2;
    return true;
  }

  itemScore(id) {
    const item = ITEMS[id];
    if (!item) return 0;
    return (item.atk || 0) + (item.def || 0) + (item.maxHp || 0) / 10 + (item.maxMp || 0) / 20;
  }

  autoEquipBetter(id) {
    const item = ITEMS[id];
    if (!item?.slot || item.tool) return false;
    const current = this.player.equipment[item.slot];
    if (current && this.itemScore(id) <= this.itemScore(current)) return false;
    if (!this.player.equip(id)) return false;
    this.setAutoStatus('换装');
    this.ui.log(`自动装备${item.name}`, 'good');
    return true;
  }

  tryAutoGather(items = null) {
    if (this.gatherCooldown > 0 || this.player.moving) return false;
    for (const pos of this.gatherTargets()) {
      const props = TILE_PROPS[pos.tile];
      if (!props) continue;
      if (this.world.map.safe && !props.fish) continue;
      if (items && !props.chest && !items.some(itemId => this.gatherTileMatches(pos.tile, itemId))) continue;
      if (props.chest) {
        this.faceTarget(pos);
        this.gather(pos);
        return true;
      }
      const tool = props.chop ? 'axe' : props.mine ? 'pick' : props.fish ? 'rod' : null;
      if (!tool || !this.autoUseTool(tool)) continue;
      this.faceTarget(pos);
      this.gather(pos);
      return true;
    }
    return false;
  }

  autoSeekGather() {
    if (this.autoMode === 'all' && this.threatCount(2) > 0) return false;
    const node = this.pickGatherNode();
    if (!node) return false;
    this.setAutoStatus(this.autoGatherLabel());
    const p = this.player;
    if (p.x === node.standX && p.y === node.standY) return this.gatherCooldown > 0;
    return this.autoPathStep(node.standX, node.standY);
  }

  gatherTileMatches(tile, itemId) {
    const props = TILE_PROPS[tile];
    if (!props) return false;
    if (itemId === 'wood') return !!props.chop;
    if (itemId === 'fish') return !!props.fish;
    const mine = itemId.endsWith('_ore') ? itemId.slice(0, -4) : itemId;
    return props.mine === mine;
  }

  pickGatherNode() {
    const needList = this.autoGatherItems();
    if (!needList.length) return null;
    const p = this.player;
    const dist = new Map([[`${p.x},${p.y}`, 0]]);
    const queue = [[p.x, p.y]];
    for (let head = 0; head < queue.length; head++) {
      const [x, y] = queue[head];
      const d = dist.get(`${x},${y}`);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (dist.has(key) || !TILE_PROPS[this.world.getTile(nx, ny)]?.walk) continue;
        if (this.world.getPortalAt(nx, ny)) continue;
        dist.set(key, d + 1);
        queue.push([nx, ny]);
      }
    }
    let best = null;
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        const tile = this.world.getTile(x, y);
        const tileProps = TILE_PROPS[tile];
        if (!tileProps) continue;
        if (this.world.map.safe && !tileProps.fish) continue;
        if (!needList.some(itemId => this.gatherTileMatches(tile, itemId) && this.autoGatherToolReady(itemId))) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const standX = x + dx;
          const standY = y + dy;
          const d = dist.get(`${standX},${standY}`);
          if (d === undefined) continue;
          if (!best || d < best.distance) best = { x, y, standX, standY, distance: d };
        }
      }
    }
    return best;
  }

  mapHasGatherTarget(mapId, items) {
    const map = MAPS[mapId];
    if (!map) return false;
    for (const row of map.rows) {
      for (const tile of row) {
        if (items.some(itemId => this.gatherTileMatches(tile, itemId))) return true;
      }
    }
    return false;
  }

  mapLevelAllowed(mapId) {
    const map = MAPS[mapId];
    if (!map || map.safe) return true;
    const max = this.mapMaxEnemyLevel(mapId);
    return !max || this.player.level >= max - 4;
  }

  autoTravelForGather(items) {
    const ready = items.filter(itemId => this.autoGatherToolReady(itemId));
    if (!ready.length) return false;
    const start = this.world.currentMapId;
    const prev = new Map([[start, null]]);
    const queue = [start];
    let goal = null;
    for (let head = 0; head < queue.length && !goal; head++) {
      const mapId = queue[head];
      for (const portal of MAPS[mapId]?.portals || []) {
        const to = portal.to;
        if (prev.has(to) || !this.mapLevelAllowed(to)) continue;
        prev.set(to, { map: mapId, portal });
        if (this.mapHasGatherTarget(to, ready)) {
          goal = to;
          break;
        }
        queue.push(to);
      }
    }
    if (!goal) return false;
    let step = prev.get(goal);
    while (step && step.map !== start) step = prev.get(step.map);
    if (!step || step.map !== start) return false;
    const moving = this.autoPathStep(step.portal.x, step.portal.y);
    if (moving) this.setAutoStatus('前往采集点');
    return moving;
  }

  autoUseTool(tool) {
    const p = this.player;
    const equipped = ITEMS[p.equipment.weapon];
    if (equipped?.tool === tool) return true;
    const candidates = Object.keys(p.inventory)
      .filter(id => ITEMS[id]?.tool === tool && p.countItem(id) > 0)
      .sort((a, b) => (ITEMS[b].atk || 0) - (ITEMS[a].atk || 0));
    if (!candidates.length) return false;
    const current = p.equipment.weapon;
    if (this.autoWeaponBeforeTool === null && current && !ITEMS[current]?.tool) {
      this.autoWeaponBeforeTool = current;
    }
    if (!p.equip(candidates[0])) return false;
    this.setAutoStatus('换装');
    this.ui.log(`切换工具：${ITEMS[candidates[0]].name}`, 'good');
    return true;
  }

  autoRestoreWeapon() {
    const p = this.player;
    if (!ITEMS[p.equipment.weapon]?.tool) {
      this.autoWeaponBeforeTool = null;
      return false;
    }
    const previous = this.autoWeaponBeforeTool;
    this.autoWeaponBeforeTool = null;
    if (previous && p.countItem(previous) > 0 && p.equip(previous)) {
      this.ui.log(`换回${ITEMS[previous].name}`, 'good');
      return true;
    }
    const best = Object.keys(p.inventory)
      .filter(id => ITEMS[id]?.slot === 'weapon' && !ITEMS[id].tool && p.countItem(id) > 0)
      .sort((a, b) => (ITEMS[b].atk || 0) - (ITEMS[a].atk || 0))[0];
    if (best && p.equip(best)) this.ui.log(`换回${ITEMS[best].name}`, 'good');
    return false;
  }

  autoStepToward(enemy) {
    if (this.player.moving || this.input.dirX !== 0 || this.input.dirY !== 0) return false;
    if (this.time < (this.autoUnreachable.get(enemy.id) || 0)) return false;
    const approaches = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => ({ x: enemy.x + dx, y: enemy.y + dy }))
      .filter(pos => this.world.isWalkable(pos.x, pos.y, this.player))
      .sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y)
        - Math.hypot(b.x - this.player.x, b.y - this.player.y));
    for (const pos of approaches) {
      if (this.autoPathStep(pos.x, pos.y)) return true;
    }
    if (this.autoRepathCooldown > 0) return false;
    const dx = Math.sign(enemy.x - this.player.x);
    const dy = Math.sign(enemy.y - this.player.y);
    if (!dx && !dy) return false;
    const horizontalFirst = Math.abs(enemy.x - this.player.x) >= Math.abs(enemy.y - this.player.y);
    const moves = horizontalFirst ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
    for (const [mx, my] of moves) {
      if ((mx || my) && this.autoMove(mx, my)) return true;
    }
    this.autoUnreachable.set(enemy.id, this.time + 2);
    return false;
  }

  autoStepAway(enemy) {
    if (this.player.moving || this.input.dirX !== 0 || this.input.dirY !== 0) return;
    const dx = -Math.sign(enemy.x - this.player.x);
    const dy = -Math.sign(enemy.y - this.player.y);
    const moves = [[dx, 0], [0, dy], [dx || 1, 0], [0, dy || 1]];
    for (const [mx, my] of moves) {
      if ((mx || my) && this.autoMove(mx, my)) return;
    }
  }

  autoMove(mx, my, allowPortal = false) {
    const nx = this.player.x + mx;
    const ny = this.player.y + my;
    if (!this.world.isWalkable(nx, ny, this.player)) return false;
    if (!allowPortal && this.world.getPortalAt(nx, ny)) return false;
    this.player.dir = mx !== 0 ? (mx > 0 ? 'right' : 'left') : (my > 0 ? 'down' : 'up');
    this.player.targetX = nx;
    this.player.targetY = ny;
    this.player.targetPx = nx;
    this.player.targetPy = ny;
    this.player.moving = true;
    this.player.animFrame++;
    return true;
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
      sfx.heal();
      success = true;
    } else if (id === 'shield') {
      this.player.shieldTime = 5;
      this.ui.log('护盾展开：受到伤害降低 50%', 'good');
      sfx.shield();
      success = true;
    } else if (id === 'power_strike') success = powerStrike(this, this.findAdjacentEnemy());
    else if (id === 'fireball') {
      sfx.fire();
      success = fireball(this, this.findNearestEnemy(7));
    } else if (id === 'whirlwind') success = whirlwind(this);

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
    const crit = label === '暴击';
    const actual = enemy.takeDamage(damage);
    this.addEffect({ type: 'text', x: enemy.px, y: enemy.py, text: `${crit ? '暴击 ' : ''}-${actual}`, color, duration: 0.75 });
    this.ui.log(`${label}：对${enemy.name}造成 ${actual} 点伤害`, crit ? 'crit' : 'info');
    if (crit) {
      sfx.crit();
      this.renderer.shake(7, 0.2);
      this.hitStop = 0.07;
    } else {
      sfx.hit();
      this.renderer.shake(3.5, 0.12);
      this.hitStop = 0.045;
    }
    if (enemy.dead) this.onEnemyKilled(enemy);
  }

  onEnemyKilled(enemy) {
    const loot = enemy.dropLoot();
    this.player.gold += loot.gold;
    this.stats.kills += 1;
    if (enemy.elite) this.stats.elites += 1;
    if (enemy.boss) this.stats.bosses += 1;
    if (enemy.type === 'frost_beast') this.stats.frostBeast += 1;
    this.stats.goldEarned += loot.gold;
    loot.items.forEach(item => this.world.addItemDrop(item.id, item.qty, enemy.x, enemy.y));
    const levels = this.player.gainXp(enemy.xp);
    this.player.gainSkillXp('attack', Math.max(4, Math.round(enemy.xp / 4)));
    this.quests.onKill(enemy.type);
    sfx.kill();
    this.renderer.shake(5, 0.18);
    this.addEffect({ type: 'burst', x: enemy.px, y: enemy.py, color: '#ffd77a', duration: 0.4 });
    this.addEffect({ type: 'text', x: enemy.px, y: enemy.py - 0.4, text: `+${loot.gold}G`, color: '#f2cf6c', duration: 0.9 });
    this.ui.log(`击败${enemy.name}，获得 ${enemy.xp} 经验、${loot.gold} 金币`, 'good');
    if (levels) this.onLevelUp(levels);
    if (enemy.boss) this.ui.toast(enemy.type === 'dragon' ? '巨龙已被击败！你成为了屠龙勇士！' : `${enemy.name}已被击败！`, 'good');
    this.checkAchievements();
  }

  trackMap() {
    const id = this.world.currentMapId;
    if (id && !this.stats.maps.includes(id)) this.stats.maps.push(id);
  }

  statValue(stat) {
    if (stat === 'level') return this.player.level;
    if (stat === 'maps') return this.stats.maps.length;
    return this.stats[stat] || 0;
  }

  checkAchievements() {
    if (!this.ui || !this.stats) return;
    Object.entries(ACHIEVEMENTS).forEach(([id, def]) => {
      if (this.achievements.includes(id)) return;
      if (this.statValue(def.stat) < def.target) return;
      this.unlockAchievement(id, def);
    });
  }

  unlockAchievement(id, def) {
    this.achievements.push(id);
    const reward = def.reward || {};
    if (reward.gold) {
      this.player.gold += reward.gold;
      this.stats.goldEarned += reward.gold;
    }
    if (reward.xp) {
      const levels = this.player.gainXp(reward.xp);
      if (levels) this.onLevelUp(levels);
    }
    Object.entries(reward.items || {}).forEach(([itemId, qty]) => this.player.addItem(itemId, qty));
    const parts = [];
    if (reward.gold) parts.push(`${reward.gold} 金币`);
    if (reward.xp) parts.push(`${reward.xp} 经验`);
    Object.entries(reward.items || {}).forEach(([itemId, qty]) => parts.push(`${ITEMS[itemId].name}×${qty}`));
    this.ui.toast(`成就解锁：${def.name}`, 'good');
    this.ui.log(`🏆 成就解锁：${def.name}（${parts.join('、') || '荣誉'}）`, 'good');
    sfx.levelup();
    this.save();
  }

  onLevelUp(levels) {
    this.ui.toast(`升级！当前等级 ${this.player.level}，生命与法力已恢复`, 'good');
    sfx.levelup();
    this.addEffect({ type: 'burst', x: this.player.px, y: this.player.py, color: '#ffe08a', duration: 0.6 });
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
    this.retaliateTarget = enemy;
    this.retaliateTime = 6;
    sfx.hurt();
    this.renderer.shake(7, 0.22);
    this.hitStop = 0.06;
    if (this.player.dead) {
      this.player.moving = false;
      this.stats.deaths += 1;
      this.deathTimer = 1.5;
      this.input.reset();
      sfx.death();
      this.ui.toast('你倒下了……即将返回黎明村', 'bad');
    }
  }

  respawn() {
    const lost = Math.floor(this.player.gold * 0.1);
    this.player.gold -= lost;
    this.world.loadMap('town');
    this.syncPlayerToSpawn();
    this.cancelClickMove();
    this.player.dead = false;
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;
    this.player.invulnTime = 2;
    this.fade = 0.45;
    this.pathCache = null;
    this.autoUnreachable.clear();
    this.autoRoamTarget = null;
    this.renderer.snapCamera();
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

  gather(targetPos = null) {
    if (this.gatherCooldown > 0 || this.player.moving) return;
    const target = targetPos || this.gatherTargets().find(pos => {
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
      itemId = props.mine === 'stone' ? 'stone' : props.mine === 'frost' ? 'frost_crystal' : `${props.mine}_ore`;
      skillId = 'mining';
      xp = props.mine === 'gold' || props.mine === 'frost' ? 35 : props.mine === 'iron' ? 24 : 15;
    } else if (props.fish) {
      itemId = 'fish';
      skillId = 'fishing';
      xp = 14;
    }

    if (props.chest) {
      const mapId = this.world.currentMapId;
      const tier = { beach: 1, forest: 1, cave: 2, dungeon: 3, volcano: 4 }[mapId] || 1;
      const gold = rand(20 + tier * 25, 50 + tier * 60);
      const loot = [['hp_potion', 1]];
      if (tier >= 2) loot.push(['iron_ore', tier >= 3 ? 2 : 1]);
      if (tier >= 3) loot.push(['gold_ore', 1]);
      if (tier >= 4) loot.push(['fire_core', 1]);
      this.player.gold += gold;
      this.stats.chests += 1;
      this.stats.goldEarned += gold;
      loot.forEach(([id, qty]) => this.player.addItem(id, qty));
      const restore = { beach: TILE.SAND, cave: TILE.FLOOR, dungeon: TILE.FLOOR, volcano: TILE.FLOOR }[mapId] || TILE.GRASS;
      this.world.setTile(target.x, target.y, restore);
      const names = loot.map(([id, qty]) => `${ITEMS[id].name}×${qty}`).join('、');
      this.ui.toast(`打开宝箱：${gold} 金币、${names}`, 'good');
    } else {
      this.player.addItem(itemId, 1);
      if (itemId === 'wood') this.stats.wood += 1;
      else if (itemId === 'fish') this.stats.fish += 1;
      else if (itemId === 'frost_crystal') this.stats.frost += 1;
      else this.stats.ore += 1;
      const levels = this.player.gainSkillXp(skillId, xp);
      this.quests.onGather(itemId, 1);
      this.addEffect({ type: 'text', x: target.x, y: target.y, text: `+1 ${ITEMS[itemId].name}`, color: '#8fe69a', duration: 0.85 });
      this.ui.log(`获得 ${ITEMS[itemId].name} × 1`, 'good');
      if (levels) this.ui.toast(`${skillId === 'woodcut' ? '伐木' : skillId === 'mining' ? '采矿' : '钓鱼'}技能升级！`, 'good');
      if (!props.fish) {
        const replacement = ['cave', 'dungeon', 'volcano'].includes(this.world.currentMapId) ? TILE.FLOOR : TILE.GRASS;
        this.world.setTile(target.x, target.y, replacement);
        this.world.scheduleTileRespawn(target.x, target.y, target.tile);
      }
    }
    sfx.gather();
    this.renderer.shake(2, 0.1);
    if (this.auto) this.autoRestoreWeapon();
    this.checkAchievements();
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
      this.gather(chest);
      return;
    }
    this.ui.toast('附近没有可交互的对象');
  }

  startDialogue(npc) {
    if (this.player.moving) return;
    this.contactNpc = npc;
    this.dialogue = { npc, stage: 0 };
    this.autoDialogueTime = 0;
    sfx.menu();
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
        const levelBefore = this.player.level;
        const reward = this.quests.turnIn(npc.quest);
        this.stats.quests += 1;
        this.stats.goldEarned += reward.gold || 0;
        const rewardItems = Object.entries(reward.items || {})
          .map(([id, qty]) => `${ITEMS[id].name}×${qty}`)
          .join('、');
        this.dialogue.stage = 1;
        this.ui.showDialogue(npc.name, `做得好！这是你的奖励：${reward.gold || 0} 金币、${reward.xp || 0} 经验${rewardItems ? `、${rewardItems}` : ''}。`);
        this.ui.toast(`完成任务：${quest.name}`, 'good');
        if (this.player.level > levelBefore) this.onLevelUp(this.player.level - levelBefore);
        this.checkAchievements();
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
      if (this.auto) this.autoEquipBetter(picked.id);
      sfx.pickup();
      this.addEffect({ type: 'text', x: picked.x, y: picked.y, text: `+${picked.qty} ${ITEMS[picked.id].name}`, color: '#9ef0b0', duration: 0.8 });
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
      const item = ITEMS[id];
      if (item.heal || item.mana) sfx.heal();
      else sfx.pickup();
      this.ui.toast(`使用了${ITEMS[id].name}`, 'good');
      this.ui.refreshMenu();
      this.save();
    } else this.ui.toast('现在无法使用该物品', 'bad');
  }

  equipItem(id) {
    if (this.player.equip(id)) {
      sfx.menu();
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
    sfx.coin();
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
    sfx.coin();
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
    sfx.gather();
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
