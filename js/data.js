// data.js - 游戏数据定义

// 瓦片类型
export const TILE = {
  GRASS: 0, DIRT: 1, PATH: 2, WATER: 3, SAND: 4,
  TREE: 5, ROCK: 6, FLOWER: 7, BUSH: 8,
  WALL: 9, FLOOR: 10, DOOR: 11,
  ORE_COPPER: 12, ORE_IRON: 13, ORE_GOLD: 14,
  CHEST: 15, PORTAL: 16, BRIDGE: 17,
  WOOD_PILE: 18, STONE: 19, LAVA: 20,
};

// 瓦片属性：是否可通行、是否可采集、采集类型
export const TILE_PROPS = {
  [TILE.GRASS]:     { walk: true,  color: '#3a7d3a' },
  [TILE.DIRT]:      { walk: true,  color: '#8b6f47' },
  [TILE.PATH]:      { walk: true,  color: '#b8a06a' },
  [TILE.WATER]:     { walk: false, color: '#3a78c8', fish: true },
  [TILE.SAND]:      { walk: true,  color: '#e0d090' },
  [TILE.TREE]:      { walk: false, color: '#2d5a2d', chop: true },
  [TILE.ROCK]:      { walk: false, color: '#7a7a7a' },
  [TILE.FLOWER]:    { walk: true,  color: '#3a7d3a' },
  [TILE.BUSH]:      { walk: false, color: '#357a35', chop: true },
  [TILE.WALL]:      { walk: false, color: '#5a5a5a' },
  [TILE.FLOOR]:     { walk: true,  color: '#6b4a2a' },
  [TILE.DOOR]:      { walk: true,  color: '#8b5a2b' },
  [TILE.ORE_COPPER]:{ walk: false, color: '#b87333', mine: 'copper' },
  [TILE.ORE_IRON]:  { walk: false, color: '#a8a8b8', mine: 'iron' },
  [TILE.ORE_GOLD]:  { walk: false, color: '#ffd700', mine: 'gold' },
  [TILE.CHEST]:     { walk: false, color: '#8b5a2b', chest: true },
  [TILE.PORTAL]:    { walk: true,  color: '#9b59b6' },
  [TILE.BRIDGE]:    { walk: true,  color: '#8b6f47' },
  [TILE.WOOD_PILE]: { walk: false, color: '#8b5a2b', chop: true },
  [TILE.STONE]:     { walk: false, color: '#888', mine: 'stone' },
  [TILE.LAVA]:      { walk: false, color: '#c0392b' },
};

// 物品定义
export const ITEMS = {
  // 消耗品
  hp_potion:     { name: '生命药水', icon: '🧪', type: 'consumable', heal: 50,  price: 30,  desc: '恢复50点生命' },
  hp_potion_lg:  { name: '大型生命药水', icon: '🧪', type: 'consumable', heal: 150, price: 90,  desc: '恢复150点生命' },
  mp_potion:     { name: '法力药水', icon: '💧', type: 'consumable', mana: 30,  price: 25,  desc: '恢复30点法力' },
  mp_potion_lg:  { name: '大型法力药水', icon: '💧', type: 'consumable', mana: 100, price: 75, desc: '恢复100点法力' },
  bread:         { name: '面包', icon: '🍞', type: 'consumable', heal: 20,  price: 8,   desc: '恢复20点生命' },
  cooked_fish:   { name: '烤鱼', icon: '🐟', type: 'consumable', heal: 40,  price: 20,  desc: '恢复40点生命' },

  // 材料
  wood:          { name: '木材', icon: '🪵', type: 'material', price: 5,   desc: '基础木材' },
  stone:         { name: '石头', icon: '🪨', type: 'material', price: 4,   desc: '普通石头' },
  copper_ore:    { name: '铜矿', icon: '🟤', type: 'material', price: 12,  desc: '铜矿石' },
  iron_ore:      { name: '铁矿', icon: '⬜', type: 'material', price: 25,  desc: '铁矿石' },
  gold_ore:      { name: '金矿', icon: '🟡', type: 'material', price: 60,  desc: '金矿石' },
  fish:          { name: '生鱼', icon: '🐟', type: 'material', price: 6,   desc: '新鲜的鱼' },
  slime_gel:     { name: '史莱姆胶', icon: '🟢', type: 'material', price: 8,  desc: '黏糊糊的' },
  goblin_ear:    { name: '哥布林耳朵', icon: '👂', type: 'material', price: 10, desc: '战利品' },
  wolf_pelt:     { name: '狼皮', icon: '🐺', type: 'material', price: 20,  desc: '柔软的皮毛' },
  bat_wing:      { name: '蝙蝠翼', icon: '🦇', type: 'material', price: 15, desc: '薄如蝉翼' },
  bone:          { name: '骨头', icon: '🦴', type: 'material', price: 12,  desc: '亡灵遗物' },
  dragon_scale:  { name: '龙鳞', icon: '🐉', type: 'material', price: 200, desc: '坚硬的鳞片' },
  fire_core:     { name: '火焰核心', icon: '🔥', type: 'material', price: 120, desc: '仍在燃烧的元素核心' },
  magma_stone:   { name: '熔岩结晶', icon: '🪨', type: 'material', price: 70, desc: '凝固的炽热岩石' },

  // 武器
  wood_sword:    { name: '木剑', icon: '🗡️', type: 'weapon', atk: 5,  price: 50,  desc: '简陋的木剑', slot: 'weapon' },
  copper_sword:  { name: '铜剑', icon: '🗡️', type: 'weapon', atk: 12, price: 150, desc: '锋利的铜剑', slot: 'weapon' },
  iron_sword:    { name: '铁剑', icon: '⚔️', type: 'weapon', atk: 22, price: 400, desc: '坚固的铁剑', slot: 'weapon' },
  steel_sword:   { name: '钢剑', icon: '⚔️', type: 'weapon', atk: 30, price: 700, desc: '精钢锻造的利剑', slot: 'weapon' },
  gold_sword:    { name: '黄金剑', icon: '⚔️', type: 'weapon', atk: 38, price: 1000, desc: '闪耀的黄金剑', slot: 'weapon' },
  flame_sword:   { name: '烈焰剑', icon: '🔥', type: 'weapon', atk: 46, price: 1600, desc: '燃烧着永不熄灭的火焰', slot: 'weapon' },
  dragon_sword:  { name: '屠龙剑', icon: '🗡️', type: 'weapon', atk: 70, price: 5000, desc: '传说中的屠龙剑', slot: 'weapon', rare: true },

  wood_axe:      { name: '木斧', icon: '🪓', type: 'weapon', atk: 6,  price: 40,  desc: '可砍伐树木', slot: 'weapon', tool: 'axe' },
  iron_axe:      { name: '铁斧', icon: '🪓', type: 'weapon', atk: 18, price: 300, desc: '高效伐木工具', slot: 'weapon', tool: 'axe' },
  wood_pick:     { name: '木镐', icon: '⛏️', type: 'weapon', atk: 4,  price: 35,  desc: '可开采矿石', slot: 'weapon', tool: 'pick' },
  iron_pick:     { name: '铁镐', icon: '⛏️', type: 'weapon', atk: 15, price: 280, desc: '高效采矿工具', slot: 'weapon', tool: 'pick' },
  fishing_rod:   { name: '鱼竿', icon: '🎣', type: 'weapon', atk: 2,  price: 50,  desc: '可钓鱼', slot: 'weapon', tool: 'rod' },

  // 护甲
  cloth_armor:   { name: '布甲', icon: '🥋', type: 'armor', def: 3,  price: 60,  desc: '轻便的布甲', slot: 'armor' },
  leather_armor: { name: '皮甲', icon: '🦺', type: 'armor', def: 8,  price: 180, desc: '结实的皮甲', slot: 'armor' },
  iron_armor:    { name: '铁甲', icon: '🛡️', type: 'armor', def: 16, price: 500, desc: '坚固的铁甲', slot: 'armor' },
  steel_armor:   { name: '钢甲', icon: '🛡️', type: 'armor', def: 22, price: 800, desc: '精钢打造的护甲', slot: 'armor' },
  gold_armor:    { name: '金甲', icon: '🛡️', type: 'armor', def: 28, price: 1200,desc: '华丽的金甲', slot: 'armor' },
  magma_armor:   { name: '熔岩护甲', icon: '🌋', type: 'armor', def: 36, price: 2000, desc: '由熔岩结晶铸成的护甲', slot: 'armor' },
  dragon_armor:  { name: '龙鳞甲', icon: '🛡️', type: 'armor', def: 50, price: 6000,desc: '传说级护甲', slot: 'armor', rare: true },

  // 饰品
  copper_ring:   { name: '铜戒指', icon: '💍', type: 'accessory', atk: 2, def: 1, price: 100, desc: '简单的铜戒指', slot: 'accessory' },
  gold_ring:     { name: '金戒指', icon: '💍', type: 'accessory', atk: 5, def: 3, price: 400, desc: '精致的金戒指', slot: 'accessory' },
  amulet:        { name: '护身符', icon: '📿', type: 'accessory', maxHp: 30, maxMp: 10, price: 300, desc: '增加生命上限', slot: 'accessory' },

  // 钥匙
  dungeon_key:   { name: '地牢钥匙', icon: '🔑', type: 'key', price: 0, desc: '进入地牢的钥匙' },
};

// 合成配方
export const RECIPES = [
  { id: 'bread', out: 'bread', outQty: 1, mats: { wood: 1 }, name: '面包', skill: 'cooking', lv: 1 },
  { id: 'cooked_fish', out: 'cooked_fish', outQty: 1, mats: { fish: 1, wood: 1 }, name: '烤鱼', skill: 'cooking', lv: 5 },
  { id: 'copper_sword', out: 'copper_sword', outQty: 1, mats: { copper_ore: 3, wood: 1 }, name: '铜剑', skill: 'smithing', lv: 5 },
  { id: 'iron_sword', out: 'iron_sword', outQty: 1, mats: { iron_ore: 3, wood: 1 }, name: '铁剑', skill: 'smithing', lv: 15 },
  { id: 'gold_sword', out: 'gold_sword', outQty: 1, mats: { gold_ore: 3, wood: 1 }, name: '黄金剑', skill: 'smithing', lv: 30 },
  { id: 'iron_axe', out: 'iron_axe', outQty: 1, mats: { iron_ore: 2, wood: 2 }, name: '铁斧', skill: 'smithing', lv: 10 },
  { id: 'iron_pick', out: 'iron_pick', outQty: 1, mats: { iron_ore: 2, wood: 2 }, name: '铁镐', skill: 'smithing', lv: 10 },
  { id: 'leather_armor', out: 'leather_armor', outQty: 1, mats: { wolf_pelt: 3 }, name: '皮甲', skill: 'smithing', lv: 8 },
  { id: 'iron_armor', out: 'iron_armor', outQty: 1, mats: { iron_ore: 5 }, name: '铁甲', skill: 'smithing', lv: 20 },
  { id: 'steel_sword', out: 'steel_sword', outQty: 1, mats: { iron_ore: 4, wood: 2 }, name: '钢剑', skill: 'smithing', lv: 22 },
  { id: 'steel_armor', out: 'steel_armor', outQty: 1, mats: { iron_ore: 6, wolf_pelt: 2 }, name: '钢甲', skill: 'smithing', lv: 25 },
  { id: 'dragon_armor', out: 'dragon_armor', outQty: 1, mats: { dragon_scale: 2, gold_ore: 4, iron_ore: 2 }, name: '龙鳞甲', skill: 'smithing', lv: 30 },
  { id: 'flame_sword', out: 'flame_sword', outQty: 1, mats: { fire_core: 3, iron_ore: 4 }, name: '烈焰剑', skill: 'smithing', lv: 30 },
  { id: 'magma_armor', out: 'magma_armor', outQty: 1, mats: { magma_stone: 4, fire_core: 2, iron_ore: 3 }, name: '熔岩护甲', skill: 'smithing', lv: 32 },
  { id: 'copper_ring', out: 'copper_ring', outQty: 1, mats: { copper_ore: 2 }, name: '铜戒指', skill: 'smithing', lv: 12 },
  { id: 'hp_potion', out: 'hp_potion', outQty: 1, mats: { slime_gel: 2 }, name: '生命药水', skill: 'alchemy', lv: 3 },
  { id: 'mp_potion', out: 'mp_potion', outQty: 1, mats: { bat_wing: 2 }, name: '法力药水', skill: 'alchemy', lv: 5 },
];

// 敌人定义
export const ENEMIES = {
  slime: { name: '史莱姆', icon: '🟢', hp: 30, atk: 5, def: 1, xp: 15, gold: [3, 8], drops: [{ id: 'slime_gel', chance: 0.6 }], lvl: 1, color: '#5fd068' },
  goblin: { name: '哥布林', icon: '👺', hp: 55, atk: 10, def: 3, xp: 30, gold: [8, 18], drops: [{ id: 'goblin_ear', chance: 0.5 }, { id: 'copper_ore', chance: 0.1 }], lvl: 3, color: '#7a9a4a' },
  wolf: { name: '野狼', icon: '🐺', hp: 80, atk: 16, def: 5, xp: 50, gold: [10, 25], drops: [{ id: 'wolf_pelt', chance: 0.5 }], lvl: 5, color: '#888' },
  bat: { name: '蝙蝠', icon: '🦇', hp: 40, atk: 12, def: 2, xp: 25, gold: [5, 12], drops: [{ id: 'bat_wing', chance: 0.5 }], lvl: 2, color: '#6a4a8a' },
  skeleton: { name: '骷髅兵', icon: '💀', hp: 110, atk: 20, def: 8, xp: 75, gold: [15, 35], drops: [{ id: 'bone', chance: 0.5 }, { id: 'iron_ore', chance: 0.15 }], lvl: 8, color: '#d8d8c8' },
  ogre: { name: '食人魔', icon: '👹', hp: 200, atk: 32, def: 12, xp: 140, gold: [30, 70], drops: [{ id: 'iron_ore', chance: 0.4 }, { id: 'gold_ore', chance: 0.1 }], lvl: 12, color: '#9a6a4a' },
  dark_mage: { name: '黑暗法师', icon: '🧙', hp: 160, atk: 38, def: 8, xp: 180, gold: [40, 90], drops: [{ id: 'mp_potion', chance: 0.5 }, { id: 'gold_ore', chance: 0.2 }], lvl: 14, color: '#6a3a8a' },
  fire_elemental: { name: '火焰元素', icon: '🔥', hp: 260, atk: 44, def: 14, xp: 220, gold: [45, 95], drops: [{ id: 'fire_core', chance: 0.55 }, { id: 'gold_ore', chance: 0.15 }], lvl: 18, color: '#e8622c' },
  lava_golem: { name: '熔岩巨人', icon: '🌋', hp: 420, atk: 55, def: 22, xp: 320, gold: [70, 140], drops: [{ id: 'magma_stone', chance: 0.6 }, { id: 'iron_ore', chance: 0.3 }], lvl: 22, color: '#a33b23' },
  fire_drake: { name: '炎鳞亚龙', icon: '🐲', hp: 550, atk: 62, def: 24, xp: 420, gold: [100, 200], drops: [{ id: 'dragon_scale', chance: 0.22 }, { id: 'fire_core', chance: 0.45 }], lvl: 26, color: '#d4552e' },
  dragon: { name: '巨龙', icon: '🐉', hp: 800, atk: 65, def: 25, xp: 800, gold: [200, 500], drops: [{ id: 'dragon_scale', chance: 1.0 }, { id: 'gold_ore', chance: 1.0, qty: 3 }], lvl: 25, color: '#c0392b', boss: true },
};

// 技能定义
export const SKILL_DEFS = {
  attack:    { name: '攻击', color: '#e0556b' },
  defense:   { name: '防御', color: '#5aa9e6' },
  woodcut:   { name: '伐木', color: '#8b5a2b' },
  mining:    { name: '采矿', color: '#a8a8b8' },
  fishing:   { name: '钓鱼', color: '#5aa9e6' },
  cooking:   { name: '烹饪', color: '#f5a623' },
  smithing:  { name: '锻造', color: '#c0c0c0' },
  alchemy:   { name: '炼药', color: '#9b59b6' },
};

// 主动技能
export const ACTIVE_SKILLS = {
  power_strike: { name: '强力一击', mp: 8, desc: '造成1.8倍伤害', unlock: 5, color: '#e0556b' },
  whirlwind:    { name: '旋风斩', mp: 15, desc: '攻击周围所有敌人', unlock: 10, color: '#f5c542' },
  heal:         { name: '治愈术', mp: 12, desc: '恢复50点生命', unlock: 3, color: '#5fd068' },
  fireball:     { name: '火球术', mp: 18, desc: '造成魔法伤害', unlock: 12, color: '#e67e22' },
  shield:       { name: '护盾', mp: 10, desc: '减少50%伤害5秒', unlock: 8, color: '#5aa9e6' },
};

// 地图定义
// 字符: .草地 ,泥土 #路 ~水 s沙 T树 R石 *花 b灌 W墙 F地 D门 1铜 2铁 3金 C箱 P传送 B桥 L木堆 o石
function parseMap(rows) {
  const width = Math.max(...rows.map(row => row.length));
  const map = rows.map(r => r.padEnd(width, r[r.length - 1]).split('').map(ch => {
    switch (ch) {
      case '.': return TILE.GRASS;
      case ',': return TILE.DIRT;
      case '#': return TILE.PATH;
      case '~': return TILE.WATER;
      case 's': return TILE.SAND;
      case 'T': return TILE.TREE;
      case 'R': return TILE.ROCK;
      case '*': return TILE.FLOWER;
      case 'b': return TILE.BUSH;
      case 'W': return TILE.WALL;
      case 'F': return TILE.FLOOR;
      case 'D': return TILE.DOOR;
      case '1': return TILE.ORE_COPPER;
      case '2': return TILE.ORE_IRON;
      case '3': return TILE.ORE_GOLD;
      case 'C': return TILE.CHEST;
      case 'P': return TILE.PORTAL;
      case 'B': return TILE.BRIDGE;
      case 'L': return TILE.WOOD_PILE;
      case 'o': return TILE.STONE;
      case 'v': return TILE.LAVA;
      default: return TILE.GRASS;
    }
  }));
  return map;
}

// 自动行动模式
export const AUTO_MODES = {
  all:    { name: '全自动', icon: '✦', desc: '战斗、采集、任务、补给、换图' },
  combat: { name: '战斗',   icon: '⚔', desc: '专注寻怪战斗，不做采集' },
  chop:   { name: '砍树',   icon: '🪓', desc: '寻找树木砍伐木材' },
  mine:   { name: '挖矿',   icon: '⛏', desc: '前往矿洞开采矿石' },
  fish:   { name: '钓鱼',   icon: '🎣', desc: '前往水域钓鱼' },
  gather: { name: '全采集', icon: '🌿', desc: '依次采集木材、矿石与鱼' },
};

export const MAPS = {
  town: {
    name: '黎明村',
    spawn: { x: 20, y: 14 },
    portals: [{ x: 39, y: 14, to: 'forest', toX: 1, toY: 10 }, { x: 0, y: 14, to: 'beach', toX: 38, toY: 10 }],
    safe: true,
    rows: parseMap([
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T..*..................................*T',
      'T..........T....T.........T....T.......T',
      'T..........WFFFFW.........WFFFFW.......T',
      'T..........WFFFFW.........WFFFFW.......T',
      'T..........WDFFFW.........WDFFFW.......T',
      'T..........T....T.........T....T.......T',
      'T..................................*...T',
      'T.....T..............T..............T..T',
      'T.....WFFFFW.........WFFFFW............T',
      'T.....WFFFFW.........WFFFFW............T',
      'T.....WDFFFW.........WDFFFW............T',
      'T.....T....T.........T....T.........*..T',
      'P......................................P',
      'P......................................P',
      'T..*.............##.............*......T',
      'T...............####...................T',
      'T..............######..............*...T',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ]),
  },
  forest: {
    name: '迷雾森林',
    spawn: { x: 1, y: 10 },
    portals: [{ x: 0, y: 10, to: 'town', toX: 38, toY: 14 }, { x: 39, y: 10, to: 'cave', toX: 1, toY: 12 }],
    enemies: ['slime', 'goblin', 'wolf'],
    rows: parseMap([
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T..T....T.....T...T.....T......T..T....T',
      'T.......T..C..T...T..T....T.TT....T....T',
      'T..T.b......T.T..bb...T...T....T.T.....T',
      'T....T.T....T...T...T.T...T....T.T.....T',
      'T..T...T....T.T...T...T...T.T...T......T',
      'T.....TT....T...T.TT...T...T...TT......T',
      'T..T...T.T......T...TT.T...T...T.T.....T',
      'T....T...T.T.T...T....T...T.T...T......T',
      'T..T...T...T...TT.T.T...T...T...TT.....T',
      'P..T...T...T...T...T.T...T...T...T.....P',
      'T....T...bT....T...T...T...TT...T...T..T',
      'T..T...T...T.T...T.T...T.T...T...T.T...T',
      'T....T.T...T...T...T.T...T...T.T...T...T',
      'T..T...T.T...T...T...T.T...T...T.T...TT',
      'T.....TT...T...TT..T...T...TT..T...T...T',
      'T..T...T.T...T...T.T.T...T...T.T.T...T.T',
      'T....T...T...T.T...T...T.T...T...T...T.T',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ]),
  },
  cave: {
    name: '幽暗洞穴',
    spawn: { x: 1, y: 12 },
    portals: [{ x: 0, y: 6, to: 'forest', toX: 38, toY: 10 }, { x: 39, y: 5, to: 'dungeon', toX: 1, toY: 10 }],
    enemies: ['bat', 'skeleton', 'ogre'],
    rows: parseMap([
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'W..WW....W..1...W...22..W....W..1.....W',
      'W..W..C..W..W...W...W...W.oo.W..W..2..W',
      'W..W.....W..W.ooW.ooW.ooW.....W..W.....W',
      'W..WWWWW.W..W.WWW.WWW.W.WWWWW.W..WWWWW.W',
      'W........W..............W......W.......P',
      'P.ooo.22.W.11.22.11.22.W.11.22.W.11...W',
      'W.....................................WW',
      'W..WWWWW.W..WWWWW.WWWWW.WWWWW.W..WWWWW.W',
      'W..W.....W..W.o.W.o.W.o.W.....W..W....W',
      'W..W..2..W..W...W...W...W..2..W..W.1..W',
      'W..WW....W..1...W..12...W....WW..W....W',
      'W........W......W.......W......W......W',
      'W.11.22..W.11...W...22..W.11.22W...22.W',
      'W........W......W.......W......W......W',
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    ]),
  },
  dungeon: {
    name: '龙之巢穴',
    spawn: { x: 1, y: 10 },
    portals: [{ x: 0, y: 10, to: 'cave', toX: 38, toY: 5 }, { x: 38, y: 10, to: 'volcano', toX: 1, toY: 8 }],
    enemies: ['skeleton', 'dark_mage', 'dragon'],
    boss: { x: 20, y: 8, id: 'dragon' },
    rows: parseMap([
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'WFFFFFFFFFWFFFFFFFFFWFFFFFFFFFWFFFFFFFFW',
      'WFFFFFFFFFWFCFFFFFFFWFFFFFFFFFWFFFFFFFFW',
      'WFF3333FFFWFFFFFFFFFWFFFFFFFFFWFF3333FFW',
      'WFF3333FFFWFFFFFFFFFWFFFFFFFFFWFF3333FFW',
      'WFFFFFFFFFWFFFFFFFFFWFFFFFFFFFWFFFFFFFFW',
      'WFFFFFFFFFWFFFFFFFFFWFFFFFFFFFWFFFFFFFFW',
      'WWWWFWWWWWWWWWWFWWWWWWWWWWFWWWWWWWWWWFWW',
      'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
      'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
      'PFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFPW',
      'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
      'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
      'WWWWFWWWWWWWWWWFWWWWWWWWWWFWWWWWWWWWWFWW',
      'WFFFFFFFFFWFFFFFFFFFWFFFFFFFFFWFFFFFFFFW',
      'WFFFFFFFFFWFFFFFFFFFWFFFFFFFFFWFFFFFFFFW',
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    ]),
  },
  volcano: {
    name: '熔岩深渊',
    spawn: { x: 1, y: 8 },
    portals: [{ x: 0, y: 8, to: 'dungeon', toX: 37, toY: 10 }],
    enemies: ['fire_elemental', 'lava_golem', 'fire_drake'],
    rows: parseMap([
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
      'WFFFF3FFFFFWFFFFFFFFFFCFFFFFFFFFFFFF1FFW',
      'WFFFF3FFFFFWFFFFFFFFFFFFFFFFFFvvvvvvFFFW',
      'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFvvvvvvFFFW',
      'WFFFFFFFFFFFFvvvvvvFFvvvvvvFFFvvvvvvFFFW',
      'WFFFFFFFFF2FFvvvvvvFFvvvvvvFF2FFFFFFFFFW',
      'WFFWFFFFFFFFFvvvvvvFFvvvvvvFFFFFFFFFFFFW',
      'PFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
      'WFFFFFFFFFFFFFFFF2FFFFFFFFFFFFFFFFFFFFFW',
      'WFFFvvvvvFFFFFFFFFFFFFFFWFFFFFFFFF3FFFFW',
      'WFFFvvvvvFFFFFFWFFFFFFFFFFFFFFFFFF3FFFFW',
      'WFFFvvvvvFFFFFFFFFFFFFFFFFFFWFFFFFFFWFFW',
      'WFF1FFFFFFFFFFFFFFFF3FFFFFFFWFFFFFFFFFFW',
      'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
      'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    ]),
  },
  beach: {
    name: '宁静海滩',
    spawn: { x: 38, y: 15 },
    portals: [{ x: 39, y: 15, to: 'town', toX: 1, toY: 14 }],
    safe: true,
    rows: parseMap([
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T.....................................*T',
      'T..sss......TTT......sss.....TTT.......T',
      'T.ss~~~ss.C.T...T...ss~~~ss..T...T..ss.T',
      'Ts~~~~~~sss.....Ts~~~~~~~ss......Tss~~.T',
      'Ts~~~~~~~~~ss..Ts~~~~~~~~~ss...Tss~~~..T',
      'Tss~~~~~~sss...ss~~~~~~~sss...ss~~~~~..T',
      'T..sssss.......ss~~~~~ssss....ss~~~s...T',
      'T..............sssss..........sss......T',
      'T.....TT..............TTT..............T',
      'T....T..T.....sss.....T..T.....sss.....T',
      'T...T....T...ss~~~s...T....T...ss~~s...T',
      'T....T..T..ss~~~~~s...T..T..ss~~~~~~s..T',
      'T.....TT..ss~~~~~~s...TT...ss~~~~~~~s..T',
      'T..........ss~~~~~s........ss~~~~~~s...T',
      'P...........ssssss...........sssss.....P',
      'T.....................................*T',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ]),
  },
};

// NPC 定义
export const NPCS = {
  merchant: { name: '商人', icon: '🧔', map: 'town', x: 12, y: 4, shop: true, dialog: '欢迎光临！需要点什么？' },
  blacksmith: { name: '铁匠', icon: '👨‍🔧', map: 'town', x: 24, y: 4, craft: true, dialog: '想打造点什么吗？带好材料来找我。' },
  elder: { name: '村长', icon: '👴', map: 'town', x: 7, y: 10, quest: 'q_slime', dialog: '年轻人，村外的史莱姆越来越多了，能帮忙清理一些吗？' },
  hunter: { name: '猎人', icon: '🏹', map: 'town', x: 24, y: 10, quest: 'q_wolf', dialog: '森林里的野狼威胁到了村民，帮我猎杀几只吧。' },
  miner: { name: '矿工', icon: '⛏️', map: 'town', x: 5, y: 16, quest: 'q_ore', dialog: '我需要一些铜矿来修理工具，能帮我采3个吗？' },
  fisher: { name: '渔夫', icon: '🎣', map: 'beach', x: 20, y: 10, quest: 'q_fish', dialog: '今天运气不好，能帮我钓3条鱼吗？' },
  sage: { name: '智者', icon: '🧙‍♂️', map: 'town', x: 12, y: 5, dialog: '传说在龙之巢穴深处沉睡着一条巨龙...只有最强的勇者才能击败它。', quest: 'q_dragon' },
  apprentice: { name: '铁匠学徒', icon: '🧑‍🏭', map: 'town', x: 28, y: 4, quest: 'q_iron', dialog: '师父的铁矿快用完了，能帮我采4块铁矿吗？洞穴深处就有。' },
  guard: { name: '卫兵', icon: '💂', map: 'town', x: 33, y: 13, quest: 'q_skeleton', dialog: '洞穴里的骷髅兵越来越多，能帮我消灭6只吗？' },
  cook: { name: '厨师', icon: '👨‍🍳', map: 'town', x: 18, y: 6, quest: 'q_feast', dialog: '我想做一桌海鲜大餐，能帮我钓4条鱼吗？' },
  explorer: { name: '探险家', icon: '🧭', map: 'town', x: 33, y: 4, quest: 'q_volcano', dialog: '龙巢深处还有一道裂缝，通向熔岩深渊……那里的火焰元素守护着锻造神兵的力量。' },
};

// 任务定义
export const QUESTS = {
  q_slime: { name: '史莱姆之灾', desc: '击败5只史莱姆', type: 'kill', target: 'slime', qty: 5, reward: { gold: 50, xp: 100, items: { hp_potion: 2 } } },
  q_wolf: { name: '野狼威胁', desc: '击败3只野狼', type: 'kill', target: 'wolf', qty: 3, reward: { gold: 100, xp: 200, items: { leather_armor: 1 } } },
  q_ore: { name: '铜矿采集', desc: '采集3个铜矿', type: 'gather', target: 'copper_ore', qty: 3, reward: { gold: 80, xp: 150, items: { wood_pick: 1 } } },
  q_fish: { name: '帮助渔夫', desc: '钓3条鱼', type: 'gather', target: 'fish', qty: 3, reward: { gold: 60, xp: 120, items: { fishing_rod: 1 } } },
  q_dragon: { name: '屠龙勇士', desc: '击败巨龙', type: 'kill', target: 'dragon', qty: 1, reward: { gold: 1000, xp: 2000, items: { dragon_sword: 1 } } },
  q_iron: { name: '铁匠的委托', desc: '采集4个铁矿', type: 'gather', target: 'iron_ore', qty: 4, reward: { gold: 250, xp: 450, items: { iron_pick: 1 } } },
  q_skeleton: { name: '洞穴清剿', desc: '击败6只骷髅兵', type: 'kill', target: 'skeleton', qty: 6, reward: { gold: 300, xp: 550, items: { copper_ring: 1 } } },
  q_feast: { name: '海鲜大餐', desc: '为厨师钓4条鱼', type: 'gather', target: 'fish', qty: 4, reward: { gold: 120, xp: 220, items: { cooked_fish: 3 } } },
  q_volcano: { name: '熔岩的试炼', desc: '击败8只火焰元素', type: 'kill', target: 'fire_elemental', qty: 8, reward: { gold: 600, xp: 1500, items: { flame_sword: 1 } } },
};

// 成就定义
export const ACHIEVEMENTS = {
  first_blood: { name: '初露锋芒', desc: '击败第一个敌人', stat: 'kills', target: 1, reward: { gold: 30, xp: 20 } },
  hunter_50: { name: '狩猎好手', desc: '累计击败 50 个敌人', stat: 'kills', target: 50, reward: { gold: 200, xp: 300, items: { hp_potion: 2 } } },
  hunter_200: { name: '百战老兵', desc: '累计击败 200 个敌人', stat: 'kills', target: 200, reward: { gold: 800, xp: 1200, items: { iron_ore: 3 } } },
  elite_10: { name: '精英克星', desc: '击败 10 只精英怪', stat: 'elites', target: 10, reward: { gold: 400, xp: 600, items: { gold_ore: 2 } } },
  dragon_slayer: { name: '屠龙勇士', desc: '击败沉睡的巨龙', stat: 'bosses', target: 1, reward: { gold: 500, xp: 800 } },
  wood_100: { name: '伐木能手', desc: '累计砍伐 100 次', stat: 'wood', target: 100, reward: { gold: 150, xp: 200, items: { wood: 10 } } },
  ore_100: { name: '矿脉探索者', desc: '累计采矿 100 次', stat: 'ore', target: 100, reward: { gold: 250, xp: 300, items: { iron_ore: 5 } } },
  fish_50: { name: '垂钓大师', desc: '累计钓鱼 50 次', stat: 'fish', target: 50, reward: { gold: 200, xp: 250, items: { cooked_fish: 5 } } },
  chest_10: { name: '宝箱猎人', desc: '打开 10 个宝箱', stat: 'chests', target: 10, reward: { gold: 300, xp: 350 } },
  quest_20: { name: '任务达人', desc: '累计完成 20 个任务', stat: 'quests', target: 20, reward: { gold: 500, xp: 800 } },
  level_20: { name: '成长之路', desc: '达到 20 级', stat: 'level', target: 20, reward: { gold: 600, items: { gold_ring: 1 } } },
  explorer_all: { name: '世界旅人', desc: '探索全部 6 张地图', stat: 'maps', target: 6, reward: { gold: 700, xp: 900 } },
  gold_5000: { name: '富甲一方', desc: '累计获得 5000 金币', stat: 'goldEarned', target: 5000, reward: { gold: 500, xp: 500, items: { gold_ore: 3 } } },
};

// 商店物品
export const SHOP_ITEMS = [
  'hp_potion', 'mp_potion', 'bread', 'cooked_fish',
  'wood_sword', 'wood_axe', 'wood_pick', 'fishing_rod',
  'cloth_armor', 'copper_sword', 'copper_ring', 'leather_armor',
  'iron_sword', 'iron_armor', 'amulet', 'gold_sword', 'gold_armor', 'gold_ring',
  'steel_sword', 'steel_armor', 'flame_sword', 'magma_armor',
];

// 初始装备
export const STARTER_EQUIP = {
  weapon: 'wood_sword',
  armor: null,
  accessory: null,
};

// 初始物品
export const STARTER_ITEMS = {
  hp_potion: 3,
  bread: 2,
};
