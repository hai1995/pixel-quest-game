// audio.js - 程序化音效，无需外部资源
let ctx = null;
let master = null;
let noiseBuffer = null;
let unlocked = false;
let muted = false;

export function setMuted(value) {
  muted = !!value;
  if (master) master.gain.value = muted ? 0 : 0.2;
}

function ensureContext() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    ctx = new AudioCtor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.2;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() {
  if (unlocked) return;
  const ac = ensureContext();
  if (!ac) return;
  unlocked = true;
  const gain = ac.createGain();
  gain.gain.value = 0.0001;
  const osc = ac.createOscillator();
  osc.connect(gain).connect(master);
  osc.start();
  osc.stop(ac.currentTime + 0.01);
}

function getNoise(ac) {
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function tone({ freq = 440, to = freq, dur = 0.1, type = 'square', vol = 0.35, delay = 0 }) {
  if (muted) return;
  const ac = ensureContext();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

function noise({ dur = 0.08, vol = 0.25, delay = 0, freq = 900 }) {
  if (muted) return;
  const ac = ensureContext();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = getNoise(ac);
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.9;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(start);
  src.stop(start + dur + 0.02);
}

export const sfx = {
  step() {
    tone({ freq: 150, to: 105, dur: 0.045, type: 'triangle', vol: 0.1 });
  },
  swing() {
    noise({ dur: 0.075, vol: 0.16, freq: 1300 });
  },
  hit() {
    noise({ dur: 0.075, vol: 0.3, freq: 700 });
    tone({ freq: 240, to: 90, dur: 0.09, type: 'square', vol: 0.22 });
  },
  crit() {
    noise({ dur: 0.1, vol: 0.38, freq: 900 });
    tone({ freq: 320, to: 110, dur: 0.13, type: 'square', vol: 0.26 });
    tone({ freq: 1100, to: 1500, dur: 0.08, type: 'triangle', vol: 0.18, delay: 0.02 });
  },
  hurt() {
    tone({ freq: 190, to: 65, dur: 0.18, type: 'sawtooth', vol: 0.3 });
    noise({ dur: 0.1, vol: 0.15, freq: 380 });
  },
  kill() {
    tone({ freq: 300, to: 70, dur: 0.22, type: 'square', vol: 0.24 });
    noise({ dur: 0.16, vol: 0.2, freq: 500 });
  },
  pickup() {
    tone({ freq: 680, dur: 0.06, type: 'sine', vol: 0.2 });
    tone({ freq: 1020, dur: 0.08, type: 'sine', vol: 0.18, delay: 0.055 });
  },
  coin() {
    tone({ freq: 880, to: 1320, dur: 0.1, type: 'triangle', vol: 0.18 });
  },
  levelup() {
    [523, 659, 784, 1046].forEach((freq, i) => tone({ freq, dur: 0.16, type: 'triangle', vol: 0.22, delay: i * 0.09 }));
  },
  menu() {
    tone({ freq: 420, to: 560, dur: 0.045, type: 'triangle', vol: 0.12 });
  },
  gather() {
    noise({ dur: 0.1, vol: 0.22, freq: 320 });
    tone({ freq: 200, to: 130, dur: 0.1, type: 'triangle', vol: 0.16 });
  },
  portal() {
    tone({ freq: 220, to: 880, dur: 0.34, type: 'sine', vol: 0.22 });
    tone({ freq: 330, to: 1320, dur: 0.34, type: 'triangle', vol: 0.1, delay: 0.03 });
  },
  death() {
    tone({ freq: 240, to: 60, dur: 0.6, type: 'sawtooth', vol: 0.26 });
  },
  heal() {
    tone({ freq: 620, to: 940, dur: 0.18, type: 'sine', vol: 0.2 });
  },
  shield() {
    tone({ freq: 720, to: 480, dur: 0.16, type: 'triangle', vol: 0.18 });
  },
  fire() {
    noise({ dur: 0.18, vol: 0.24, freq: 600 });
    tone({ freq: 420, to: 160, dur: 0.2, type: 'sawtooth', vol: 0.18 });
  },
};
