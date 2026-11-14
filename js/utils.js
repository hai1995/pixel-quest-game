// utils.js - 通用工具函数
export const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const randf = (min, max) => Math.random() * (max - min) + min;
export const choice = arr => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const distCheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export function uuid() {
  return Math.random().toString(36).slice(2, 10);
}

// 经验值公式：升级所需经验 = base * level^1.5
export function xpForLevel(level, base = 100) {
  return Math.floor(base * Math.pow(level, 1.5));
}

// 技能经验公式
export function skillXpForLevel(level, base = 50) {
  return Math.floor(base * Math.pow(level, 1.4));
}

// 深度拷贝
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
