import { Game } from './game.js';
import { initMobile } from './mobile.js';
import { unlockAudio } from './audio.js';

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
const continueButton = document.getElementById('btn-continue');
try {
  continueButton.disabled = !localStorage.getItem('pixel-quest-save');
} catch {
  continueButton.disabled = true;
}
continueButton.addEventListener('click', () => game.continueGame());

document.querySelectorAll('[data-auto]').forEach(button => {
  button.addEventListener('click', () => game.toggleAuto());
});
game.syncAutoUI();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.save();
});
window.addEventListener('beforeunload', () => game.save());

window.game = game;
game.start();
