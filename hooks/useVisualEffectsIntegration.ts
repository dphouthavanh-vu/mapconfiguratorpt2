/**
 * T028: Visual Effects Integration Hook
 * Orchestrates all visual effect hooks with the Cesium viewer
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useVisualSettings } from '../context/VisualSettingsContext';
import { useAtmosphereEffects } from './useAtmosphereEffects';
import { useTerrainVisualization } from './useTerrainVisualization';
import { useWaterRendering } from './useWaterRendering';
import { useWeatherSystem } from './useWeatherSystem';
import { usePostProcessing } from './usePostProcessing';
import { useCameraAnimation } from './useCameraAnimation';
import { useLandmarkVisuals } from './useLandmarkVisuals';
import type { Landmark } from '../components/CesiumGlobe/data/types';

interface UseVisualEffectsIntegrationProps {
  viewer: any; // Cesium.Viewer
  landmarks?: Landmark[];
  enabled?: boolean;
}

/**
 * Master hook that integrates all visual effects with Cesium viewer
 */
export function useVisualEffectsIntegration({
  viewer,
  landmarks = [],
  enabled = true
}: UseVisualEffectsIntegrationProps) {
  const { config, performanceMetrics, setCesiumViewer, getPerformanceStats } = useVisualSettings();
  const [isIntegrationReady, setIsIntegrationReady] = useState(false);
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const initRef = useRef(false);

  // Initialize viewer in context
  useEffect(() => {
    if (viewer && setCesiumViewer && !initRef.current) {
      setCesiumViewer(viewer);
      initRef.current = true;
      setIsIntegrationReady(true);
    }
  }, [viewer, setCesiumViewer]);

  // Individual effect hooks
  const atmosphere = useAtmosphereEffects(viewer, enabled && config.atmosphere.enabled);
  const terrain = useTerrainVisualization(viewer, enabled && config.terrain.enabled);
  const water = useWaterRendering(viewer, enabled && config.water.enabled);
  const weather = useWeatherSystem(viewer, enabled && (
    config.weather.clouds.enabled || 
    config.weather.fog.enabled || 
    config.weather.precipitation.enabled
  ));
  const postProcessing = usePostProcessing(viewer, enabled && (
    config.postProcessing.fxaa.enabled ||
    config.postProcessing.bloom.enabled ||
    config.postProcessing.ambientOcclusion.enabled ||
    config.postProcessing.colorCorrection.enabled
  ));
  const camera = useCameraAnimation(viewer, enabled);
  const landmarkVisuals = useLandmarkVisuals(
    viewer,
    landmarks,
    enabled && landmarks.length > 0
  );

  // Track active effects
  useEffect(() => {
    const effects = new Set<string>();
    
    if (atmosphere.isEnabled) effects.add('atmosphere');
    if (terrain.isEnabled) effects.add('terrain');
    if (water.isEnabled) effects.add('water');
    if (weather.isEnabled) effects.add('weather');
    if (postProcessing.isEnabled) effects.add('postProcessing');
    if (camera.isAnimating) effects.add('cameraAnimation');
    if (landmarkVisuals.isEnabled) effects.add('landmarks');
    
    setActiveEffects(effects);
  }, [
    atmosphere.isEnabled,
    terrain.isEnabled,
    water.isEnabled,
    weather.isEnabled,
    postProcessing.isEnabled,
    camera.isAnimating,
    landmarkVisuals.isEnabled
  ]);

  // Apply all effects when config changes
  useEffect(() => {
    if (!viewer || !enabled || !isIntegrationReady) return;

    // Apply effects in order of dependency
    const applyEffects = async () => {
      try {
        // 1. Terrain first (affects other visuals)
        if (config.terrain.enabled) {
          await terrain.applyTerrainSettings(viewer, config.terrain);
        }

        // 2. Atmosphere (affects lighting)
        if (config.atmosphere.enabled) {
          atmosphere.applyAtmosphereSettings(viewer, config.atmosphere);
        }

        // 3. Water (depends on terrain)
        if (config.water.enabled) {
          water.applyWaterSettings(viewer, config.water);
        }

        // 4. Weather (can affect atmosphere/fog)
        if (config.weather.clouds.enabled || 
            config.weather.fog.enabled || 
            config.weather.precipitation.enabled) {
          weather.applyWeatherSettings(viewer, config.weather);
        }

        // 5. Post-processing (final layer)
        if (config.postProcessing.fxaa.enabled ||
            config.postProcessing.bloom.enabled ||
            config.postProcessing.ambientOcclusion.enabled ||
            config.postProcessing.colorCorrection.enabled) {
          postProcessing.applyPostProcessingSettings(viewer, config.postProcessing);
        }

        // 6. Camera settings
        camera.applyCameraSettings?.(viewer, config.camera);

        // Request render
        viewer.scene?.requestRender?.();
      } catch (error) {
        console.error('Error applying visual effects:', error);
      }
    };

    applyEffects();
  }, [
    viewer,
    enabled,
    isIntegrationReady,
    config,
    atmosphere,
    terrain,
    water,
    weather,
    postProcessing,
    camera
  ]);

  // Reset all effects
  const resetAllEffects = useCallback(() => {
    if (!viewer) return;

    atmosphere.resetAtmosphere(viewer);
    terrain.resetTerrain(viewer);
    water.resetWater(viewer);
    weather.resetWeather(viewer);
    postProcessing.resetPostProcessing(viewer);
    landmarkVisuals.clearAllLandmarkEntities();
    
    viewer.scene?.requestRender?.();
  }, [viewer, atmosphere, terrain, water, weather, postProcessing, landmarkVisuals]);

  // Get combined status
  const getStatus = useCallback(() => {
    const performanceStats = getPerformanceStats?.();
    
    return {
      isReady: isIntegrationReady,
      activeEffects: Array.from(activeEffects),
      performance: {
        current: performanceMetrics,
        stats: performanceStats?.statistics,
        health: performanceStats?.health,
        trend: performanceStats?.trend
      },
      effects: {
        atmosphere: atmosphere.getAtmosphereState?.(),
        terrain: terrain.getTerrainState?.(),
        water: water.getWaterState?.(),
        weather: weather.getWeatherState?.(),
        postProcessing: postProcessing.getPostProcessingState?.(),
        camera: camera.getCameraState(),
        landmarks: landmarkVisuals.getLandmarkState()
      }
    };
  }, [
    isIntegrationReady,
    activeEffects,
    performanceMetrics,
    getPerformanceStats,
    atmosphere,
    terrain,
    water,
    weather,
    postProcessing,
    camera,
    landmarkVisuals
  ]);

  // Check if camera is underwater for special effects
  useEffect(() => {
    if (!viewer || !water.isCameraUnderwater) return;

    const checkUnderwater = () => {
      const isUnderwater = water.isCameraUnderwater();
      water.applyUnderwaterEffects?.(isUnderwater);
    };

    // Check on camera move
    viewer.camera.moveEnd.addEventListener(checkUnderwater);
    
    return () => {
      viewer.camera.moveEnd.removeEventListener(checkUnderwater);
    };
  }, [viewer, water]);

  // Weather presets
  const setWeatherPreset = useCallback((
    preset: 'clear' | 'cloudy' | 'foggy' | 'rainy' | 'snowy' | 'stormy'
  ) => {
    weather.setWeatherPreset(preset);
  }, [weather]);

  // Camera presets
  const flyToLandmark = useCallback((landmarkId: string, animated: boolean = true) => {
    const landmark = landmarks.find(l => l.id === landmarkId);
    if (!landmark) return;

    camera.flyTo({
      longitude: landmark.longitude,
      latitude: landmark.latitude,
      height: landmark.altitude || 1000
    }, {
      duration: animated ? 3000 : 0,
      easing: 'easeInOut'
    });

    landmarkVisuals.focusOnLandmark(landmarkId, animated);
  }, [camera, landmarkVisuals, landmarks]);

  return {
    // Status
    isReady: isIntegrationReady,
    activeEffects,
    getStatus,

    // Controls
    resetAllEffects,
    setWeatherPreset,
    flyToLandmark,

    // Individual effect controls
    atmosphere,
    terrain,
    water,
    weather,
    postProcessing,
    camera,
    landmarks: landmarkVisuals,

    // Performance
    performanceMetrics
  };
}