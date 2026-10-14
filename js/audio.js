/**
 * Web Audio API Sound Synthesizer for Terminal
 * Generates procedural mechanical switch clicks and terminal bell without external assets.
 */
class TerminalAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.25;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playKeyClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // High frequency click impulse
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = 1200 + Math.random() * 400; // Slight random pitch variation
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.02);

      gain.gain.setValueAtTime(this.volume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.025);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }

  playEnter() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.05);

      gain.gain.setValueAtTime(this.volume * 0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }

  playBell() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, t); // G5 note
      osc.frequency.setValueAtTime(784, t + 0.1);

      gain.gain.setValueAtTime(this.volume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.35);
    } catch (e) {}
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, idx) => {
        const noteTime = t + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(this.volume * 0.3, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.15);
      });
    } catch (e) {}
  }
}

window.terminalAudio = new TerminalAudio();
