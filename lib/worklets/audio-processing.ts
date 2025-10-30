/**
 * Audio processing worklet for recording and downsampling
 */

export default `
class AudioRecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0];

      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex++] = inputChannel[i];

        if (this.bufferIndex >= this.bufferSize) {
          // Convert float32 to int16
          const int16Array = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            const s = Math.max(-1, Math.min(1, this.buffer[j]));
            int16Array[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          this.port.postMessage({
            data: {
              int16arrayBuffer: int16Array.buffer
            }
          }, [int16Array.buffer]);

          this.buffer = new Float32Array(this.bufferSize);
          this.bufferIndex = 0;
        }
      }
    }

    return true;
  }
}

registerProcessor('audio-recorder-worklet', AudioRecorderWorklet);
`;
