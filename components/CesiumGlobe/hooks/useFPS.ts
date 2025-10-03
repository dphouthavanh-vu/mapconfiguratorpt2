import { useEffect, useRef, useState } from 'react';

export function useFPS(isActive: boolean = true) {
  const [fps, setFps] = useState<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const animationIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      // Clean up and reset when not active
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      frameTimesRef.current = [];
      setFps(0);
      return;
    }

    const measureFPS = (timestamp: number) => {
      // Add current timestamp to the array
      frameTimesRef.current.push(timestamp);

      // Remove timestamps older than 1 second
      const oneSecondAgo = timestamp - 1000;
      frameTimesRef.current = frameTimesRef.current.filter(t => t > oneSecondAgo);

      // Update FPS display every 500ms for stability
      if (timestamp - lastUpdateTimeRef.current > 500) {
        // Calculate FPS based on frames in the last second
        const currentFps = frameTimesRef.current.length;
        setFps(Math.min(currentFps, 60)); // Cap at 60 FPS
        lastUpdateTimeRef.current = timestamp;
      }

      // Continue the loop
      animationIdRef.current = requestAnimationFrame(measureFPS);
    };

    // Start the measurement loop
    animationIdRef.current = requestAnimationFrame(measureFPS);

    // Cleanup function
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      frameTimesRef.current = [];
    };
  }, [isActive]);

  return fps;
}