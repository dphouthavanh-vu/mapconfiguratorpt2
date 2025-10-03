import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';

interface PerformanceMetrics {
  fps: number;
  renderTime: number; // milliseconds
  primitiveCount: number;
  textureMemory: number; // MB
  cameraHeight: number; // meters
  tilesLoaded: number;
  tilesTotal: number;
  requestRenderMode: boolean;
}

export function usePerformanceMetrics(
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>,
  isActive: boolean = true,
  updateInterval: number = 500 // Update every 500ms
): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    renderTime: 0,
    primitiveCount: 0,
    textureMemory: 0,
    cameraHeight: 0,
    tilesLoaded: 0,
    tilesTotal: 0,
    requestRenderMode: false,
  });

  const frameTimesRef = useRef<number[]>([]);
  const renderTimesRef = useRef<number[]>([]);
  const lastUpdateRef = useRef<number>(0);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || !viewerRef.current) {
      // Clean up and reset when not active
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      frameTimesRef.current = [];
      renderTimesRef.current = [];
      return;
    }

    const viewer = viewerRef.current;
    const scene = viewer.scene;

    const collectMetrics = (timestamp: number) => {
      // Track frame times for FPS calculation
      frameTimesRef.current.push(timestamp);
      const oneSecondAgo = timestamp - 1000;
      frameTimesRef.current = frameTimesRef.current.filter(t => t > oneSecondAgo);

      // Update metrics at specified interval
      if (timestamp - lastUpdateRef.current > updateInterval) {
        const fps = frameTimesRef.current.length;

        // Calculate average render time if available
        let avgRenderTime = 0;
        if (renderTimesRef.current.length > 0) {
          const sum = renderTimesRef.current.reduce((a, b) => a + b, 0);
          avgRenderTime = sum / renderTimesRef.current.length;
          renderTimesRef.current = []; // Reset for next interval
        }

        // Count primitives
        let primitiveCount = 0;
        for (let i = 0; i < scene.primitives.length; i++) {
          const primitive = scene.primitives.get(i);
          if (primitive && primitive.show) {
            primitiveCount++;
          }
        }

        // Get camera height
        const cameraHeight = viewer.camera.positionCartographic.height;

        // Get tile loading stats if globe exists
        let tilesLoaded = 0;
        let tilesTotal = 0;
        if (scene.globe && scene.globe._surface) {
          const surface = scene.globe._surface as any;
          if (surface._tilesToRenderByTextureCount) {
            tilesLoaded = surface._tilesToRenderByTextureCount.length || 0;
          }
          if (surface._tileLoadQueueHigh) {
            tilesTotal = tilesLoaded + surface._tileLoadQueueHigh.length;
          }
        }

        // Get texture memory usage (approximate)
        let textureMemory = 0;
        if (scene.context && (scene.context as any).textureCache) {
          const cache = (scene.context as any).textureCache;
          textureMemory = (cache.numberOfTextures || 0) * 0.5; // Rough estimate: 0.5MB per texture
        }

        setMetrics({
          fps: Math.min(fps, 120), // Cap at 120 FPS
          renderTime: avgRenderTime,
          primitiveCount,
          textureMemory: Math.round(textureMemory * 10) / 10, // Round to 1 decimal
          cameraHeight: Math.round(cameraHeight),
          tilesLoaded,
          tilesTotal,
          requestRenderMode: scene.requestRenderMode,
        });

        lastUpdateRef.current = timestamp;
      }

      // Continue the loop
      animationIdRef.current = requestAnimationFrame(collectMetrics);
    };

    // Track render times
    const preRenderHandler = () => {
      (viewer as any)._renderStartTime = performance.now();
    };

    const postRenderHandler = () => {
      if ((viewer as any)._renderStartTime) {
        const renderTime = performance.now() - (viewer as any)._renderStartTime;
        renderTimesRef.current.push(renderTime);

        // Keep only last 10 render times
        if (renderTimesRef.current.length > 10) {
          renderTimesRef.current.shift();
        }
      }
    };

    // Add event listeners
    scene.preRender.addEventListener(preRenderHandler);
    scene.postRender.addEventListener(postRenderHandler);

    // Start the metrics collection loop
    animationIdRef.current = requestAnimationFrame(collectMetrics);

    // Cleanup function
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      scene.preRender.removeEventListener(preRenderHandler);
      scene.postRender.removeEventListener(postRenderHandler);
      frameTimesRef.current = [];
      renderTimesRef.current = [];
    };
  }, [isActive, updateInterval, viewerRef]);

  return metrics;
}

// Helper function to format camera height for display
export function formatCameraHeight(height: number): string {
  if (height < 1000) {
    return `${Math.round(height)}m`;
  } else if (height < 1000000) {
    return `${(height / 1000).toFixed(1)}km`;
  } else {
    return `${(height / 1000000).toFixed(1)}Mm`;
  }
}