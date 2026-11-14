const normalizeKey = key => {
  if (key === ' ') return 'space';
  if (key === 'Spacebar') return 'space';
  return key.toLowerCase();
};

const CONTROL_KEYS = new Set([
  'w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
  'space', 'e', 'f', 'i', 'b', 'k', 'c', 'q', 'm', 'h', 'escape',
  '1', '2', '3', '4', '5',
]);

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.released = new Set();

    window.addEventListener('keydown', event => {
      const key = normalizeKey(event.key);
      if (CONTROL_KEYS.has(key)) event.preventDefault();
      if (!event.repeat) this.press(key);
      else this.keys.add(key);
    });
    window.addEventListener('keyup', event => {
      const key = normalizeKey(event.key);
      if (CONTROL_KEYS.has(key)) event.preventDefault();
      this.release(key);
    });
    window.addEventListener('blur', () => this.reset());
  }

  press(key) {
    if (!this.keys.has(key)) this.pressed.add(key);
    this.keys.add(key);
  }

  release(key) {
    this.keys.delete(key);
    this.released.add(key);
  }

  reset() {
    this.keys.clear();
    this.pressed.clear();
    this.released.clear();
  }

  get dirX() {
    return (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0)
      - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
  }

  get dirY() {
    return (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0)
      - (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0);
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }
}
