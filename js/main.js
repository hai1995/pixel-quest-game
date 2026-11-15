import { Game } from './game.js';
import { initMobile } from './mobile.js';
import { unlockAudio } from './audio.js';
import { AUTO_MODES } from './data.js';

const canvas = document.getElementById('game');
const gameWrap = document.getElementById('game-wrap');
const game = new Game(canvas);
initMobile(game);

function fitViewport() {
  const touch = document.body.classList.contains('touch-mode');
  const rect = gameWrap.getBoundingClientRect();
  const width = rect.width || window.innerWidth;
  const height = rect.height || window.innerHeight;
  const portrait = height >= width;
  const tileSize = touch
    ? (portrait ? Math.min(48, Math.max(36, Math.round(height / 22))) : 36)
    : 48;
  game.renderer.setViewport(width, height, tileSize);
}

fitViewport();
window.addEventListener('resize', fitViewport);
window.addEventListener('orientationchange', () => setTimeout(fitViewport, 120));

canvas.addEventListener('pointerdown', event => {
  if (event.button !== undefined && event.button !== 0) return;
  game.clickToMove(event.clientX, event.clientY);
});

canvas.addEventListener('pointermove', event => {
  game.hoverAt(event.clientX, event.clientY);
});
canvas.addEventListener('pointerleave', () => game.clearHover());

['pointerdown', 'keydown', 'touchstart'].forEach(type => {
  window.addEventListener(type, unlockAudio, { once: true, passive: true });
});

document.getElementById('btn-new').addEventListener('click', () => game.newGame());

const autoMenu = document.getElementById('auto-menu');
const autoModeList = document.getElementById('auto-mode-list');
let autoAnchor = null;

Object.entries(AUTO_MODES).forEach(([id, mode]) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.autoMode = id;
  button.title = mode.desc;
  button.innerHTML = `<i>${mode.icon}</i><span>${mode.name}</span>`;
  button.addEventListener('click', () => {
    game.setAutoMode(id);
    closeAutoMenu();
  });
  autoModeList.appendChild(button);
});

document.getElementById('auto-stop').addEventListener('click', () => {
  if (game.auto) game.toggleAuto();
  closeAutoMenu();
});

function openAutoMenu(anchor) {
  autoAnchor = anchor;
  autoMenu.classList.remove('hidden');
  game.syncAutoUI();
  const rect = anchor.getBoundingClientRect();
  const menuRect = autoMenu.getBoundingClientRect();
  let left = rect.right - menuRect.width;
  let top = rect.bottom + 8;
  if (rect.bottom + 8 + menuRect.height > window.innerHeight - 8) top = rect.top - menuRect.height - 8;
  left = Math.max(8, Math.min(left, window.innerWidth - menuRect.width - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - menuRect.height - 8));
  autoMenu.style.left = `${left}px`;
  autoMenu.style.top = `${top}px`;
  anchor.setAttribute('aria-expanded', 'true');
}

function closeAutoMenu() {
  autoMenu.classList.add('hidden');
  if (autoAnchor) {
    autoAnchor.setAttribute('aria-expanded', 'false');
    autoAnchor = null;
  }
}

document.querySelectorAll('[data-auto]').forEach(button => {
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (!autoMenu.classList.contains('hidden') && autoAnchor === button) closeAutoMenu();
    else openAutoMenu(button);
  });
});

document.addEventListener('pointerdown', event => {
  if (autoMenu.classList.contains('hidden')) return;
  if (event.target.closest('#auto-menu') || event.target.closest('[data-auto]')) return;
  closeAutoMenu();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !autoMenu.classList.contains('hidden')) closeAutoMenu();
});

game.syncAutoUI();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.save();
});
window.addEventListener('beforeunload', () => game.save());

window.game = game;
let hasSave = false;
try {
  hasSave = !!localStorage.getItem('pixel-quest-save');
} catch {
  hasSave = false;
}
if (hasSave) game.continueGame();
game.start();
