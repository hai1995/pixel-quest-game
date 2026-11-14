import { Game } from './game.js';
import { initMobile } from './mobile.js';
import { unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const gameWrap = document.getElementById('game-wrap');
const game = new Game(canvas);
initMobile(game);

function fitViewport() {
  const tileSize = document.body.classList.contains('touch-mode') ? 36 : 48;
  const rect = gameWrap.getBoundingClientRect();
  game.renderer.setViewport(rect.width || window.innerWidth, rect.height || window.innerHeight, tileSize);
}

fitViewport();
window.addEventListener('resize', fitViewport);
window.addEventListener('orientationchange', () => setTimeout(fitViewport, 120));

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
