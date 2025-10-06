'use client';

import { useMemo } from 'react';
import { zonesToLandmarks } from '@/lib/csv-generator';
import { GeographicBounds, CanvasConfig } from '@/lib/types';
import dynamic from 'next/dynamic';

// Dynamically import the Cesium globe to avoid SSR issues
const CesiumGlobe = dynamic(
  () => import('./CesiumGlobe/CesiumGlobe').then((mod) => mod.default),
  { ssr: false }
);

interface Zone {
  id: string;
  type: string;
  coordinates: string;
  content: string;
  style: string | null;
}

interface GlobeViewerProps {
  zones: Zone[];
  canvasConfig: CanvasConfig;
  geoBounds: GeographicBounds | null;
  mapTitle: string;
  onBackToMaps?: () => void;
  onView2D?: () => void;
}

export default function GlobeViewer({ zones, canvasConfig, geoBounds, mapTitle, onBackToMaps, onView2D }: GlobeViewerProps) {
  // Convert zones to landmarks for the globe
  const landmarks = useMemo(() => {
    if (!geoBounds || zones.length === 0) {
      console.log('[GlobeViewer] No landmarks: geoBounds=', geoBounds, 'zones.length=', zones.length);
      return [];
    }

    const converted = zonesToLandmarks(zones, canvasConfig, geoBounds);
    console.log('[GlobeViewer] Converted landmarks:', converted);
    console.log('[GlobeViewer] Geographic bounds:', geoBounds);
    console.log('[GlobeViewer] Canvas config:', canvasConfig);
    return converted;
  }, [zones, canvasConfig, geoBounds]);

  if (!geoBounds) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Geographic Bounds Required</h2>
          <p className="text-gray-400">
            This map doesn't have geographic coordinates and cannot be displayed on a globe.
          </p>
          <p className="text-gray-400 mt-2">
            Maps created with a geographic area (Canvas step) can be viewed in 3D.
          </p>
        </div>
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Zones Created</h2>
          <p className="text-gray-400">
            Add zones to your map to see them displayed on the 3D globe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black">
      <CesiumGlobe
        landmarks={landmarks}
        title={mapTitle}
        geoBounds={geoBounds}
        onBackToMaps={onBackToMaps}
        onView2D={onView2D}
      />
    </div>
  );
}
