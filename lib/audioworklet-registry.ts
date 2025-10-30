/**
 * Helper to create AudioWorklet from source code strings
 */

export function createWorkletFromSrc(name: string, src: string): string {
  const blob = new Blob([src], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  return url;
}
