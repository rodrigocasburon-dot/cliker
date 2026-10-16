/**
 * Efectos 8-bit y música chiptune generados con Web Audio API (sin archivos ni dependencias).
 */
import type { SideId } from '../core/state';

type Wave = OscillatorType;

export type Sfx = 'click' | 'buy' | 'deny' | 'levelUp' | 'stage' | 'achievement' | 'flyCatch' | 'golden' | 'escape' | 'prestige';

// Notas (Hz) — escala pentatónica de Do para que todo suene «alegre».
const NOTE = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private master!: GainNode;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private buzz: { osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null = null;
  private lastClick = 0;

  sfxVolume = 0.6;
  musicVolume = 0.35;
  muted = false;

  /** Debe llamarse tras un gesto del usuario (política de autoplay). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain.connect(this.master);
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    this.startMusic();
  }

  setVolumes(sfx: number, music: number, muted: boolean): void {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    this.muted = muted;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume * 0.5, t, 0.02);
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.25, t, 0.05);
  }

  private tone(freq: number, dur: number, wave: Wave = 'square', vol = 0.5, at = 0, slideTo?: number, dest?: AudioNode) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(dest ?? this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.3, at = 0, filterFreq = 2000) {
    if (!this.ctx || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur);
  }

  play(name: Sfx, side: SideId = 'male'): void {
    if (!this.ctx || this.muted) return;
    const base = side === 'male' ? 0 : 5;
    switch (name) {
      case 'click': {
        // Limitar a ~25 por segundo para no saturar
        const now = this.ctx.currentTime;
        if (now - this.lastClick < 0.04) return;
        this.lastClick = now;
        const f = NOTE(base + [0, 2, 4, 7, 9][Math.floor(Math.random() * 5)]);
        this.tone(f, 0.08, 'square', 0.25, 0, f * 1.6);
        this.noise(0.06, 0.12, 0, side === 'male' ? 1200 : 3000);
        break;
      }
      case 'buy':
        this.tone(NOTE(7), 0.07, 'square', 0.25);
        this.tone(NOTE(12), 0.1, 'square', 0.25, 0.06);
        break;
      case 'deny':
        this.tone(NOTE(-12), 0.12, 'square', 0.2, 0, NOTE(-14));
        break;
      case 'levelUp':
        [0, 4, 7, 12].forEach((s, i) => this.tone(NOTE(base + s), 0.12, 'square', 0.25, i * 0.07));
        break;
      case 'stage':
        [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(NOTE(base + s), 0.14, i % 2 ? 'triangle' : 'square', 0.25, i * 0.06));
        break;
      case 'achievement':
        [12, 16, 19, 24].forEach((s, i) => this.tone(NOTE(s), 0.18, 'triangle', 0.35, i * 0.09));
        break;
      case 'flyCatch':
        this.tone(NOTE(-5), 0.2, 'sawtooth', 0.25, 0, NOTE(19));
        this.noise(0.12, 0.2, 0, 5000);
        break;
      case 'golden':
        [0, 7, 12, 16, 19, 24, 28, 31].forEach((s, i) => this.tone(NOTE(s + 3), 0.12, 'square', 0.22, i * 0.05));
        break;
      case 'escape':
        this.tone(NOTE(5), 0.25, 'triangle', 0.15, 0, NOTE(-7));
        break;
      case 'prestige':
        [-12, -5, 0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(NOTE(s), 0.25, 'triangle', 0.3, i * 0.08));
        break;
    }
  }

  /** Zumbido continuo mientras haya una mosca en pantalla. */
  startBuzz(golden: boolean): void {
    if (!this.ctx || this.buzz) return;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = golden ? 260 : 180;
    lfo.frequency.value = 18;
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain).connect(osc.frequency);
    gain.gain.value = 0.05;
    osc.connect(gain).connect(this.sfxGain);
    osc.start();
    lfo.start();
    this.buzz = { osc, lfo, gain };
  }

  stopBuzz(): void {
    if (!this.buzz || !this.ctx) return;
    const { osc, lfo, gain } = this.buzz;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    osc.stop(this.ctx.currentTime + 0.2);
    lfo.stop(this.ctx.currentTime + 0.2);
    this.buzz = null;
  }

  // ───────────── Música: bucle de 32 pasos a 112 bpm ─────────────

  private static BASS = [0, 0, 7, 7, 5, 5, 7, 3, 0, 0, 7, 7, 10, 10, 7, 5];
  private static LEAD = [12, -1, 15, 17, 19, -1, 17, 15, 12, -1, 10, 12, 15, -1, -1, -1,
    12, -1, 15, 17, 19, 22, 24, 22, 19, -1, 17, 15, 17, -1, -1, -1];

  private startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    const stepDur = 60 / 112 / 2;
    const schedule = () => {
      if (!this.ctx) return;
      while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
        const at = this.nextNoteTime - this.ctx.currentTime;
        const i = this.step % 32;
        const bass = AudioEngine.BASS[Math.floor(i / 2) % 16];
        if (i % 2 === 0) this.tone(NOTE(bass - 24), stepDur * 1.8, 'triangle', 0.5, at, undefined, this.musicGain);
        const lead = AudioEngine.LEAD[i];
        if (lead >= 0) this.tone(NOTE(lead - 12), stepDur * 0.9, 'square', 0.18, at, undefined, this.musicGain);
        if (i % 4 === 2) this.noiseMusic(at);
        this.nextNoteTime += stepDur;
        this.step++;
      }
    };
    this.musicTimer = window.setInterval(schedule, 60);
  }

  private noiseMusic(at: number) {
    if (!this.ctx || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6000;
    src.connect(f).connect(g).connect(this.musicGain);
    src.start(t0);
    src.stop(t0 + 0.06);
  }
}

export const audio = new AudioEngine();
