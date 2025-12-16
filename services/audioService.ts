// Declare Tone.js global object
declare var Tone: any;

export const audioService = {
  initialized: false,
  clickSynth: null as any,
  productSynth: null as any,
  polySynth: null as any,

  init: async (): Promise<boolean> => {
    if (audioService.initialized) return true; // Already initialized, return success

    try {
      await Tone.start();

      audioService.clickSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      }).toDestination();
      audioService.clickSynth.volume.value = -20;

      audioService.productSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
      }).toDestination();
      audioService.productSynth.volume.value = -5;

      audioService.polySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 1 },
      }).toDestination();
      audioService.polySynth.volume.value = -12;

      audioService.initialized = true;
      return true; // Successfully initialized
    } catch (error) {
      console.error('Error al inicializar el servicio de audio:', error);
      audioService.initialized = false; // Ensure flag is false on error
      return false; // Initialization failed
    }
  },

  playClick: (): void => {
    if (!audioService.initialized) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioService.init();
    } // Attempt init if not ready
    if (audioService.initialized && audioService.clickSynth) audioService.clickSynth.triggerAttackRelease('C6', '32n');
  },

  playAdd: (): void => {
    if (!audioService.initialized) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioService.init();
    }
    if (audioService.initialized && audioService.productSynth) audioService.productSynth.triggerAttackRelease('E5', '16n');
  },

  playSub: (): void => {
    if (!audioService.initialized) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioService.init();
    }
    if (audioService.initialized && audioService.productSynth) audioService.productSynth.triggerAttackRelease('C4', '16n');
  },

  playSuccess: (): void => {
    if (!audioService.initialized) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioService.init();
    }
    if (audioService.initialized && audioService.polySynth) {
      audioService.polySynth.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '8n');
    }
  },

  playError: (): void => {
    if (!audioService.initialized) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioService.init();
    }
    if (audioService.initialized && audioService.productSynth) audioService.productSynth.triggerAttackRelease('A2', '8n');
  },
};
