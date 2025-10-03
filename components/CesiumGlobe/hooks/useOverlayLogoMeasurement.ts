import { useEffect, useRef } from 'react';

/**
 * Custom hook to measure the overlay logo's size after it renders.
 * Accepts the overlayLogoRef, setLogoSize, logoSizePx, showOverlay, and entitiesReady as arguments.
 */
export function useOverlayLogoMeasurement({
  overlayLogoRef,
  setLogoSize,
  logoSizePx,
  showOverlay,
  entitiesReady,
}: {
  // Accept any HTMLElement (button/div) so we can measure text-based overlay elements
  overlayLogoRef: React.RefObject<HTMLElement | null>;
  setLogoSize: (size: { width: number; height: number }) => void;
  logoSizePx: number;
  showOverlay: boolean;
  entitiesReady: boolean;
}) {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {

    if (!showOverlay || !overlayLogoRef.current || !entitiesReady) {
      return;
    }

    const measureLogo = () => {
      if (overlayLogoRef.current) {
        const rect = overlayLogoRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setLogoSize({ width: rect.width, height: rect.height });
        } else {
        }
      }
    };

    // Initial measurement with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(measureLogo, 100);

    // Set up ResizeObserver to catch any size changes
    if (window.ResizeObserver) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === overlayLogoRef.current) {
            const rect = entry.contentRect;
            if (rect.width > 0 && rect.height > 0) {
              setLogoSize({ width: rect.width, height: rect.height });
            }
          }
        }
      });

      if (overlayLogoRef.current) {
        resizeObserverRef.current.observe(overlayLogoRef.current);
      }
    }

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [logoSizePx, showOverlay, overlayLogoRef, setLogoSize, entitiesReady]);

  // Additional effect to measure when the ref becomes available
  useEffect(() => {
    if (showOverlay && overlayLogoRef.current && entitiesReady) {
      const rect = overlayLogoRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setLogoSize({ width: rect.width, height: rect.height });
      }
    }
  }, [showOverlay, setLogoSize, entitiesReady]);
}