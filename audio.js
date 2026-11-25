/**
 * Procedural Web Audio Horror Engine for 隅安 YUAN
 * Zero external audio dependencies: synthesizes warm wellness pads (Act I),
 * fluorescent ballast hum & microtonal sickness (Act II),
 * stereo floorboard creaks, tinnitus & wet breathing (Act III),
 * 19Hz/38Hz sub-bass dread + accelerating heartbeat + climax horror sting (Act IV).
 */
class YuanHorrorAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.initialized = false;
    this.progress = 0;
    this.inDeadSilence = false;
    this.climaxTriggered = false;

    this.masterGain = null;
    this.warmGain = null;
    this.humGain = null;
    this.dreadGain = null;
    this.tinnitusGain = null;
    this.warmOscs = [];
    this.dreadOscs = [];

    this.nextHeartbeatTime = 0;
    this.nextBreathTime = 0;
    this.nextCreakTime = 0;
    this.noiseBuffer = null;
  }

  init() {
    if (this.initialized) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0001;
    this.masterGain.connect(this.ctx.destination);

    this.noiseBuffer = this._createPinkNoiseBuffer(3.0);

    // 1. Act I Warm Spa Pad (Fmaj7: F3, A3, C4, E4)
    this.warmGain = this.ctx.createGain();
    this.warmGain.gain.value = 0.08;
    const warmFilter = this.ctx.createBiquadFilter();
    warmFilter.type = "lowpass";
    warmFilter.frequency.value = 620;
    this.warmGain.connect(warmFilter);
    warmFilter.connect(this.masterGain);

    const baseFreqs = [174.61, 220.0, 261.63, 329.63];
    baseFreqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = 0.18;
      osc.connect(g);
      g.connect(this.warmGain);
      osc.start();
      this.warmOscs.push({ osc, baseFreq: f });
    });

    // 2. Act II Fluorescent 60Hz/120Hz Hum
    this.humGain = this.ctx.createGain();
    this.humGain.gain.value = 0.0;
    const humFilter = this.ctx.createBiquadFilter();
    humFilter.type = "bandpass";
    humFilter.frequency.value = 120;
    humFilter.Q.value = 6;

    const humOsc1 = this.ctx.createOscillator();
    humOsc1.type = "sawtooth";
    humOsc1.frequency.value = 60;
    const humOsc2 = this.ctx.createOscillator();
    humOsc2.type = "square";
    humOsc2.frequency.value = 120;

    humOsc1.connect(humFilter);
    humOsc2.connect(humFilter);
    humFilter.connect(this.humGain);
    this.humGain.connect(this.masterGain);
    humOsc1.start();
    humOsc2.start();

    // 3. Act III-IV Sub-Bass Dread Drone (38Hz + detuned 39.4Hz beating)
    this.dreadGain = this.ctx.createGain();
    this.dreadGain.gain.value = 0.0;
    const dreadFilter = this.ctx.createBiquadFilter();
    dreadFilter.type = "lowpass";
    dreadFilter.frequency.value = 140;

    [38.0, 39.3, 57.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx === 2 ? "sawtooth" : "sine";
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = idx === 2 ? 0.14 : 0.42;
      osc.connect(g);
      g.connect(dreadFilter);
      osc.start();
      this.dreadOscs.push(osc);
    });
    dreadFilter.connect(this.dreadGain);
    this.dreadGain.connect(this.masterGain);

    // 4. High Tinnitus Tension Thread (3920Hz)
    this.tinnitusGain = this.ctx.createGain();
    this.tinnitusGain.gain.value = 0.0;
    const tinOsc = this.ctx.createOscillator();
    tinOsc.type = "sine";
    tinOsc.frequency.value = 3920;
    tinOsc.connect(this.tinnitusGain);
    this.tinnitusGain.connect(this.masterGain);
    tinOsc.start();

    this.initialized = true;
  }

  toggle(forceState) {
    this.init();
    if (!this.ctx) return false;

    const next = typeof forceState === "boolean" ? forceState : !this.enabled;
    this.enabled = next;

    if (this.ctx.state === "suspended" && this.enabled) {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(this.enabled ? 0.85 : 0.0001, now, 0.08);
    this.updateScroll(this.progress);
    return this.enabled;
  }

  unlockSilentlyOnGesture() {
    if (!this.enabled) {
      this.toggle(true);
      return true;
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.enabled;
  }

  updateScroll(progress) {
    this.progress = progress;
    if (!this.initialized || !this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    // Dead silence pocket right before the climax (92% - 95.6%)
    const isSilenceZone = progress >= 0.92 && progress < 0.956;
    this.inDeadSilence = isSilenceZone;

    if (isSilenceZone) {
      this.warmGain.gain.setTargetAtTime(0.0, now, 0.06);
      this.humGain.gain.setTargetAtTime(0.0, now, 0.06);
      this.dreadGain.gain.setTargetAtTime(0.02, now, 0.06);
      this.tinnitusGain.gain.setTargetAtTime(0.018, now, 0.12);
      return;
    }

    // Warm pad fades out and warps microtonally between 18% and 46%
    const warmAmt = Math.max(0, 1 - progress / 0.42) * 0.11;
    this.warmGain.gain.setTargetAtTime(warmAmt, now, 0.12);

    const warp = Math.max(0, Math.min(1, (progress - 0.18) / 0.32));
    this.warmOscs.forEach((item, i) => {
      const dir = i % 2 === 0 ? -1 : 1;
      const detuneHz = item.baseFreq * (1 + dir * warp * 0.045);
      item.osc.frequency.setTargetAtTime(detuneHz, now, 0.15);
    });

    // Fluorescent hum peaks around Act II-III (24% - 75%)
    const humAmt = progress < 0.2 ? 0 : progress < 0.75 ? Math.min(0.032, (progress - 0.2) * 0.08) : 0.012;
    this.humGain.gain.setTargetAtTime(humAmt, now, 0.12);

    // Dread drone swells from 42% to 100%
    const dreadAmt = progress < 0.4 ? 0 : Math.min(0.34, ((progress - 0.4) / 0.55) * 0.34);
    this.dreadGain.gain.setTargetAtTime(dreadAmt, now, 0.12);

    // Subtle tinnitus above 55%
    const tinAmt = progress < 0.55 ? 0 : Math.min(0.014, ((progress - 0.55) / 0.4) * 0.014);
    this.tinnitusGain.gain.setTargetAtTime(tinAmt, now, 0.15);
  }

  tick() {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const p = this.progress;

    // Heartbeat from 48% onwards (accelerates closer to climax, loud in silence pocket)
    if (p >= 0.48 && now >= this.nextHeartbeatTime) {
      const intensity = Math.min(1, (p - 0.48) / 0.48);
      const bpm = 58 + intensity * 78;
      this._triggerHeartbeat(0.08 + intensity * 0.26);
      this.nextHeartbeatTime = now + 60 / bpm;
    }

    // Wet close-mic breathing behind left/right ear from 42% onwards
    if (p >= 0.42 && now >= this.nextBreathTime) {
      const pan = Math.random() > 0.5 ? 0.72 : -0.72;
      const vol = this.inDeadSilence ? 0.19 : 0.05 + Math.min(0.12, (p - 0.42) * 0.22);
      this._triggerBreath(pan, vol);
      this.nextBreathTime = now + (this.inDeadSilence ? 2.1 : 3.4 - Math.min(1.6, p * 1.5));
    }

    // Occasional wooden floorboard creak in hallway/corner (35% - 91%)
    if (p >= 0.35 && p < 0.91 && now >= this.nextCreakTime) {
      if (Math.random() < 0.55) {
        this._triggerCreak((Math.random() - 0.5) * 1.5);
      }
      this.nextCreakTime = now + 4.2 + Math.random() * 4.0;
    }
  }

  triggerSubliminalTick() {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  triggerClimaxShock() {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Massive Sub-Bass Slam (110Hz -> 24Hz)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(115, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 1.4);
    subGain.gain.setValueAtTime(0.75, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 2.25);

    // 2. Bowed Waterphone / Horror String Shriek Cluster
    const shriekFreqs = [587.3, 622.2, 830.6, 1174.6, 1244.5];
    shriekFreqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? "sawtooth" : "square";
      osc.frequency.setValueAtTime(f * 0.96, now);
      osc.frequency.linearRampToValueAtTime(f * (1.03 + idx * 0.015), now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(f * 0.88, now + 2.4);

      filter.type = "bandpass";
      filter.frequency.value = f;
      filter.Q.value = 4.5;

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.11, now + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 2.5);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 2.55);
    });

    // 3. Glass Thud / Sharp Breath Burst
    this._triggerBreath(0, 0.38);
  }

  _triggerHeartbeat(volume) {
    const now = this.ctx.currentTime;
    const pulse = (offset, amp, pitch) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(pitch, now + offset);
      osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.14);
      g.gain.setValueAtTime(0.001, now + offset);
      g.gain.linearRampToValueAtTime(amp, now + offset + 0.018);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    };
    pulse(0, volume, 64);
    pulse(0.19, volume * 0.68, 54);
  }

  _triggerBreath(panValue, volume) {
    if (!this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(720, now);
    filter.frequency.linearRampToValueAtTime(460, now + 1.1);
    filter.Q.value = 2.8;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = panValue;
      src.connect(filter);
      filter.connect(g);
      g.connect(panner);
      panner.connect(this.masterGain);
    } else {
      src.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
    }

    src.start(now);
    src.stop(now + 1.4);
  }

  _triggerCreak(panValue) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110 + Math.random() * 45, now);
    osc.frequency.linearRampToValueAtTime(72, now + 0.45);

    filter.type = "bandpass";
    filter.frequency.value = 380;
    filter.Q.value = 7;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.035, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(filter);
    filter.connect(g);
    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = panValue;
      g.connect(panner);
      panner.connect(this.masterGain);
    } else {
      g.connect(this.masterGain);
    }

    osc.start(now);
    osc.stop(now + 0.55);
  }

  _createPinkNoiseBuffer(seconds) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    return buffer;
  }
}

window.yuanAudio = new YuanHorrorAudio();
