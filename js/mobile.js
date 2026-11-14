import { ACTIVE_SKILLS } from './data.js';

export function initMobile(game) {
  const forceTouch = new URLSearchParams(location.search).has('touch');
  const isTouch = forceTouch || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!isTouch) return { isTouch: false };

  document.body.classList.add('touch-mode');
  const joystick = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  const MAX_R = 46;
  let joystickPointer = null;

  const updateJoystick = event => {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const length = Math.hypot(dx, dy);
    if (length > MAX_R) {
      dx = dx / length * MAX_R;
      dy = dy / length * MAX_R;
    }
    game.input.vjoy.x = dx / MAX_R;
    game.input.vjoy.y = dy / MAX_R;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const resetJoystick = event => {
    if (joystickPointer !== null && event.pointerId !== joystickPointer) return;
    joystickPointer = null;
    game.input.vjoy.x = 0;
    game.input.vjoy.y = 0;
    joystick.classList.remove('active');
    knob.style.transform = 'translate(0, 0)';
  };

  joystick.addEventListener('pointerdown', event => {
    event.preventDefault();
    joystickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    joystick.classList.add('active');
    updateJoystick(event);
  });
  joystick.addEventListener('pointermove', event => {
    if (event.pointerId === joystickPointer) {
      event.preventDefault();
      updateJoystick(event);
    }
  });
  joystick.addEventListener('pointerup', resetJoystick);
  joystick.addEventListener('pointercancel', resetJoystick);
  joystick.addEventListener('lostpointercapture', resetJoystick);

  document.querySelectorAll('#mobile-ui [data-key]').forEach(button => {
    const key = button.dataset.key;
    let activeId = null;
    const stop = () => {
      if (activeId === null) return;
      activeId = null;
      game.input.release(key);
      button.classList.remove('active');
    };
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (activeId !== null) return;
      activeId = event.pointerId;
      try { button.setPointerCapture(event.pointerId); } catch { /* ignore */ }
      game.input.press(key);
      button.classList.add('active');
      navigator.vibrate?.(6);
    });
    button.addEventListener('pointerup', stop);
    button.addEventListener('pointercancel', stop);
    button.addEventListener('lostpointercapture', stop);
  });

  document.querySelectorAll('#mobile-skills [data-skill]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      game.useActiveSkill(button.dataset.skill);
      button.classList.add('active');
      navigator.vibrate?.(8);
    });
    button.addEventListener('pointerup', () => button.classList.remove('active'));
    button.addEventListener('pointercancel', () => button.classList.remove('active'));
  });

  const dialogue = document.getElementById('dialogue-box');
  dialogue.addEventListener('click', event => {
    if (!game.dialogue) return;
    event.preventDefault();
    game.input.press('space');
    game.input.release('space');
  });

  const fullscreen = document.getElementById('mobile-fullscreen');
  fullscreen?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      game.ui.toast('当前浏览器不支持全屏');
    }
  });

  document.addEventListener('contextmenu', event => {
    if (event.target.closest('#mobile-ui, #game')) event.preventDefault();
  });

  const updateHUD = () => {
    const p = game.player;
    document.getElementById('mh-map').textContent = game.auto && game.autoStatus
      ? `自动·${game.autoStatus}`
      : game.world.map.name;
    document.getElementById('mh-lv').textContent = `Lv.${p.level}`;
    document.getElementById('mh-gold').textContent = `${p.gold} G`;
    document.getElementById('mh-hp').style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
    document.getElementById('mh-mp').style.width = `${Math.max(0, p.mp / p.maxMp * 100)}%`;
    document.querySelectorAll('#mobile-skills [data-skill]').forEach(button => {
      const id = button.dataset.skill;
      const unlocked = p.hasActiveSkill(id);
      const cooldown = p.skillCooldowns[id] || 0;
      const glyph = button.querySelector('.skill-glyph');
      const state = button.querySelector('.skill-state');
      glyph.textContent = unlocked ? button.dataset.label : '锁';
      state.textContent = cooldown > 0.05 ? Math.ceil(cooldown) : ACTIVE_SKILLS[id].mp;
      button.classList.toggle('locked', !unlocked);
      button.classList.toggle('cooling', cooldown > 0.05);
      button.setAttribute('aria-label', unlocked ? ACTIVE_SKILLS[id].name : `${ACTIVE_SKILLS[id].name}，${ACTIVE_SKILLS[id].unlock}级解锁`);
    });
  };
  updateHUD();
  setInterval(updateHUD, 150);
  return { isTouch: true, updateHUD };
}
