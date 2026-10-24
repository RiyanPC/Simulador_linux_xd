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

  playNotification() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const notes = [659.25, 880]; // E5, A5
      notes.forEach((freq, idx) => {
        const noteTime = t + idx * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(this.volume * 0.35, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.2);
      });
    } catch (e) {}
  }

  playWorkspaceSwitch() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(640, t + 0.05);

      gain.gain.setValueAtTime(this.volume * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.07);
    } catch (e) {}
  }

  playWindowAction() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

      gain.gain.setValueAtTime(this.volume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {}
  }

  // Caelestia Ambient Lo-Fi Synthesizer
  toggleAmbientMusic() {
    this.init();
    if (!this.ctx) return false;

    if (this.ambientActive) {
      this.stopAmbientMusic();
      return false;
    } else {
      this.startAmbientMusic();
      return true;
    }
  }

  startAmbientMusic() {
    if (this.ambientActive) return;
    this.ambientActive = true;
    this.ambientInterval = setInterval(() => {
      if (!this.ambientActive) return;
      this.playAmbientChord();
    }, 4500);
    this.playAmbientChord();
  }

  stopAmbientMusic() {
    this.ambientActive = false;
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }

  playAmbientChord() {
    if (!this.ctx || !this.ambientActive) return;

    try {
      const t = this.ctx.currentTime;
      // Dreamy chords: Dm9, Fmaj7, Am9, Gsus4
      const chords = [
        [293.66, 349.23, 440.0, 523.25, 659.25], // D4, F4, A4, C5, E5
        [349.23, 440.0, 523.25, 659.25],         // F4, A4, C5, E5
        [220.0, 329.63, 440.0, 523.25, 659.25],  // A3, E4, A4, C5, E5
        [196.0, 293.66, 392.0, 523.25]           // G3, D4, G4, C5
      ];
      this.chordIdx = ((this.chordIdx || 0) + 1) % chords.length;
      const notes = chords[this.chordIdx];

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        // Slow soft attack and long ethereal release
        const noteVol = (this.volume * 0.15) / notes.length;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(noteVol, t + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 4.3);
      });
    } catch (e) {}
  }
}

window.terminalAudio = new TerminalAudio();

