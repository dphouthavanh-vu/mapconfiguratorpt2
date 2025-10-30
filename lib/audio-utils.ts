/**
 * Audio context utilities
 */

let audioContextInstance: AudioContext | undefined;

export async function audioContext(options?: AudioContextOptions): Promise<AudioContext> {
  if (!audioContextInstance) {
    audioContextInstance = new AudioContext(options);
  }

  if (audioContextInstance.state === 'suspended') {
    await audioContextInstance.resume();
  }

  return audioContextInstance;
}
