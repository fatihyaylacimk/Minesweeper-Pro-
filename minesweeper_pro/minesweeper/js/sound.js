// ===================== SOUND ENGINE =====================
// Uses Web Audio API - no external files needed

const SoundEngine = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone(freq, type, duration, volume = 0.3, delay = 0) {
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.01);
  }

  function playNoise(duration, volume = 0.15, delay = 0) {
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;
    const bufSize = c.sampleRate * duration;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    src.connect(gain);
    gain.connect(c.destination);
    src.start(c.currentTime + delay);
  }

  return {
    toggle() {
      enabled = !enabled;
      return enabled;
    },
    isEnabled() { return enabled; },

    // Cell reveal click
    reveal() {
      playTone(800, 'sine', 0.06, 0.12);
    },

    // Cascade reveal (quiet ticks)
    cascade(i) {
      const delay = Math.min(i * 0.008, 0.3);
      playTone(400 + i * 30, 'triangle', 0.04, 0.06, delay);
    },

    // Flag placed
    flag() {
      playTone(600, 'square', 0.06, 0.1);
      playTone(900, 'square', 0.05, 0.08, 0.06);
    },

    // Flag removed
    unflag() {
      playTone(900, 'square', 0.05, 0.08);
      playTone(600, 'square', 0.06, 0.1, 0.05);
    },

    // Question mark
    question() {
      playTone(700, 'sine', 0.08, 0.1);
      playTone(900, 'sine', 0.08, 0.08, 0.08);
    },

    // Explosion
    explode() {
      playNoise(0.6, 0.4);
      playTone(80, 'sawtooth', 0.4, 0.3, 0.01);
      playTone(60, 'square', 0.5, 0.25, 0.05);
    },

    // Win fanfare
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => {
        playTone(f, 'sine', 0.3, 0.25, i * 0.12);
        playTone(f * 2, 'sine', 0.2, 0.1, i * 0.12 + 0.05);
      });
    },

    // Hint
    hint() {
      playTone(1200, 'sine', 0.1, 0.15);
      playTone(1500, 'sine', 0.1, 0.12, 0.1);
      playTone(1800, 'sine', 0.15, 0.18, 0.2);
    },

    // Double click auto-reveal
    autoReveal() {
      playTone(1000, 'triangle', 0.08, 0.12);
    },

    // Tick for countdown
    tick() {
      playTone(1400, 'square', 0.03, 0.06);
    },

    // Countdown urgent
    tickUrgent() {
      playTone(1800, 'square', 0.04, 0.1);
    },

    // New record
    record() {
      [523, 784, 1047, 1568].forEach((f, i) => {
        playTone(f, 'sine', 0.4, 0.2, i * 0.08);
      });
    },

    // Combo
    combo(level) {
      const base = 600 + level * 100;
      playTone(base, 'sine', 0.1, 0.18);
      playTone(base * 1.5, 'sine', 0.08, 0.14, 0.08);
    }
  };
})();
