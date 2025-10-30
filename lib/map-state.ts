/**
 * Map state management using Zustand
 * Simplified version adapted from chat-with-maps-live
 */

import { create } from 'zustand';
import { Map3DCameraProps } from '@/components/map-3d';

/**
 * Map Marker type
 */
export interface MapMarker {
  position: {
    lat: number;
    lng: number;
    altitude: number;
  };
  label: string;
  showLabel: boolean;
  color?: string; // Badge background color
  accentColor?: string; // Border/accent color (darker shade)
  textColor?: string; // Label text color (auto-calculated for contrast if not provided)
}

/**
 * Map store for managing markers and camera state
 */
export const useMapStore = create<{
  markers: MapMarker[];
  cameraTarget: Map3DCameraProps | null;
  preventAutoFrame: boolean;
  setMarkers: (markers: MapMarker[]) => void;
  clearMarkers: () => void;
  setCameraTarget: (target: Map3DCameraProps | null) => void;
  setPreventAutoFrame: (prevent: boolean) => void;
}>(set => ({
  markers: [],
  cameraTarget: null,
  preventAutoFrame: false,
  setMarkers: markers => set({ markers }),
  clearMarkers: () => set({ markers: [] }),
  setCameraTarget: target => set({ cameraTarget: target }),
  setPreventAutoFrame: prevent => set({ preventAutoFrame: prevent }),
}));
