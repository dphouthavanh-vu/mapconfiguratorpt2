/**
 * Volume meter worklet for visualizing audio input
 */

export default `
class VolMeterWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.volume = 0;
    this.updateIntervalInMS = 25;
    this.nextUpdateFrame = this.updateIntervalInMS;
  }

  process(inputs, outputs) {
    const input = inputs[0];

    if (input.length > 0) {
      const samples = input[0];
      let sum = 0;

      for (let i = 0; i < samples.length; i++) {
        sum += samples[i] * samples[i];
      }

      const rms = Math.sqrt(sum / samples.length);
      this.volume = Math.max(rms, this.volume * 0.95);

      this.nextUpdateFrame -= samples.length;
      if (this.nextUpdateFrame < 0) {
        this.nextUpdateFrame += Math.round(
          this.updateIntervalInMS / 1000 * sampleRate
        );
        this.port.postMessage({ volume: this.volume });
      }
    }

    return true;
  }
}

registerProcessor('vu-meter', VolMeterWorklet);
`;
