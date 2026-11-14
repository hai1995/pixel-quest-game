import { ACTIVE_SKILLS, ITEMS, SKILL_DEFS, STARTER_EQUIP, STARTER_ITEMS } from './data.js';
import { clamp, deepClone, skillXpForLevel, xpForLevel } from './utils.js';

export class Player {
  constructor(x = 20, y = 14) {
    this.isPlayer = true;
    this.name = '勇者';
    this.mapId = 'town';
    this.level = 1;
    this.xp = 0;
    this.gold = 60;
    this.baseMaxHp = 100;
    this.baseMaxMp = 50;
    this.baseAtk = 8;
    this.baseDef = 2;
    this.hp = this.baseMaxHp;
    this.mp = this.baseMaxMp;
    this.inventory = deepClone(STARTER_ITEMS);
    this.equipment = deepClone(STARTER_EQUIP);
    this.skills = {};
    Object.keys(SKILL_DEFS).forEach(id => {
      this.skills[id] = { level: 1, xp: 0 };
    });
    this.skillCooldowns = {};
    this.dir = 'down';
    this.animFrame = 0;
    this.attackAnim = 0;
    this.hurtFlash = 0;
    this.shieldTime = 0;
    this.invulnTime = 0;
    this.dead = false;
    this.moveSpeed = 5.2;
    this.setTile(x, y);
  }

  setTile(x, y) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.targetX = x;
    this.targetY = y;
    this.targetPx = x;
    this.targetPy = y;
    this.moving = false;
  }

  equipmentBonus(key) {
    return Object.values(this.equipment).reduce((sum, id) => {
      const item = id ? ITEMS[id] : null;
      return sum + (item?.[key] || 0);
    }, 0);
  }

  get maxHp() {
    return this.baseMaxHp + (this.level - 1) * 8 + (this.skills.defense.level - 1) * 2 + this.equipmentBonus('maxHp');
  }

  get maxMp() {
    return this.baseMaxMp + (this.level - 1) * 4 + this.equipmentBonus('maxMp');
  }

  get atk() {
    return this.baseAtk + (this.level - 1) * 2 + Math.floor((this.skills.attack.level - 1) * 0.6) + this.equipmentBonus('atk');
  }

  get def() {
    return this.baseDef + Math.floor((this.level - 1) * 0.8) + Math.floor((this.skills.defense.level - 1) * 0.5) + this.equipmentBonus('def');
  }

  addItem(id, qty = 1) {
    if (!ITEMS[id] || qty <= 0) return;
    this.inventory[id] = (this.inventory[id] || 0) + qty;
  }

  removeItem(id, qty = 1) {
    if ((this.inventory[id] || 0) < qty) return false;
    this.inventory[id] -= qty;
    if (this.inventory[id] <= 0) delete this.inventory[id];
    return true;
  }

  countItem(id) {
    return this.inventory[id] || 0;
  }

  hasItems(mats) {
    return Object.entries(mats).every(([id, qty]) => this.countItem(id) >= qty);
  }

  useItem(id) {
    const item = ITEMS[id];
    if (!item || item.type !== 'consumable' || !this.countItem(id)) return false;
    if (item.heal && this.hp >= this.maxHp && !item.mana) return false;
    if (item.mana && this.mp >= this.maxMp && !item.heal) return false;
    if (!this.removeItem(id, 1)) return false;
    if (item.heal) this.heal(item.heal);
    if (item.mana) this.restoreMp(item.mana);
    return true;
  }

  equip(id) {
    const item = ITEMS[id];
    if (!item?.slot || !this.countItem(id)) return false;
    const slot = item.slot;
    const previous = this.equipment[slot];
    this.removeItem(id, 1);
    if (previous) this.addItem(previous, 1);
    this.equipment[slot] = id;
    this.hp = Math.min(this.hp, this.maxHp);
    this.mp = Math.min(this.mp, this.maxMp);
    return true;
  }

  unequip(slot) {
    const id = this.equipment[slot];
    if (!id) return false;
    this.addItem(id, 1);
    this.equipment[slot] = null;
    this.hp = Math.min(this.hp, this.maxHp);
    this.mp = Math.min(this.mp, this.maxMp);
    return true;
  }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  restoreMp(amount) {
    const before = this.mp;
    this.mp = Math.min(this.maxMp, this.mp + amount);
    return this.mp - before;
  }

  spendMp(amount) {
    if (this.mp < amount) return false;
    this.mp -= amount;
    return true;
  }

  gainXp(amount) {
    this.xp += Math.max(0, Math.floor(amount));
    let levels = 0;
    while (this.xp >= xpForLevel(this.level)) {
      this.xp -= xpForLevel(this.level);
      this.level++;
      levels++;
    }
    if (levels) {
      this.hp = this.maxHp;
      this.mp = this.maxMp;
    }
    return levels;
  }

  gainSkillXp(id, amount) {
    const skill = this.skills[id];
    if (!skill) return 0;
    skill.xp += Math.max(0, Math.floor(amount));
    let levels = 0;
    while (skill.xp >= skillXpForLevel(skill.level)) {
      skill.xp -= skillXpForLevel(skill.level);
      skill.level++;
      levels++;
    }
    this.hp = Math.min(this.hp, this.maxHp);
    return levels;
  }

  hasActiveSkill(id) {
    return !!ACTIVE_SKILLS[id] && this.level >= ACTIVE_SKILLS[id].unlock;
  }

  takeDamage(amount) {
    if (this.invulnTime > 0 || this.dead) return 0;
    const actual = Math.max(1, Math.round(amount * (this.shieldTime > 0 ? 0.5 : 1)));
    this.hp = Math.max(0, this.hp - actual);
    this.hurtFlash = 0.18;
    this.invulnTime = 0.28;
    if (this.hp <= 0) this.dead = true;
    return actual;
  }

  toSave() {
    return {
      name: this.name,
      mapId: this.mapId,
      x: this.x,
      y: this.y,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      hp: this.hp,
      mp: this.mp,
      inventory: deepClone(this.inventory),
      equipment: deepClone(this.equipment),
      skills: deepClone(this.skills),
      dir: this.dir,
    };
  }

  loadSave(save) {
    if (!save || typeof save !== 'object') return;
    this.name = save.name || '勇者';
    this.mapId = save.mapId || 'town';
    this.level = Math.max(1, save.level || 1);
    this.xp = Math.max(0, save.xp || 0);
    this.gold = Math.max(0, save.gold || 0);
    this.inventory = save.inventory ? deepClone(save.inventory) : deepClone(STARTER_ITEMS);
    this.equipment = { ...deepClone(STARTER_EQUIP), ...(save.equipment || {}) };
    Object.keys(SKILL_DEFS).forEach(id => {
      this.skills[id] = {
        level: Math.max(1, save.skills?.[id]?.level || 1),
        xp: Math.max(0, save.skills?.[id]?.xp || 0),
      };
    });
    this.dir = save.dir || 'down';
    this.hp = clamp(save.hp ?? this.maxHp, 1, this.maxHp);
    this.mp = clamp(save.mp ?? this.maxMp, 0, this.maxMp);
    this.dead = false;
    this.skillCooldowns = {};
    this.shieldTime = 0;
    this.invulnTime = 0;
    this.setTile(save.x ?? 20, save.y ?? 14);
  }
}
