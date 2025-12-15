import * as Tone from 'tone';

class AudioService {
  private initialized: boolean = false;
  private clickSynth: Tone.Synth | null = null;
  private productSynth: Tone.Synth | null = null;
  private polySynth: Tone.PolySynth | null = null;

  async init() {
    if (this.initialized) return;
    await Tone.start();

    this.clickSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    if (this.clickSynth) this.clickSynth.volume.value = -20;

    this.productSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    if (this.productSynth) this.productSynth.volume.value = -5;

    this.polySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 1 }
    }).toDestination();
    if (this.polySynth) this.polySynth.volume.value = -12;

    this.initialized = true;
  }

  playClick() {
    if (!this.initialized) this.init();
    if (this.clickSynth) this.clickSynth.triggerAttackRelease("C6", "32n");
  }

  playAdd() {
    if (!this.initialized) this.init();
    if (this.productSynth) this.productSynth.triggerAttackRelease("E5", "16n");
  }

  playSub() {
    if (!this.initialized) this.init();
    if (this.productSynth) this.productSynth.triggerAttackRelease("C4", "16n");
  }

  playSuccess() {
    if (!this.initialized) this.init();
    if (this.polySynth) {
      this.polySynth.triggerAttackRelease(["C4", "E4", "G4", "C5"], "8n");
    }
  }

  playError() {
    if (!this.initialized) this.init();
    if (this.productSynth) this.productSynth.triggerAttackRelease("A2", "8n");
  }
}

export const audioService = new AudioService();