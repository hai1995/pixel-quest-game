import { ACHIEVEMENTS, ACTIVE_SKILLS, ITEMS, MAPS, QUESTS, RECIPES, SETTINGS, SHOP_ITEMS, SKILL_DEFS } from './data.js';
import { skillXpForLevel } from './utils.js';
import { sfx } from './audio.js';

const menuShell = (title, body) => `
  <header class="menu-header"><h2>${title}</h2><button class="menu-close" aria-label="关闭">✕</button></header>
  <div class="menu-body">${body}</div>`;

const itemName = id => ITEMS[id]?.name || id;

export class UI {
  constructor(game) {
    this.game = game;
    this.currentMenu = null;
    this.menuData = null;
    this.overlay = document.getElementById('menu-overlay');
    this.window = document.getElementById('menu-window');
    this.dialogueBox = document.getElementById('dialogue-box');
    this.combatLog = document.getElementById('combat-log');
    this.toastLayer = document.getElementById('toast-layer');
    this.bindEvents();
    this.update();
  }

  bindEvents() {
    document.querySelectorAll('[data-menu]').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        this.game.toggleMenu(button.dataset.menu);
      });
    });
    this.overlay.addEventListener('click', event => {
      if (event.target === this.overlay) this.closeMenu();
    });
    this.window.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;
      const { action, id, slot } = button.dataset;
      if (action === 'use') this.game.useItem(id);
      else if (action === 'equip') this.game.equipItem(id);
      else if (action === 'unequip') this.game.unequipItem(slot);
      else if (action === 'craft') this.game.craft(id);
      else if (action === 'buy') this.game.buyItem(id);
      else if (action === 'sell') this.game.sellItem(id);
      else if (action === 'setting') this.game.toggleSetting(id);
    });
  }

  bindCloseButton() {
    const closeBtn = this.window.querySelector('.menu-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', event => {
        event.stopPropagation();
        this.closeMenu();
      });
      closeBtn.addEventListener('pointerdown', event => event.stopPropagation());
    }
  }

  update() {
    const p = this.game.player;
    const xpMax = Math.floor(100 * Math.pow(p.level, 1.5));
    const values = {
      'player-level': p.level,
      'player-gold': p.gold,
      'hp-text': `${Math.ceil(p.hp)} / ${p.maxHp}`,
      'mp-text': `${Math.ceil(p.mp)} / ${p.maxMp}`,
      'xp-text': `${p.xp} / ${xpMax}`,
      'map-name': this.game.world.map.name,
      'quest-count': this.game.quests.getActiveList().length,
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
    const bars = {
      'hp-bar': p.hp / p.maxHp * 100,
      'mp-bar': p.mp / p.maxMp * 100,
      'xp-bar': Math.min(100, p.xp / xpMax * 100),
    };
    Object.entries(bars).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.style.width = `${Math.max(0, Math.min(100, value))}%`;
    });
  }

  openMenu(type, data = null) {
    this.currentMenu = type;
    this.menuData = data;
    sfx.menu();
    this.renderMenu();
    this.overlay.classList.remove('hidden');
    this.game.input.keys.clear();
  }

  closeMenu() {
    if (!this.currentMenu) return;
    sfx.menu();
    this.currentMenu = null;
    this.menuData = null;
    this.overlay.classList.add('hidden');
  }

  refreshMenu() {
    if (this.currentMenu) this.renderMenu();
    this.update();
  }

  renderMenu() {
    switch (this.currentMenu) {
      case 'inventory': this.renderInventory(); break;
      case 'skills': this.renderSkills(); break;
      case 'character': this.renderCharacter(); break;
      case 'quests': this.renderQuests(); break;
      case 'map': this.renderMap(); break;
      case 'craft': this.renderCraft(); break;
      case 'shop': this.renderShop(); break;
      case 'achievements': this.renderAchievements(); break;
      case 'settings': this.renderSettings(); break;
      default: return;
    }
    this.bindCloseButton();
  }

  renderInventory() {
    const entries = Object.entries(this.game.player.inventory).filter(([id, qty]) => ITEMS[id] && qty > 0);
    const body = entries.length ? `<div class="item-grid">${entries.map(([id, qty]) => {
      const item = ITEMS[id];
      const usable = item.type === 'consumable' || item.slot;
      return `<article class="item-card">
        <div class="item-icon">${item.icon}</div>
        <div class="item-info"><strong>${item.name}</strong><span>${item.desc}</span><small>数量 ${qty} · ${item.price} 金币</small></div>
        ${usable ? `<button class="pixel-btn small" data-action="${item.slot ? 'equip' : 'use'}" data-id="${id}">${item.slot ? '装备' : '使用'}</button>` : ''}
      </article>`;
    }).join('')}</div>` : '<p class="empty">背包空空如也，去冒险吧。</p>';
    this.window.innerHTML = menuShell('背包', body);
  }

  renderSkills() {
    const p = this.game.player;
    const active = Object.entries(ACTIVE_SKILLS).map(([id, skill]) => {
      const unlocked = p.hasActiveSkill(id);
      return `<article class="skill-card ${unlocked ? '' : 'locked'}">
        <div class="skill-orb" style="--skill-color:${skill.color}">${unlocked ? '✦' : '🔒'}</div>
        <div><strong>${skill.name}</strong><p>${skill.desc}</p><small>${unlocked ? `消耗 ${skill.mp} MP` : `${skill.unlock} 级解锁`}</small></div>
      </article>`;
    }).join('');
    const passive = Object.entries(SKILL_DEFS).map(([id, def]) => {
      const skill = p.skills[id];
      const needed = skillXpForLevel(skill.level);
      return `<div class="passive-row"><span style="color:${def.color}">${def.name}</span><b>Lv.${skill.level}</b><div class="mini-bar"><i style="width:${Math.min(100, skill.xp / needed * 100)}%"></i></div><small>${skill.xp}/${needed}</small></div>`;
    }).join('');
    this.window.innerHTML = menuShell('技能', `<h3 class="section-title">主动技能</h3><div class="skill-list">${active}</div><h3 class="section-title">生活与战斗技能</h3><div class="passive-list">${passive}</div>`);
  }

  renderCharacter() {
    const p = this.game.player;
    const slotNames = { weapon: '武器', armor: '护甲', accessory: '饰品' };
    const equipment = Object.entries(slotNames).map(([slot, label]) => {
      const id = p.equipment[slot];
      return `<div class="equipment-row"><span>${label}</span><strong>${id ? `${ITEMS[id].icon} ${ITEMS[id].name}` : '未装备'}</strong>${id ? `<button class="text-btn" data-action="unequip" data-slot="${slot}">卸下</button>` : ''}</div>`;
    }).join('');
    this.window.innerHTML = menuShell('角色', `
      <div class="character-hero"><div class="portrait">勇</div><div><h3>${p.name}</h3><p>等级 ${p.level} · ${this.game.world.map.name}</p></div></div>
      <div class="stat-grid"><div>生命<b>${Math.ceil(p.hp)}/${p.maxHp}</b></div><div>法力<b>${Math.ceil(p.mp)}/${p.maxMp}</b></div><div>攻击<b>${p.atk}</b></div><div>防御<b>${p.def}</b></div><div>金币<b>${p.gold}</b></div><div>经验<b>${p.xp}</b></div></div>
      <h3 class="section-title">装备</h3><div class="equipment-list">${equipment}</div>`);
  }

  renderQuests() {
    const list = this.game.quests.getActiveList();
    const body = list.length ? list.map(quest => `<article class="quest-card ${quest.complete ? 'complete' : ''}"><div><h3>${quest.name}</h3><p>${quest.desc}</p><small>奖励：${quest.reward.gold || 0} 金币 · ${quest.reward.xp || 0} 经验</small></div><b>${quest.complete ? '可交付' : `${quest.progress}/${quest.qty}`}</b></article>`).join('') : '<p class="empty">还没有进行中的任务。寻找头顶有 ! 的村民。</p>';
    this.window.innerHTML = menuShell('任务日志', body);
  }

  renderMap() {
    const body = Object.entries(MAPS).map(([id, map]) => {
      const symbol = { town: '村', forest: '林', cave: '洞', dungeon: '龙', volcano: '熔', beach: '海' }[id] || '?';
      const desc = map.safe ? '安全区域，可以休整和交易' : id === 'dungeon' ? '高危区域，巨龙沉睡于此' : id === 'volcano' ? '终局区域，火焰元素与亚龙盘踞' : '危险区域，注意敌人与资源';
      return `<article class="map-card ${id === this.game.world.currentMapId ? 'current' : ''}"><div class="map-symbol">${symbol}</div><div><h3>${map.name}</h3><p>${desc}</p></div>${id === this.game.world.currentMapId ? '<b>当前位置</b>' : ''}</article>`;
    }).join('');
    this.window.innerHTML = menuShell('世界地图', `${body}<p class="hint">踏上地图边缘的紫色传送阵即可前往相邻区域。</p>`);
  }

  renderCraft() {
    const p = this.game.player;
    const body = RECIPES.map(recipe => {
      const unlocked = p.skills[recipe.skill].level >= recipe.lv;
      const canCraft = unlocked && p.hasItems(recipe.mats);
      const mats = Object.entries(recipe.mats).map(([id, qty]) => `<span class="${p.countItem(id) >= qty ? 'enough' : 'missing'}">${itemName(id)} ${p.countItem(id)}/${qty}</span>`).join('');
      return `<article class="recipe-card"><div><h3>${ITEMS[recipe.out].icon} ${recipe.name} × ${recipe.outQty}</h3><p>${SKILL_DEFS[recipe.skill].name} Lv.${recipe.lv} · ${mats}</p></div><button class="pixel-btn small" data-action="craft" data-id="${recipe.id}" ${canCraft ? '' : 'disabled'}>${unlocked ? '制作' : '未解锁'}</button></article>`;
    }).join('');
    this.window.innerHTML = menuShell('制作与锻造', body);
  }

  renderShop() {
    const p = this.game.player;
    const stock = SHOP_ITEMS.map(id => {
      const item = ITEMS[id];
      return `<article class="shop-row"><span class="item-icon">${item.icon}</span><div><strong>${item.name}</strong><small>${item.desc}</small></div><b>${item.price} G</b><button class="pixel-btn small" data-action="buy" data-id="${id}" ${p.gold < item.price ? 'disabled' : ''}>购买</button></article>`;
    }).join('');
    const sellable = Object.entries(p.inventory).filter(([id, qty]) => qty > 0 && ITEMS[id]?.price > 0);
    const sell = sellable.length ? sellable.map(([id, qty]) => {
      const item = ITEMS[id];
      const price = Math.max(1, Math.floor(item.price * 0.5));
      return `<article class="shop-row"><span class="item-icon">${item.icon}</span><div><strong>${item.name} × ${qty}</strong><small>出售 1 个</small></div><b>${price} G</b><button class="pixel-btn small secondary" data-action="sell" data-id="${id}">出售</button></article>`;
    }).join('') : '<p class="empty">没有可出售的物品。</p>';
    this.window.innerHTML = menuShell('村庄商店', `<div class="shop-balance">持有金币：<b>${p.gold} G</b></div><h3 class="section-title">购买</h3>${stock}<h3 class="section-title">出售</h3>${sell}`);
  }

  renderAchievements() {
    const game = this.game;
    const unlocked = new Set(game.achievements);
    const entries = Object.entries(ACHIEVEMENTS);
    const cards = entries.map(([id, ach]) => {
      const done = unlocked.has(id);
      const value = game.statValue(ach.stat);
      const pct = done ? 100 : Math.min(100, Math.round(value / ach.target * 100));
      const reward = [];
      if (ach.reward?.gold) reward.push(`${ach.reward.gold} 金币`);
      if (ach.reward?.xp) reward.push(`${ach.reward.xp} 经验`);
      Object.entries(ach.reward?.items || {}).forEach(([itemId, qty]) => reward.push(`${ITEMS[itemId]?.name || itemId}×${qty}`));
      return `<article class="achievement-card ${done ? 'done' : ''}">
        <div class="achievement-icon">${done ? '🏆' : '🔒'}</div>
        <div class="achievement-info">
          <strong>${ach.name}</strong>
          <span>${ach.desc}</span>
          <div class="mini-bar"><i style="width:${pct}%"></i></div>
          <small>${done ? '已达成' : `${Math.min(value, ach.target)}/${ach.target}`} · 奖励：${reward.join('、') || '荣誉'}</small>
        </div>
        <b class="achievement-state">${done ? '已解锁' : '进行中'}</b>
      </article>`;
    }).join('');
    const s = game.stats;
    const time = s.playtime >= 3600
      ? `${(s.playtime / 3600).toFixed(1)} 小时`
      : `${Math.floor(s.playtime / 60)} 分 ${Math.floor(s.playtime % 60)} 秒`;
    const stats = [
      ['击杀敌人', s.kills], ['精英击杀', s.elites], ['首领取胜', s.bosses],
      ['砍伐次数', s.wood], ['采矿次数', s.ore], ['钓鱼次数', s.fish],
      ['开启宝箱', s.chests], ['完成任务', s.quests], ['倒下次数', s.deaths],
      ['累计金币', s.goldEarned], ['探索地图', `${s.maps.length}/${Object.keys(MAPS).length}`], ['冒险时长', time],
    ].map(([label, value]) => `<div>${label}<b>${value}</b></div>`).join('');
    this.window.innerHTML = menuShell(`成就 ${unlocked.size}/${entries.length}`, `
      <h3 class="section-title">冒险统计</h3>
      <div class="stat-grid achievement-stats">${stats}</div>
      <h3 class="section-title">成就勋章</h3>
      <div class="achievement-list">${cards}</div>`);
  }

  renderSettings() {
    const rows = SETTINGS.map(item => {
      const on = !!this.game.settings[item.id];
      return `<div class="setting-row">
        <div class="setting-info"><strong>${item.name}</strong><span>${item.desc}</span></div>
        <button class="pixel-btn small ${on ? 'primary' : ''}" data-action="setting" data-id="${item.id}">${on ? '开启' : '关闭'}</button>
      </div>`;
    }).join('');
    this.window.innerHTML = menuShell('设置', `
      <div class="settings-list">${rows}</div>
      <p class="settings-note">设置即时生效，并保存在本机浏览器。</p>`);
  }

  showDialogue(name, text) {
    document.getElementById('dialogue-name').textContent = name;
    document.getElementById('dialogue-text').textContent = text;
    this.dialogueBox.classList.remove('hidden');
  }

  hideDialogue() {
    this.dialogueBox.classList.add('hidden');
  }

  log(message, type = 'info') {
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = message;
    this.combatLog.appendChild(line);
    while (this.combatLog.children.length > 7) this.combatLog.firstChild.remove();
    setTimeout(() => line.remove(), 5500);
  }

  toast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.toastLayer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  }
}
