import { useEffect } from 'react';
import * as Cesium from 'cesium';

/**
 * Custom hook to update logo size on camera move and window resize, after scene is ready.
 * Accepts all necessary refs, the updateLogoSize callback, and additional state parameters.
 */
export function useLogoSizeUpdater({
  viewerRef,
  updateLogoSize,
  LANDMARKS,
  viewerReady,
  dataSourceReady,
}: {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
  updateLogoSize: () => void;
  LANDMARKS: Array<any>;
  viewerReady: boolean;
  dataSourceReady: boolean;
}) {
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || !dataSourceReady) return;
    let listenersAdded = false;
    const viewer = viewerRef.current;
    const scene = viewer.scene;
    // Handler to add listeners after first successful update
    const addListeners = () => {
      if (listenersAdded) return;
      listenersAdded = true;
      const handler = () => updateLogoSize();
      scene.camera.moveEnd.addEventListener(handler);
      window.addEventListener('resize', handler);
    };
    // One-time postRender to ensure scene is ready
    const postRenderHandler = () => {
      updateLogoSize();
      addListeners();
      scene.postRender.removeEventListener(postRenderHandler);
    };
    scene.postRender.addEventListener(postRenderHandler);
    return () => {
      scene.postRender.removeEventListener(postRenderHandler);
      if (listenersAdded) {
        const handler = () => updateLogoSize();
        scene.camera.moveEnd.removeEventListener(handler);
        window.removeEventListener('resize', handler);
      }
    };
  }, [viewerRef, LANDMARKS, viewerReady, dataSourceReady]);
}