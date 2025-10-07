import { useRef, useState, useCallback, useEffect } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { motion } from 'framer-motion';
import { ArrowLeft, Map, RotateCcw } from 'lucide-react';
import { Landmark } from './data/types';
import { handlePinClick, handleClusterZoom } from './utils/cesiumUtils';
import { calculateClusteringParameters } from './utils/scalingUtils';

// import ZoomOverlayButton from './components/ZoomOverlayButton'; // Unused import

import FullscreenModal from './components/FullscreenModal';
import AtmosphereDebugPanel from './components/AtmosphereDebugPanel';
import { useLandmarkMarkerImages } from './hooks/useLandmarkMarkerImages';
import { useCesiumViewerSetup } from './hooks/useCesiumViewerSetup';
import { useFlyThroughEntity } from './hooks/useFlyThroughEntity';
import { useOverlayLogoMeasurement } from './hooks/useOverlayLogoMeasurement';
import { useAtmosphereConfig } from './hooks/useAtmosphereConfig';
import { useDepthLayers } from './hooks/useDepthLayers';



// const ATL_HEIGHT = 2000; // meters above ground for zoom target
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';



// Props for CesiumGlobe component
interface CesiumGlobeProps {
  landmarks?: Landmark[];
  title?: string;
  geoBounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } | null;
  onBackToMaps?: () => void;
  onView2D?: () => void;
}

const CesiumGlobe = ({ landmarks: landmarksProp = [], title, geoBounds, onBackToMaps, onView2D }: CesiumGlobeProps) => {
  console.log('[CesiumGlobe] Received landmarks:', landmarksProp);
  console.log('[CesiumGlobe] Title:', title);
  console.log('[CesiumGlobe] Geographic bounds:', geoBounds);

  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const rotatingRef = useRef(true);
  const entityRefs = useRef<Cesium.Entity[]>([]);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showReset, setShowReset] = useState(false);
  const spinningStopped = useRef(false);
  const fastSpinActive = useRef(false);
  const spinLongitudeRef = useRef(-30);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeLandmarkIdx, setActiveLandmarkIdx] = useState<number | null>(null);
  const fitDistanceRef = useRef<number>(20000000); // Default fallback, will be updated from config
  const isUserInteracting = useRef(false);
  const interactionTimeout = useRef<NodeJS.Timeout | null>(null);

  // Atmosphere debug configuration
  const {
    config: atmosphereConfig,
    updateConfig: updateAtmosphereConfig,
    resetToDefaults: resetAtmosphere,
    loadPreset: loadAtmospherePreset,
    exportConfig: exportAtmosphereConfig,
    isDebugPanelOpen,
    toggleDebugPanel,
  } = useAtmosphereConfig();
  const previousCameraStateRef = useRef<{
    position: Cesium.Cartesian3;
    direction: Cesium.Cartesian3;
    up: Cesium.Cartesian3;
    right: Cesium.Cartesian3;
  } | null>(null);
  const spinAndZoomFinalPositionRef = useRef<{
    destination: Cesium.Cartesian3;
    orientation: {
      heading: number;
      pitch: number;
      roll: number;
    };
  } | null>(null);
  const spinAndZoomClusteringParamsRef = useRef<{
    pixelRange: number;
    minimumClusterSize: number;
    clusteringMode: string;
  } | null>(null);
  const disableAdaptiveClusteringRef = useRef(false);
  const clusteringRestoreTimeRef = useRef<number | null>(null);
  const isInteractingWithClusterRef = useRef(false);
  const lastClusterZoomHeightRef = useRef<number | null>(null);
  const [showFlyThroughEntity, setShowFlyThroughEntity] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(true);
  const [atmosphereIntensityProgress, setAtmosphereIntensityProgress] = useState(0);
  const [globeOpacity, setGlobeOpacity] = useState(0);


  const flyThroughPrimitiveRef = useRef<Cesium.Primitive | null>(null);
  const flyThroughPositionRef = useRef<{ lon: number; lat: number; height: number }>({ lon: 0, lat: 0, height: 100000 });
  // Overlay DOM refs and state (restored)
  const overlayLogoRef = useRef<HTMLElement | null>(null);
  const [logoSize, setLogoSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [logoOpacity, setLogoOpacity] = useState<number>(0);
  const logoSizePx = Math.max(80, Math.min(240, Math.round((logoSize.width + logoSize.height) / 4)));

  // Use landmarks from props (or empty array if not provided)
  const LANDMARKS = landmarksProp;
  const landmarksLoading = false;
  const landmarksError = null;

  console.log('[CesiumGlobe] LANDMARKS array:', LANDMARKS);
  console.log('[CesiumGlobe] LANDMARKS count:', LANDMARKS?.length || 0);

  // Animation loop for globe rotation (spin on Y axis)
  const animate = useCallback(() => {
    if (!rotatingRef.current || spinningStopped.current || isUserInteracting.current) return;
    // Reverse direction: decrement longitude
    const spinSpeed = fastSpinActive.current ? 0.5 : 0.02; // Fast spin if active
    spinLongitudeRef.current -= spinSpeed; // negative for opposite direction
    if (spinLongitudeRef.current < -180) spinLongitudeRef.current += 360;
    if (viewerRef.current) {
      viewerRef.current.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          spinLongitudeRef.current,
          0,  // Changed from 20 to 0 to look at center of globe
          fitDistanceRef.current
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0
        }
      });

      // Removed pulsing animation to prevent conflicts with atmosphere configuration updates
      // The pulsing was causing flickering and preventing debug panel changes from applying
      // Now atmosphere values are only set by the configuration effects, not the animation loop
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);






  // Static UI values (removed UI scaling)
  const getScaledFontSize = (size: number) => size;
  const getScaledPadding = (padding: number) => padding;
  const getScaledBorderRadius = (radius: number) => radius;
  const getUIScaledDimensions = (width: number, height: number) => ({ width, height });

  // Generate marker images with fixed font size
  const { markerImages, loading: markerImagesLoading } = useLandmarkMarkerImages(LANDMARKS, 20);

  // Setup Cesium viewer and entities with marker images
  const { entitiesReady, cesiumError, viewerReady } = useCesiumViewerSetup({
    cesiumContainerRef: cesiumContainerRef as React.RefObject<HTMLDivElement | null>,
    viewerRef,
    dataSourceRef,
    animationFrameRef,
    rotatingRef,
    spinLongitudeRef,
    fitDistanceRef,
    entityRefs,
    animate,
    MAPBOX_TOKEN,
    LANDMARKS,
    markerImages: markerImages,
    disableAdaptiveClusteringRef,
    clusteringRestoreTimeRef,
    isInteractingWithClusterRef,
    lastClusterZoomHeightRef,
    atmosphereConfig,
  });

  // Initial atmosphere setup - runs once when viewer is ready to ensure atmosphere is visible
  useEffect(() => {
    if (!viewerRef.current || !viewerReady) return;

    const viewer = viewerRef.current;

    // Set ALL atmosphere values at full strength initially
    // This ensures atmosphere is visible immediately

    // Apply atmosphere settings
    viewer.scene.globe.atmosphereHueShift = atmosphereConfig.atmosphere.hueShift;
    viewer.scene.globe.atmosphereSaturationShift = atmosphereConfig.atmosphere.saturationShift;
    viewer.scene.globe.atmosphereBrightnessShift = atmosphereConfig.atmosphere.brightnessShift;

    // Apply sky atmosphere settings (guard if not available in this Cesium build)
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.hueShift = atmosphereConfig.skyAtmosphere.hueShift;
      viewer.scene.skyAtmosphere.saturationShift = atmosphereConfig.skyAtmosphere.saturationShift;
      viewer.scene.skyAtmosphere.brightnessShift = atmosphereConfig.skyAtmosphere.brightnessShift;
    }

    // Apply scattering parameters
    // Note: atmosphereRayleighScattering and atmosphereMieScattering are not available in this Cesium version
    // These would control the scattering colors if available
    // viewer.scene.globe.atmosphereRayleighScattering = new Cesium.Cartesian3(
    //   atmosphereConfig.scattering.rayleighR,
    //   atmosphereConfig.scattering.rayleighG,
    //   atmosphereConfig.scattering.rayleighB
    // );
    // viewer.scene.globe.atmosphereMieScattering = new Cesium.Cartesian3(
    //   atmosphereConfig.scattering.mieScattering,
    //   atmosphereConfig.scattering.mieScattering,
    //   atmosphereConfig.scattering.mieScattering
    // );
    // viewer.scene.globe.atmosphereMieAnisotropy = atmosphereConfig.scattering.mieAnisotropy;

    // Apply atmosphere scale heights (thickness)
    viewer.scene.globe.atmosphereRayleighScaleHeight = atmosphereConfig.scattering.rayleighScaleHeight;
    viewer.scene.globe.atmosphereMieScaleHeight = atmosphereConfig.scattering.mieScaleHeight;

    // Also apply to sky atmosphere for consistency (guarded)
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.atmosphereRayleighScaleHeight = atmosphereConfig.scattering.rayleighScaleHeight;
      viewer.scene.skyAtmosphere.atmosphereMieScaleHeight = atmosphereConfig.scattering.mieScaleHeight;
    }

    // Apply lighting distances
    viewer.scene.globe.lightingFadeOutDistance = atmosphereConfig.lighting.fadeOutDistance;
    viewer.scene.globe.lightingFadeInDistance = atmosphereConfig.lighting.fadeInDistance;

    // Set initial light intensity (full strength, no progressive loading)
    viewer.scene.globe.atmosphereLightIntensity = atmosphereConfig.atmosphere.lightIntensity;
    viewer.scene.globe.lambertDiffuseMultiplier = atmosphereConfig.atmosphere.lightIntensity / 3.0;

    // Enable lighting for day/night shading
    viewer.scene.globe.enableLighting = true;

    // Request render to ensure Cesium updates the display
    viewer.scene.requestRender();
  }, [viewerReady, atmosphereConfig]); // Run when viewer becomes ready or config changes

  // Progressive atmosphere updates - apply progressive loading effects
  useEffect(() => {
    if (!viewerRef.current || !viewerReady) return;

    // Don't overwrite initial values when progress is 0
    if (atmosphereIntensityProgress === 0) return;

    const viewer = viewerRef.current;

    // Handle time of day control
    if (atmosphereConfig.timeOfDay.enabled) {
      // Create a date for today with the specified hour
      const date = new Date();
      const hours = Math.floor(atmosphereConfig.timeOfDay.hour);
      const minutes = Math.floor((atmosphereConfig.timeOfDay.hour % 1) * 60);
      date.setHours(hours, minutes, 0, 0);

      // Set the viewer's clock to this time
      viewer.clock.currentTime = Cesium.JulianDate.fromDate(date);
      viewer.clock.shouldAnimate = atmosphereConfig.timeOfDay.animationSpeed > 0;
      viewer.clock.multiplier = atmosphereConfig.timeOfDay.animationSpeed * 3600; // Convert hours per second

      // Use default sun light that follows the clock
      viewer.scene.light = new Cesium.SunLight();
      if (viewer.scene.sun) viewer.scene.sun.show = atmosphereConfig.sunVisuals.showSun;
    }
    // Handle custom sun position
    else if (atmosphereConfig.sunPosition.enabled) {
      // Smooth interpolation for sun position based on azimuth and elevation

      // Convert azimuth to hour of day (smooth linear mapping)
      // 0° = North (midnight), 90° = East (6am), 180° = South (noon), 270° = West (6pm)
      const az = atmosphereConfig.sunPosition.azimuth;

      // Smooth azimuth to hour conversion
      // Shift azimuth so 0° = 6am position (East)
      const shiftedAz = (az + 270) % 360; // Now 0° = 6am, 180° = 6pm
      const hour = 6 + (shiftedAz / 360) * 24; // Maps to 6am-6am next day
      const normalizedHour = hour % 24; // Keep in 0-24 range

      // For elevation, smoothly interpolate the day of year
      // Use sine curve to map elevation to day of year
      const elev = atmosphereConfig.sunPosition.elevation;

      // Map elevation (-90 to 90) to day of year
      // Summer solstice (day 172) = highest sun
      // Winter solstice (day 355) = lowest sun
      // The sun's elevation changes sinusoidally throughout the year

      // Normalize elevation to 0-1 range (0 = winter, 1 = summer)
      const elevNormalized = (elev + 90) / 180; // 0 to 1

      // Use cosine interpolation for smooth transition
      // Map to day of year: winter (355) -> spring (79) -> summer (172) -> fall (265) -> winter
      const yearProgress = elevNormalized; // 0 = winter, 0.5 = equinox, 1 = summer

      // Calculate day of year with smooth interpolation
      // Using a sine wave that peaks at summer solstice (day 172)
      const dayOfYear = 172 + Math.cos(yearProgress * Math.PI) * 183; // Oscillates between ~355 (winter) and ~172 (summer)

      // Convert day of year to month and day
      const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      let remainingDays = Math.floor(dayOfYear);
      let month = 0;

      while (remainingDays > daysInMonths[month] && month < 11) {
        remainingDays -= daysInMonths[month];
        month++;
      }

      // Create date with smoothly interpolated values
      const date = new Date(2024, month, remainingDays); // Use 2024 as a reference year
      const hours = Math.floor(normalizedHour);
      const minutes = Math.floor((normalizedHour % 1) * 60);
      const seconds = Math.floor(((normalizedHour * 60) % 1) * 60);
      date.setHours(hours, minutes, seconds, 0);

      // Set the viewer's clock to this time
      viewer.clock.currentTime = Cesium.JulianDate.fromDate(date);
      viewer.clock.shouldAnimate = false; // Keep it static

      // Use sun light for natural lighting and atmosphere alignment
      // The SunLight will make the atmosphere effects follow the sun position
      viewer.scene.light = new Cesium.SunLight();
      if (viewer.scene.sun) viewer.scene.sun.show = atmosphereConfig.sunVisuals.showSun;

      // Note: We're now using the clock time to position both the sun disk
      // AND the atmosphere effects, so they stay aligned.
      // The directional light override was causing the misalignment.
    } else {
      // Use default sun based on current time
      viewer.clock.shouldAnimate = false;
      viewer.scene.light = new Cesium.SunLight();
      viewer.scene.sun.show = atmosphereConfig.sunVisuals.showSun;
    }

    // Apply sun glow size (guard sun)
    if (viewer.scene.sun) viewer.scene.sun.glowFactor = atmosphereConfig.sunVisuals.glowSize;

    // Apply light intensity to atmosphere and globe with progressive loading
    const progressiveIntensity = atmosphereConfig.atmosphere.lightIntensity * atmosphereIntensityProgress;
    viewer.scene.globe.atmosphereLightIntensity = progressiveIntensity;

    // Scale the lambert diffuse for terrain lighting with progressive loading
    // Default is 1.0, scale it based on our intensity (3.0 default = 1.0 lambert)
    viewer.scene.globe.lambertDiffuseMultiplier = (atmosphereConfig.atmosphere.lightIntensity * atmosphereIntensityProgress) / 3.0;

    // Apply color temperature to atmosphere
    const temp = atmosphereConfig.sunVisuals.colorTemperature;
    const colorShift = (temp - 0.5) * 0.2; // -0.1 to 0.1 range

    // Adjust atmosphere colors based on temperature and intensity with progressive loading
    // Scale brightness by light intensity for visual effect
    // const intensityFactor = (atmosphereConfig.atmosphere.lightIntensity * atmosphereIntensityProgress) / 3.0; // Unused

    // Calculate base brightness with progressive loading
    // Ensure atmosphere is always visible even when brightnessShift is 0
    const baseBrightness = 0.1; // Minimum brightness to ensure visibility
    const brightnessFade = baseBrightness * atmosphereIntensityProgress;

    if (temp < 0.5) {
      // Cool (bluish)
      viewer.scene.globe.atmosphereBrightnessShift = brightnessFade + (atmosphereConfig.atmosphere.brightnessShift - colorShift * 0.1) * atmosphereIntensityProgress;
      viewer.scene.globe.atmosphereHueShift = atmosphereConfig.atmosphere.hueShift + colorShift;
      viewer.scene.globe.atmosphereSaturationShift = atmosphereConfig.atmosphere.saturationShift + colorShift * 0.5;
    } else {
      // Warm (reddish/orange)
      viewer.scene.globe.atmosphereBrightnessShift = brightnessFade + (atmosphereConfig.atmosphere.brightnessShift + colorShift * 0.1) * atmosphereIntensityProgress;
      viewer.scene.globe.atmosphereHueShift = atmosphereConfig.atmosphere.hueShift + colorShift * 2;
      viewer.scene.globe.atmosphereSaturationShift = atmosphereConfig.atmosphere.saturationShift + colorShift * 0.3;
    }

    // Also apply intensity to sky atmosphere brightness with progressive loading (guard)
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.brightnessShift = baseBrightness * atmosphereIntensityProgress + atmosphereConfig.skyAtmosphere.brightnessShift * atmosphereIntensityProgress;
    }

    // Request render to ensure Cesium updates the display
    viewer.scene.requestRender();
  }, [atmosphereConfig, atmosphereIntensityProgress]); // Note: removed viewerReady since initial setup handles that

  // Note: Time of day animation is now handled by Cesium's clock multiplier
  // The clock.multiplier property controls animation speed when timeOfDay.enabled is true

  // Dynamic atmosphere lighting configuration
  useEffect(() => {
    if (!viewerRef.current || !viewerReady) return;

    const viewer = viewerRef.current;
    const globe = viewer.scene.globe;

    // Apply dynamic atmosphere lighting settings
    globe.dynamicAtmosphereLighting = atmosphereConfig.lighting.dynamicAtmosphereLighting;
    globe.dynamicAtmosphereLightingFromSun = atmosphereConfig.lighting.dynamicAtmosphereLightingFromSun;

    // Set minimum brightness for night side
    if (atmosphereConfig.lighting.dynamicAtmosphereLighting) {
      // Cesium's atmosphere intensity on night side
      // const nightFactor = atmosphereConfig.lighting.nightIntensity; // Unused
      const minBrightness = atmosphereConfig.lighting.minimumBrightness;

      // Adjust the base atmosphere brightness to maintain visibility
      const currentBrightness = globe.atmosphereBrightnessShift;
      const adjustedBrightness = Math.max(currentBrightness, minBrightness - 1.0);
      globe.atmosphereBrightnessShift = adjustedBrightness;

    }

    // Request render to apply changes
    viewer.scene.requestRender();
  }, [viewerReady, atmosphereConfig.lighting]);

  // Bloom effect management
  useEffect(() => {
    if (!viewerRef.current || !viewerReady) return;

    const viewer = viewerRef.current;
    const scene = viewer.scene;

    // Cesium always has a built-in bloom stage - just use it directly
    if (scene.postProcessStages.bloom) {
      const bloom = scene.postProcessStages.bloom;

      // Enable/disable based on config
      bloom.enabled = atmosphereConfig.bloom.enabled;

      // Update uniforms when enabled
      if (atmosphereConfig.bloom.enabled) {
        bloom.uniforms.contrast = atmosphereConfig.bloom.contrast;
        bloom.uniforms.brightness = atmosphereConfig.bloom.brightness;
        bloom.uniforms.glowOnly = atmosphereConfig.bloom.glowOnly;
        bloom.uniforms.delta = atmosphereConfig.bloom.delta;
        bloom.uniforms.sigma = atmosphereConfig.bloom.sigma;
        bloom.uniforms.stepSize = atmosphereConfig.bloom.stepSize;

      }

      // Request render to apply changes
      scene.requestRender();
    } else {
      console.warn('⚠️ Bloom post-processing not available in this Cesium build');
    }
  }, [viewerReady, atmosphereConfig.bloom]);

  // Enable heavy effects immediately when viewer is ready
  useEffect(() => {
    if (!viewerReady) return;

    // Enable effects immediately so they're ready when globe fades in
    setInitialLoadComplete(true);
  }, [viewerReady]);

  // Hide loading indicator after globe is visible
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoadingIndicator(false);
    }, 2500); // Hide after globe has faded in

    return () => clearTimeout(timer);
  }, []);

  // Fade in logo first, then globe
  useEffect(() => {
    // Fade in logo after 200ms
    const logoTimer = setTimeout(() => {
      setLogoOpacity(1);
    }, 200);

    return () => clearTimeout(logoTimer);
  }, []);

  // Fade in globe after logo
  useEffect(() => {
    if (!viewerReady) return;

    // Wait 1500ms for initial setup, then fade in over 1.5s
    const timer = setTimeout(() => {
      setGlobeOpacity(1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [viewerReady]);

  // Progressive atmosphere intensity animation
  useEffect(() => {
    if (!viewerReady) return;

    const duration = 2000; // 2 seconds
    const startTime = Date.now();
    let animationFrame: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use ease-in-out cubic for smooth transition
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      setAtmosphereIntensityProgress(eased);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [viewerReady]);

  // Initial camera ease-in animation on load
  useEffect(() => {
    if (!viewerReady) return;

    const startDistance = 5000000;  // 5,000 km - closer start for smoother zoom
    const endDistance = 14900000;   // 14,900 km
    const duration = 4500;           // 4.5 seconds - longer for smoother animation
    const startTime = Date.now();

    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-in-out cubic function for smooth acceleration/deceleration
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const currentDistance = startDistance + (endDistance - startDistance) * eased;
      fitDistanceRef.current = currentDistance;

      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else {
      }
    };

    requestAnimationFrame(animateCamera);
  }, [viewerReady]); // Only run once on initial load

  // Apply camera distance changes
  useEffect(() => {
    if (!viewerRef.current || !viewerReady) return;

    const viewer = viewerRef.current;

    // Update the fitDistance reference for animation
    fitDistanceRef.current = atmosphereConfig.camera.distance;

    // Set min/max zoom distances - use a much lower minimum to allow close zooming
    // Don't use atmosphereConfig.camera.minDistance (7000km) as it prevents zooming to landmarks
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100; // 100 meters minimum
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = atmosphereConfig.camera.maxDistance;

    // If not user interacting and auto-rotating, update camera position
    if (!isUserInteracting.current && rotatingRef.current && !spinningStopped.current) {
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          spinLongitudeRef.current,
          0,  // Changed from 20 to 0 to look at center of globe
          atmosphereConfig.camera.distance
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0
        }
      });
    } else if (!isUserInteracting.current) {
      // If not rotating but also not user interacting, smoothly transition to new distance
      const currentPosition = viewer.camera.positionCartographic;
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          Cesium.Math.toDegrees(currentPosition.longitude),
          Cesium.Math.toDegrees(currentPosition.latitude),
          atmosphereConfig.camera.distance
        )
        // duration: 1.0 // Not supported in setView, only in flyTo
      });
    }
  }, [atmosphereConfig.camera, viewerReady, rotatingRef.current, spinningStopped.current]);

  // Camera positioning is now handled by clicking on landmarks
  // The globe starts with default view and auto-rotation

  // Add mouse interaction handlers to pause/resume auto-rotation
  useEffect(() => {
    if (!viewerRef.current || !viewerReady) return;

    const viewer = viewerRef.current;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // Helper function to get current camera position in degrees
    const getCurrentCameraLongitude = () => {
      const camera = viewer.camera;
      const position = camera.positionCartographic;
      return Cesium.Math.toDegrees(position.longitude);
    };

    // Pause rotation on mouse down (left button)
    handler.setInputAction(() => {
      isUserInteracting.current = true;
      if (interactionTimeout.current) {
        clearTimeout(interactionTimeout.current);
        interactionTimeout.current = null;
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    // Pause rotation on mouse down (right button for context menu)
    handler.setInputAction(() => {
      isUserInteracting.current = true;
      if (interactionTimeout.current) {
        clearTimeout(interactionTimeout.current);
        interactionTimeout.current = null;
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_DOWN);

    // Resume rotation after delay on mouse up
    handler.setInputAction(() => {
      // Update spin longitude to current camera position for smooth resume
      if (isUserInteracting.current && !spinningStopped.current) {
        spinLongitudeRef.current = getCurrentCameraLongitude();
      }

      // Set timeout to resume rotation after 3 seconds of no interaction
      if (!spinningStopped.current) {
        interactionTimeout.current = setTimeout(() => {
          isUserInteracting.current = false;
        }, 3000);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    // Also handle right mouse up
    handler.setInputAction(() => {
      if (isUserInteracting.current && !spinningStopped.current) {
        spinLongitudeRef.current = getCurrentCameraLongitude();
      }

      if (!spinningStopped.current) {
        interactionTimeout.current = setTimeout(() => {
          isUserInteracting.current = false;
        }, 3000);
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_UP);

    // Handle mouse wheel for zoom (pause rotation during zoom)
    handler.setInputAction(() => {
      isUserInteracting.current = true;
      if (interactionTimeout.current) {
        clearTimeout(interactionTimeout.current);
      }

      if (!spinningStopped.current) {
        interactionTimeout.current = setTimeout(() => {
          isUserInteracting.current = false;
          if (!spinningStopped.current && viewerRef.current) {
            spinLongitudeRef.current = getCurrentCameraLongitude();
          }
        }, 3000);
      }
    }, Cesium.ScreenSpaceEventType.WHEEL);

    return () => {
      handler.destroy();
      if (interactionTimeout.current) {
        clearTimeout(interactionTimeout.current);
      }
    };
  }, [viewerReady]);

  // Add visual depth layers (particles, rings, stars) - defer until after initial load for smoother start
  const depthLayersConfig = {
    particles: {
      enabled: initialLoadComplete && atmosphereConfig.depthLayers.particles.enabled,
      count: atmosphereConfig.depthLayers.particles.count,
      speed: atmosphereConfig.depthLayers.particles.speed,
      sizeMin: atmosphereConfig.depthLayers.particles.sizeMin,
      sizeMax: atmosphereConfig.depthLayers.particles.sizeMax,
      opacityMin: atmosphereConfig.depthLayers.particles.opacityMin,
      opacityMax: atmosphereConfig.depthLayers.particles.opacityMax,
    },
    orbitalRings: {
      enabled: initialLoadComplete && atmosphereConfig.depthLayers.orbitalRings.enabled,
      count: atmosphereConfig.depthLayers.orbitalRings.count,
      opacity: atmosphereConfig.depthLayers.orbitalRings.opacity,
      rotationSpeed: atmosphereConfig.depthLayers.orbitalRings.rotationSpeed,
    },
    starField: {
      enabled: initialLoadComplete && atmosphereConfig.depthLayers.starField.enabled,
      count: atmosphereConfig.depthLayers.starField.count,
      brightness: atmosphereConfig.depthLayers.starField.brightness,
    },
  };

  useDepthLayers(viewerRef, viewerReady, depthLayersConfig);

  // Track cluster interaction state but don't auto re-enable
  // Users will use the reset/go back button to return to map view
  useEffect(() => {
    if (!viewerRef.current || !viewerReady) return;

    const handleCameraMove = () => {
      if (!isInteractingWithClusterRef.current || !viewerRef.current) return;

      const currentHeight = viewerRef.current.camera.positionCartographic?.height || 0;
      // const currentHeightKm = currentHeight / 1000; // Unused

      // Just log the camera movement for debugging
      if (lastClusterZoomHeightRef.current) {
        const heightDifference = Math.abs(currentHeight - lastClusterZoomHeightRef.current);
        // const percentChange = heightDifference / lastClusterZoomHeightRef.current; // Unused

      }
    };

    viewerRef.current.camera.moveEnd.addEventListener(handleCameraMove);

    return () => {
      if (viewerRef.current) {
        viewerRef.current.camera.moveEnd.removeEventListener(handleCameraMove);
      }
    };
  }, [viewerReady]);

  // Set up click handler once when entities are ready
  const setupClickHandler = useCallback(() => {
    if (!entitiesReady || !viewerRef.current) return;

    const viewer = viewerRef.current;

    // Remove any existing click handler first
    viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Set up the new click handler
    viewer.screenSpaceEventHandler.setInputAction((movement: unknown) => {
      const pos = ((movement as { position?: unknown }).position) as unknown as Cesium.Cartesian2;
      const pickedObject = viewer.scene.pick(pos);

      if (pickedObject) {

        // Debug: Log the full structure of the picked object
        if (pickedObject.id) {
        }

        if (pickedObject.primitive) {
        }
      } else {
      }

      // Check if this is a cluster click first
      if (pickedObject && pickedObject.id && pickedObject.id.clusteredEntities) {
        const clusteredEntities = pickedObject.id.clusteredEntities;

        // Use the dedicated cluster zoom utility
        handleClusterZoom(viewer, clusteredEntities, rotatingRef, animationFrameRef, undefined, lastClusterZoomHeightRef);

        // Disable adaptive clustering permanently until user clicks reset/go back
        isInteractingWithClusterRef.current = true;
        disableAdaptiveClusteringRef.current = true;

        return; // Exit early, don't process as individual landmark click
      }

      // Also check if cluster is accessed via primitive
      if (pickedObject && pickedObject.primitive && pickedObject.primitive.clusteredEntities) {
        const clusteredEntities = pickedObject.primitive.clusteredEntities;

        // Use the dedicated cluster zoom utility
        // Mark that this is a cluster zoom to prevent storing camera position
        // const isClusterZoom = true; // Unused
        handleClusterZoom(viewer, clusteredEntities, rotatingRef, animationFrameRef, undefined, lastClusterZoomHeightRef);

        // Disable adaptive clustering permanently until user clicks reset/go back
        isInteractingWithClusterRef.current = true;
        disableAdaptiveClusteringRef.current = true;

        return; // Exit early, don't process as individual landmark click
      }

      // Pin/entity click logic (existing code)
      if (pickedObject && pickedObject.id && pickedObject.id.properties) {
        const lon = pickedObject.id.properties.lon?.getValue();
        const lat = pickedObject.id.properties.lat?.getValue();
        const height = pickedObject.id.properties.height?.getValue() ?? 0;

        // Store current camera state before zooming in
        if (viewerRef.current) {
          previousCameraStateRef.current = {
            position: viewerRef.current.camera.position.clone(),
            direction: viewerRef.current.camera.direction.clone(),
            up: viewerRef.current.camera.up.clone(),
            right: viewerRef.current.camera.right.clone(),
          };
        }

        // Note: We'll apply exact clustering parameters (3, 3, 7) directly in "go back to map"

        handlePinClick(viewerRef.current, rotatingRef, animationFrameRef, lon, lat, height);

        // Find the landmark index by matching lon/lat
        const idx = LANDMARKS.findIndex((lm: Landmark) => lm.lon === lon && lm.lat === lat);
        if (viewerRef.current) {
          // Show modal after camera finishes moving
          const showModal = () => {
            setActiveLandmarkIdx(idx);
            setModalOpen(true);
            viewerRef.current!.scene.camera.moveEnd.removeEventListener(showModal);
          };
          viewerRef.current.scene.camera.moveEnd.addEventListener(showModal);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }, [entitiesReady, LANDMARKS]);

  // Call setupClickHandler when entities become ready
  if (entitiesReady && viewerRef.current) {
    setupClickHandler();
  }




  // State to hold the captured logo size for the fly-through entity
  const [capturedLogoSize, setCapturedLogoSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });



  useFlyThroughEntity({
    viewerRef,
    showFlyThroughEntity,
    flyThroughPrimitiveRef,
    flyThroughPositionRef,
    logoSize: capturedLogoSize, // Use the captured logo size
  });



  // Logo measurement hook - measure the overlay logo DOM and update logoSize
  useOverlayLogoMeasurement({
    overlayLogoRef,
    setLogoSize,
    logoSizePx,
    showOverlay,
    entitiesReady,
  });

  // Debug effect to monitor fly-through entity state
  useEffect(() => {
  }, [showFlyThroughEntity]);



  // Smart spin that ends positioned over landmarks
  const handleZoomToAllWithSpin = () => {
    if (!entitiesReady) {
      console.warn('Entities/data source not ready for zoom!');
      return;
    }
    setShowReset(true);

    // Calculate the center of all landmarks first
    const positions = entityRefs.current.map((entity, index) => {
      if (entity.properties) {
        const lon = entity.properties.lon?.getValue();
        const lat = entity.properties.lat?.getValue();
        const height = entity.properties.height?.getValue() ?? 0;

        console.log(`[SmartAnimateRotateToShow] Entity ${index} position:`, { lon, lat, height });

        // Validate coordinates
        if (!isFinite(lon) || !isFinite(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
          console.warn(`[SmartAnimateRotateToShow] Invalid coordinates for entity ${index}:`, { lon, lat });
          return null;
        }

        return Cesium.Cartesian3.fromDegrees(lon, lat, height);
      }
      console.warn(`[SmartAnimateRotateToShow] Entity ${index} has no properties`);
      return null;
    }).filter(pos => pos !== null);

    if (positions.length === 0) {
      console.error('[SmartAnimateRotateToShow] No valid positions found for entities');
      return;
    }

    console.log(`[SmartAnimateRotateToShow] Creating bounding sphere from ${positions.length} positions`);
    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
    const centerCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(boundingSphere.center);
    const targetLon = Cesium.Math.toDegrees(centerCartographic.longitude);
    // const targetLat = Cesium.Math.toDegrees(centerCartographic.latitude); // Unused

    // We'll set the fly-through entity position after the zoom completes
    // so we can position it relative to the final camera height

    // Start the smart spin that will end over landmarks
    fastSpinActive.current = true;
    spinningStopped.current = false;
    rotatingRef.current = true;

    // Get ACTUAL current camera state - EVERYTHING
    let startLon = 0;
    let startLat = 0;
    let startHeight = fitDistanceRef.current;
    let startHeading = 0;
    let startPitch = Cesium.Math.toRadians(-90);
    let startRoll = 0;

    if (viewerRef.current) {
      // Get actual current position
      const currentPos = viewerRef.current.camera.position;
      const currentCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(currentPos);
      startLon = Cesium.Math.toDegrees(currentCartographic.longitude);
      startLat = Cesium.Math.toDegrees(currentCartographic.latitude);
      startHeight = currentCartographic.height;

      // Get actual current orientation
      startHeading = viewerRef.current.camera.heading;
      startPitch = viewerRef.current.camera.pitch;
      startRoll = viewerRef.current.camera.roll;

    }

    const startTime = Date.now();
    const spinDuration = 3500; // 3.5 seconds for smoother animation

    // Calculate the shortest path to target longitude
    let deltaLon = targetLon - startLon;
    if (deltaLon > 180) deltaLon -= 360;
    if (deltaLon < -180) deltaLon += 360;

    // Add just one extra rotation for visual effect (1 full rotation plus the delta)
    const totalRotation = deltaLon + (360); // 360 degrees = 1 full rotation

    const smartAnimate = () => {
      if (!rotatingRef.current || spinningStopped.current) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);

      // Ultra-smooth easing with VERY slow start and VERY slow landing
      let easeOut;
      if (progress < 0.35) {
        // First 35%: ULTRA slow start (higher power for even slower start)
        const startProgress = progress / 0.35;
        easeOut = Math.pow(startProgress, 6) * 0.1; // Power of 6 for extremely slow start
      } else if (progress < 0.65) {
        // Middle 30%: gradual acceleration to peak speed
        const midProgress = (progress - 0.35) / 0.3;
        // Smooth S-curve for middle section
        easeOut = 0.1 + (midProgress * midProgress * (3 - 2 * midProgress)) * 0.7;
      } else if (progress < 0.85) {
        // Next 20%: start deceleration
        const slowProgress = (progress - 0.65) / 0.2;
        // Inverse cubic for smooth deceleration start
        easeOut = 0.8 + (1 - Math.pow(1 - slowProgress, 3)) * 0.15;
      } else {
        // Last 15%: ULTRA slow landing (higher power for slower approach)
        const landProgress = (progress - 0.85) / 0.15;
        // Use inverse high power for very gentle landing
        easeOut = 0.95 + (1 - Math.pow(1 - landProgress, 5)) * 0.05;
      }

      // Calculate current longitude
      const currentRotation = totalRotation * easeOut;
      let currentLon = startLon + currentRotation;

      // Normalize longitude for camera positioning
      while (currentLon > 180) currentLon -= 360;
      while (currentLon < -180) currentLon += 360;

      // Update the ref with normalized value
      spinLongitudeRef.current = currentLon;

      if (viewerRef.current) {
        // Interpolate all camera properties smoothly
        const targetLat = 20; // Target latitude to look at during spin
        const targetHeight = fitDistanceRef.current;
        const targetHeading = 0;
        const targetPitch = Cesium.Math.toRadians(-90);
        const targetRoll = 0;

        // Smooth interpolation for all properties
        const currentLat = startLat + (targetLat - startLat) * easeOut;
        const currentHeight = startHeight + (targetHeight - startHeight) * easeOut;
        const currentHeading = startHeading + (targetHeading - startHeading) * easeOut;
        const currentPitch = startPitch + (targetPitch - startPitch) * easeOut;
        const currentRoll = startRoll + (targetRoll - startRoll) * easeOut;

        viewerRef.current.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            currentLon,
            currentLat,
            currentHeight
          ),
          orientation: {
            heading: currentHeading,
            pitch: currentPitch,
            roll: currentRoll
          }
        });
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(smartAnimate);
      } else {
        // Spin completed - now positioned over landmarks
        fastSpinActive.current = false;
        spinningStopped.current = true;
        rotatingRef.current = false;


        // Capture the current logo size before hiding the overlay
        const currentLogoSize = { ...logoSize };
        setCapturedLogoSize(currentLogoSize);

        // Show the fly-through entity at the current camera's target location (where overlay button is)
        if (viewerRef.current) {
          const cameraPos = viewerRef.current.camera.position;
          const cameraCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cameraPos);
          const cameraLon = Cesium.Math.toDegrees(cameraCartographic.longitude);
          const cameraLat = Cesium.Math.toDegrees(cameraCartographic.latitude);

          // Position the entity at a reasonable distance and height from the camera
          // const entityDistance = 10000000; // 10,000km - reasonable distance // Unused
          const heightOffset = 5000000; // 5,000km above ground - not too high

          // Use a simpler approach: position the entity at a fixed offset from camera
          // This gives us more control over the positioning
          const latOffset = -0.005; // 1 degree north of camera (smaller offset)
          const lonOffset = 0; // Same longitude as camera

          flyThroughPositionRef.current = {
            lon: cameraLon + lonOffset,
            lat: cameraLat + latOffset, // Move north slightly to avoid being too far south
            height: heightOffset // Fixed height above ground, not relative to camera
          };

        }

        // Show the fly-through entity right away with the captured logo size
        // setShowFlyThroughEntity(true);


        // Wait a bit longer to ensure logo measurement completes before hiding overlay
        setTimeout(() => {
          // Now hide the overlay after capturing the size
          setShowOverlay(false);
        }, 200); // Increased delay to ensure measurement completes

        // Use requestAnimationFrame to wait for DOM update before starting zoom operations
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (viewerRef.current && entityRefs.current.length > 0) {
              // Ensure the data source is properly attached
              if (dataSourceRef.current && !viewerRef.current.dataSources.contains(dataSourceRef.current)) {
                viewerRef.current.dataSources.add(dataSourceRef.current);
              }

              // Note: We'll store clustering parameters after the zoom completes when adaptive clustering has updated


              // Debug camera position
              const cameraPos = viewerRef.current.camera.position;
              const cameraCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cameraPos);
              const cameraLon = Cesium.Math.toDegrees(cameraCartographic.longitude);
              // const cameraLat = Cesium.Math.toDegrees(cameraCartographic.latitude); // Unused
              // const cameraHeight = cameraCartographic.height; // Unused


              // Force camera position if it's not where it should be
              if (Math.abs(cameraLon - targetLon) > 1) {
                viewerRef.current.camera.setView({
                  destination: Cesium.Cartesian3.fromDegrees(
                    targetLon,
                    0,  // Changed from 20 to 0 to look at center of globe
                    fitDistanceRef.current
                  ),
                  orientation: {
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-90),
                    roll: 0.0
                  }
                });

                // Wait a frame for the position to update
                requestAnimationFrame(() => {
                  const newPos = viewerRef.current!.camera.position;
                  const newCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(newPos);
                  // const newLon = Cesium.Math.toDegrees(newCartographic.longitude); // Unused



                  // Now do the zoom
                  viewerRef.current!.camera.flyToBoundingSphere(boundingSphere, {
                    duration: 5.0,
                    offset: new Cesium.HeadingPitchRange(0, -Math.PI / 2, boundingSphere.radius * 3),
                    complete: () => {
                      // Entity is already visible from when overlay was hidden

                      // Store the final position for "go back to map" functionality
                      if (viewerRef.current) {
                        // const cameraPos = viewerRef.current.camera.position; // Unused
                        // const cameraCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cameraPos); // Unused

                        spinAndZoomFinalPositionRef.current = {
                          destination: viewerRef.current.camera.position.clone(),
                          orientation: {
                            heading: viewerRef.current.camera.heading,
                            pitch: viewerRef.current.camera.pitch,
                            roll: viewerRef.current.camera.roll
                          }
                        };

                        // Note: Clustering parameters are now stored when a pin is clicked, not here
                      }
                    }
                  });
                });
              } else {



                // Do the zoom from current correct position
                viewerRef.current.camera.flyToBoundingSphere(boundingSphere, {
                  duration: 5.0,
                  offset: new Cesium.HeadingPitchRange(0, -Math.PI / 2, boundingSphere.radius * 3),
                  complete: () => {
                    // Entity is already visible from when overlay was hidden

                    // Store the final position for "go back to map" functionality
                    if (viewerRef.current) {
                      spinAndZoomFinalPositionRef.current = {
                        destination: viewerRef.current.camera.position.clone(),
                        orientation: {
                          heading: viewerRef.current.camera.heading,
                          pitch: viewerRef.current.camera.pitch,
                          roll: viewerRef.current.camera.roll
                        }
                      };

                      // Note: Clustering parameters are now stored when a pin is clicked, not here
                    }
                  }
                });
              }
            } else {
              console.warn('No entities available for zoom or viewer not ready');
            }
          }, 50); // Short delay after DOM update
        });
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(smartAnimate);
  };

  // Zoom back out to show all landmarks (reverse of pin zoom)
  const handleZoomBackOut = useCallback(() => {
    if (!viewerRef.current || !entitiesReady || entityRefs.current.length === 0) {
      console.warn('Cannot zoom out: viewer, entities, or entity refs not ready');
      return;
    }


    // Ensure rotation stays stopped and UI state is maintained
    rotatingRef.current = false;
    spinningStopped.current = true;
    fastSpinActive.current = false;

    // Hide the fly-through entity when zooming back out
    setShowFlyThroughEntity(false);

    // Clear the captured logo size to prevent re-use
    setCapturedLogoSize({ width: 0, height: 0 });

    // Clean up all fly-through primitives from the scene
    if (viewerRef.current && viewerRef.current.scene) {
      const scene = viewerRef.current.scene;

      // Find and remove all fly-through primitives
      for (let i = scene.primitives.length - 1; i >= 0; i--) {
        const primitive = scene.primitives.get(i);
        if (primitive &&
          primitive.appearance &&
          primitive.appearance.material &&
          primitive.appearance.material.uniforms &&
          primitive.appearance.material.uniforms.image &&
          primitive.appearance.material.uniforms.image.indexOf('tghMainLogo.svg') !== -1) {
          scene.primitives.remove(primitive);
        }
      }

      // Also clear the ref
      flyThroughPrimitiveRef.current = null;
    }

    // Cancel any ongoing animation frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Check if we have a stored position from spin and zoom
    if (spinAndZoomFinalPositionRef.current) {

      // Apply exact clustering parameters (3, 3, 7) for "go back to map"
      if (dataSourceRef.current && viewerRef.current) {

        // Log current clustering parameters before changes

        // Re-enable adaptive clustering since user is going back to map
        isInteractingWithClusterRef.current = false;
        lastClusterZoomHeightRef.current = null;
        disableAdaptiveClusteringRef.current = false;

        // Set the exact clustering parameters directly - use aggressive parameters to ensure clustering
        dataSourceRef.current.clustering.pixelRange = 90;
        dataSourceRef.current.clustering.minimumClusterSize = 3;


        // Force cluster regeneration multiple times to ensure it takes effect
        const forceClustering = () => {
          if (dataSourceRef.current && viewerRef.current) {
            // Re-apply parameters to ensure they stick
            dataSourceRef.current.clustering.pixelRange = 90;
            dataSourceRef.current.clustering.minimumClusterSize = 3;

            dataSourceRef.current.clustering.enabled = true;
            viewerRef.current.scene.requestRender();

            // Force a camera move to trigger clustering update
            const currentPosition = viewerRef.current.camera.position.clone();
            viewerRef.current.camera.setView({
              destination: currentPosition,
              orientation: {
                heading: viewerRef.current.camera.heading,
                pitch: viewerRef.current.camera.pitch,
                roll: viewerRef.current.camera.roll
              }
            });

            setTimeout(() => {
              if (dataSourceRef.current && viewerRef.current) {
                // Re-apply parameters again after re-enabling
                dataSourceRef.current.clustering.pixelRange = 90;
                dataSourceRef.current.clustering.minimumClusterSize = 3;
                dataSourceRef.current.clustering.enabled = true;
                viewerRef.current.scene.requestRender();

                // Add debugging to check if cluster event is being triggered
                if (dataSourceRef.current.clustering && dataSourceRef.current.clustering.clusterEvent) {
                  // Try to manually trigger a cluster update
                  dataSourceRef.current.clustering.enabled = false;
                  setTimeout(() => {
                    if (dataSourceRef.current) {
                      dataSourceRef.current.clustering.enabled = true;
                    }
                  }, 10);
                } else {
                }
              }
            }, 10);
          }
        };

        // Apply clustering multiple times to ensure it sticks
        forceClustering();
        setTimeout(forceClustering, 50);
        setTimeout(forceClustering, 100);
        setTimeout(forceClustering, 200);
        setTimeout(forceClustering, 500);

        // Record the time when parameters were applied
        clusteringRestoreTimeRef.current = Date.now();

        // Add additional verification after a longer delay
        setTimeout(() => {
          if (dataSourceRef.current && viewerRef.current) {

            // Debug: Log entity positions to understand clustering behavior
            const entities = dataSourceRef.current.entities.values;

            // Log positions of all entities to understand their spatial distribution
            const entityPositions = [];
            const northernEntities = [];

            for (let i = 0; i < entities.length; i++) {
              const entity = entities[i];
              if (entity.position) {
                const position = entity.position.getValue(Cesium.JulianDate.now());
                if (position) {
                  const cartographic = Cesium.Cartographic.fromCartesian(position);
                  const entityInfo = {
                    id: entity.id,
                    name: entity.name || 'No name',
                    description: entity.description || 'No description',
                    position: position,
                    cartographic: cartographic,
                    latitude: Cesium.Math.toDegrees(cartographic.latitude),
                    longitude: Cesium.Math.toDegrees(cartographic.longitude),
                    hasBillboard: !!entity.billboard,
                    hasLabel: !!entity.label,
                    hasPoint: !!entity.point
                  };

                  entityPositions.push(entityInfo);

                  // Check if this is a northern entity (latitude > 28 degrees - Tampa area)
                  if (entityInfo.latitude > 28) {
                    northernEntities.push(entityInfo);
                  }
                }
              }
            }


            // If we found northern entities, analyze their distances
            if (northernEntities.length >= 3) {

              // Calculate distances between northern entities
              for (let i = 0; i < northernEntities.length; i++) {
                for (let j = i + 1; j < northernEntities.length; j++) {
                  // const entity1 = northernEntities[i]; // Unused
                  // const entity2 = northernEntities[j]; // Unused

                  // Calculate distance in degrees
                  // const latDiff = Math.abs(entity1.latitude - entity2.latitude); // Unused
                  // const lonDiff = Math.abs(entity1.longitude - entity2.longitude); // Unused
                  // const distanceDegrees = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff); // Unused

                }
              }
            }

            // Analyze all entities for potential clustering issues
            const closeEntityGroups = [];

            for (let i = 0; i < entityPositions.length; i++) {
              for (let j = i + 1; j < entityPositions.length; j++) {
                const entity1 = entityPositions[i];
                const entity2 = entityPositions[j];

                // Calculate distance in degrees
                const latDiff = Math.abs(entity1.latitude - entity2.latitude);
                const lonDiff = Math.abs(entity1.longitude - entity2.longitude);
                const distanceDegrees = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);

                // If entities are very close (within 0.01 degrees), they should cluster
                if (distanceDegrees < 0.01) {

                  // Check if we already have a group for these entities
                  let foundGroup = false;
                  for (const group of closeEntityGroups) {
                    if (group.includes(entity1.id) || group.includes(entity2.id)) {
                      if (!group.includes(entity1.id)) group.push(entity1.id);
                      if (!group.includes(entity2.id)) group.push(entity2.id);
                      foundGroup = true;
                      break;
                    }
                  }

                  if (!foundGroup) {
                    closeEntityGroups.push([entity1.id, entity2.id]);
                  }
                }
              }
            }


            // Check for groups of 3 or more entities that should cluster
            const groupsOfThreeOrMore = closeEntityGroups.filter(group => group.length >= 3);

            // Log detailed information about each group
            for (let i = 0; i < groupsOfThreeOrMore.length; i++) {
              const group = groupsOfThreeOrMore[i];
              for (const entityId of group) {
                const entity = entityPositions.find(e => e.id === entityId);
                if (entity) {
                }
              }
            }

            // Check if clusters are actually visible

            // Check if entities are being clustered by looking at their visibility
            let visibleEntities = 0;
            let clusteredEntities = 0;
            for (let i = 0; i < entities.length; i++) {
              const entity = entities[i];
              if (entity.billboard) {
                const show = entity.billboard.show?.getValue(Cesium.JulianDate.now());
                if (show) {
                  visibleEntities++;
                } else {
                  clusteredEntities++;
                }
              }
            }

            // Check camera state and screen coordinates
            // const camera = viewerRef.current.camera; // Unused
            // const canvas = viewerRef.current.canvas; // Unused
            // const cameraHeight = camera.positionCartographic.height; // Unused
            // const screenWidth = canvas.width; // Unused
            // const screenHeight = canvas.height; // Unused


            // Check if entities are close enough in screen space to cluster

            // Specifically check the Healthpark area entities
            const healthparkEntities = entityPositions.filter(entity =>
              entity.name.includes('Healthpark') ||
              entity.name.includes('Family Care Center Healthpark') ||
              entity.name.includes('USF Internal Medicine Healthpark')
            );

            // healthparkEntities.forEach(entity => { // Unused
            // });

            // Check distances between Healthpark entities specifically
            if (healthparkEntities.length >= 2) {
              for (let i = 0; i < healthparkEntities.length; i++) {
                for (let j = i + 1; j < healthparkEntities.length; j++) {
                  const entity1 = healthparkEntities[i];
                  const entity2 = healthparkEntities[j];

                  // Calculate geographic distance
                  // const latDiff = Math.abs(entity1.latitude - entity2.latitude); // Unused
                  // const lonDiff = Math.abs(entity1.longitude - entity2.longitude); // Unused
                  // const distanceDegrees = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff); // Unused

                  // Convert to screen coordinates
                  const screenPos1 = Cesium.SceneTransforms.worldToWindowCoordinates(viewerRef.current.scene, entity1.position);
                  const screenPos2 = Cesium.SceneTransforms.worldToWindowCoordinates(viewerRef.current.scene, entity2.position);

                  if (screenPos1 && screenPos2) {
                    const screenDistance = Math.sqrt(
                      Math.pow(screenPos1.x - screenPos2.x, 2) +
                      Math.pow(screenPos1.y - screenPos2.y, 2)
                    );

                  }
                }
              }
            }

            // Check all entity pairs for screen distances
            for (let i = 0; i < Math.min(5, entityPositions.length); i++) {
              for (let j = i + 1; j < Math.min(5, entityPositions.length); j++) {
                const entity1 = entityPositions[i];
                const entity2 = entityPositions[j];

                // Convert to screen coordinates
                const screenPos1 = Cesium.SceneTransforms.worldToWindowCoordinates(viewerRef.current.scene, entity1.position);
                const screenPos2 = Cesium.SceneTransforms.worldToWindowCoordinates(viewerRef.current.scene, entity2.position);

                if (screenPos1 && screenPos2) {
                  // const screenDistance = Math.sqrt( // Unused
                  //   Math.pow(screenPos1.x - screenPos2.x, 2) +
                  //   Math.pow(screenPos1.y - screenPos2.y, 2)
                  // );

                }
              }
            }

            // Try to access the internal clustering state
            try {
              // Check if clustering is actually working by examining the clustering object

              // Check if there are any existing clusters (using a safer approach)
              try {
                const clustering = dataSourceRef.current.clustering as unknown as Record<string, unknown> | undefined;
                if (clustering && Object.prototype.hasOwnProperty.call(clustering, '_clusters')) {
                } else {
                }
              } catch (error) {
              }

              // Force a cluster update by temporarily disabling and re-enabling
              dataSourceRef.current.clustering.enabled = false;
              viewerRef.current.scene.requestRender();

              setTimeout(() => {
                if (dataSourceRef.current && viewerRef.current) {
                  dataSourceRef.current.clustering.pixelRange = 90;
                  dataSourceRef.current.clustering.minimumClusterSize = 3;
                  dataSourceRef.current.clustering.enabled = true;
                  viewerRef.current.scene.requestRender();


                  // Check again after forcing regeneration
                  setTimeout(() => {
                    let visibleAfterForce = 0;
                    let clusteredAfterForce = 0;
                    for (let i = 0; i < entities.length; i++) {
                      const entity = entities[i];
                      if (entity.billboard) {
                        const show = entity.billboard.show?.getValue(Cesium.JulianDate.now());
                        if (show) {
                          visibleAfterForce++;
                        } else {
                          clusteredAfterForce++;
                        }
                      }
                    }

                    // Check if clustering parameters are still correct
                    if (dataSourceRef.current && dataSourceRef.current.clustering) {
                    }
                  }, 100);
                }
              }, 50);
            } catch (error) {
            }
          }
        }, 1000);
      }

      // Fly back to the stored position from spin and zoom

      viewerRef.current.camera.flyTo({
        destination: spinAndZoomFinalPositionRef.current.destination,
        orientation: spinAndZoomFinalPositionRef.current.orientation,
        duration: 2.0,
        complete: () => {

          // Check clustering state after camera movement completes
          setTimeout(() => {
            if (dataSourceRef.current && viewerRef.current) {

              // Check entity visibility after camera movement
              const entities = dataSourceRef.current.entities.values;
              let visibleEntities = 0;
              let clusteredEntities = 0;
              for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];
                if (entity.billboard) {
                  const show = entity.billboard.show?.getValue(Cesium.JulianDate.now());
                  if (show) {
                    visibleEntities++;
                  } else {
                    clusteredEntities++;
                  }
                }
              }

              // Force one more clustering update after camera movement
              dataSourceRef.current.clustering.enabled = false;
              setTimeout(() => {
                if (dataSourceRef.current) {
                  dataSourceRef.current.clustering.pixelRange = 90;
                  dataSourceRef.current.clustering.minimumClusterSize = 3;
                  dataSourceRef.current.clustering.enabled = true;
                  viewerRef.current!.scene.requestRender();
                }
              }, 50);
            }
          }, 500); // Wait 500ms after camera movement completes

          // Store the final position for "go back to map" functionality
          if (viewerRef.current) {
            spinAndZoomFinalPositionRef.current = {
              destination: viewerRef.current.camera.position.clone(),
              orientation: {
                heading: viewerRef.current.camera.heading,
                pitch: viewerRef.current.camera.pitch,
                roll: viewerRef.current.camera.roll
              }
            };
          }
        }
      });


    } else {

      // Fallback: Calculate positions of all landmarks for bounding sphere
      const positions = entityRefs.current.map((entity, index) => {
        if (entity.properties) {
          const lon = entity.properties.lon?.getValue();
          const lat = entity.properties.lat?.getValue();
          const height = entity.properties.height?.getValue() ?? 0;

          // Validate coordinates
          if (!isFinite(lon) || !isFinite(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
            console.warn(`[handleZoomBackOut] Invalid coordinates for entity ${index}:`, { lon, lat });
            return null;
          }

          return Cesium.Cartesian3.fromDegrees(lon, lat, height);
        }
        console.warn(`[handleZoomBackOut] Entity ${index} has no properties`);
        return null;
      }).filter(pos => pos !== null);

      if (positions.length === 0) {
        console.error('[handleZoomBackOut] No valid positions found for entities');
        return;
      }

      const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);

      // Fly back to the overview of all landmarks
      viewerRef.current.camera.flyToBoundingSphere(boundingSphere, {
        duration: 2.0,
        offset: new Cesium.HeadingPitchRange(0, -Math.PI / 2, boundingSphere.radius * 3),
        complete: () => {
          // Double-check that rotation stays stopped after the fly completes
          rotatingRef.current = false;
          spinningStopped.current = true;
          fastSpinActive.current = false;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        }
      });

    }
  }, [entitiesReady]);

  // Reset handler
  const handleReset = () => {

    spinningStopped.current = false;
    fastSpinActive.current = false;
    rotatingRef.current = true;
    spinLongitudeRef.current = -81; // Florida longitude
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (viewerRef.current) {
      viewerRef.current.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(spinLongitudeRef.current, 0, 20000000),  // Changed from 20 to 0 to look at center
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0
        }
      });
    }
    setShowOverlay(true);
    setShowReset(false);
    setShowFlyThroughEntity(false);

    // Clear the captured logo size to prevent re-use
    setCapturedLogoSize({ width: 0, height: 0 });

    // Clear the stored spin and zoom position
    spinAndZoomFinalPositionRef.current = null;

    // Clear the stored clustering parameters
    spinAndZoomClusteringParamsRef.current = null;

    // Clear the clustering restore time
    clusteringRestoreTimeRef.current = null;

    // Clean up all fly-through primitives from the scene
    if (viewerRef.current && viewerRef.current.scene) {
      const scene = viewerRef.current.scene;

      // Find and remove all fly-through primitives
      for (let i = scene.primitives.length - 1; i >= 0; i--) {
        const primitive = scene.primitives.get(i);
        if (primitive &&
          primitive.appearance &&
          primitive.appearance.material &&
          primitive.appearance.material.uniforms &&
          primitive.appearance.material.uniforms.image &&
          primitive.appearance.material.uniforms.image.indexOf('tghMainLogo.svg') !== -1) {
          scene.primitives.remove(primitive);
        }
      }

      // Also clear the ref
      flyThroughPrimitiveRef.current = null;
    }

    // Reset clustering parameters to overview mode after camera reset
    if (dataSourceRef.current && viewerRef.current) {
      const canvas = viewerRef.current.scene.canvas;
      const clusteringParams = calculateClusteringParameters(canvas, 1920, true); // Force overview mode

      dataSourceRef.current.clustering.pixelRange = clusteringParams.pixelRange;
      dataSourceRef.current.clustering.minimumClusterSize = clusteringParams.minimumClusterSize;

    }

    // Force logo size recalculation after reset
    setTimeout(() => {
      if (viewerRef.current) {
        // Logo size will be recalculated by the useOverlayLogoMeasurement hook
      }
    }, 100);

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Show loading state while landmarks or marker images are being loaded
  if (landmarksLoading || markerImagesLoading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        color: '#fff',
        fontSize: '18px',
        zIndex: 1
      }}>
        Loading {landmarksLoading ? 'landmarks' : 'marker images'}...
      </div>
    );
  }

  // Show error state if Cesium failed to initialize
  if (cesiumError) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        color: '#fff',
        fontSize: '18px',
        zIndex: 1
      }}>
        <div style={{ marginBottom: '16px' }}>Cesium initialization failed:</div>
        <div style={{ fontSize: '14px', color: '#ff6b6b', maxWidth: '80%', textAlign: 'center' }}>
          {cesiumError}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: `${getScaledPadding(12)}px ${getScaledPadding(24)}px`,
            backgroundColor: '#0086FF',
            color: '#fff',
            border: 'none',
            borderRadius: getScaledBorderRadius(6),
            cursor: 'pointer',
            fontSize: getScaledFontSize(16)
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Show error state if landmarks failed to load
  if (landmarksError) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        color: '#fff',
        fontSize: '18px',
        zIndex: 1
      }}>
        <div style={{ marginBottom: '16px' }}>Error loading landmarks:</div>
        <div style={{ fontSize: '14px', color: '#ff6b6b', maxWidth: '80%', textAlign: 'center' }}>
          {landmarksError}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: `${getScaledPadding(12)}px ${getScaledPadding(24)}px`,
            backgroundColor: '#0086FF',
            color: '#fff',
            border: 'none',
            borderRadius: getScaledBorderRadius(6),
            cursor: 'pointer',
            fontSize: getScaledFontSize(16)
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', minHeight: 0, minWidth: 0, zIndex: 1, backgroundColor: '#000' }}>
      <div
        ref={cesiumContainerRef}
        style={{
          width: '100vw',
          height: '100vh',
          minHeight: 0,
          minWidth: 0,
          opacity: globeOpacity,
          transition: 'opacity 1.5s ease-in-out'
        }}
        className="cesium-globe-container"
      />
      {showOverlay && !showLoadingIndicator && globeOpacity === 1 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <button
            ref={overlayLogoRef as React.RefObject<HTMLButtonElement>}
            className="cesium-overlay-button"
            onClick={entitiesReady ? handleZoomToAllWithSpin : undefined}
            onKeyDown={(e) => {
              if (!entitiesReady) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleZoomToAllWithSpin();
              }
            }}
            aria-label="Enter Globe"
            role="button"
            style={{
              padding: '16px 32px',
              cursor: entitiesReady ? 'pointer' : 'default',
              pointerEvents: 'auto',
              opacity: logoOpacity,
              transform: `translateZ(0) scale(${1.02 - (0.02 * logoOpacity)})`,
              transition: 'opacity 220ms ease, transform 220ms ease, box-shadow 220ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '9999px',
              fontSize: 18,
              letterSpacing: 0.4,
              fontWeight: 600,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(20px)'
            }}
          >
            Enter Globe
          </button>
          <style>{`
            /* Fade-in animation */
            .enter-globe-btn {
              opacity: 0;
              animation: fadeIn 2s ease-in-out 4s forwards;
            }

            @keyframes fadeIn {
              to {
                opacity: 1;
              }
            }

            /* Hover/focus states for the overlay button */
            .cesium-overlay-button:hover {
              transform: translateZ(0) scale(1.05) !important;
              background-color: rgba(255, 255, 255, 0.1) !important;
              color: #fff !important;
            }
            .cesium-overlay-button:focus {
              outline: 2px solid rgba(255, 255, 255, 0.3);
              outline-offset: 4px;
            }
          `}</style>
        </div>
      )}
      {/* Loading Indicator */}
      {showLoadingIndicator && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: 20,
            color: 'white',
            fontSize: 14,
            zIndex: 15,
            opacity: showLoadingIndicator ? 1 : 0,
            transition: 'opacity 0.5s ease-out',
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span>Loading globe...</span>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Atmosphere Debug Panel - only show in development or with debug query param */}
      {(process.env.NODE_ENV === 'development' || window.location.search.includes('debug=true')) && (
        <AtmosphereDebugPanel
          config={atmosphereConfig}
          updateConfig={updateAtmosphereConfig}
          resetToDefaults={resetAtmosphere}
          loadPreset={loadAtmospherePreset}
          exportConfig={exportAtmosphereConfig}
          isOpen={isDebugPanelOpen}
          onToggle={toggleDebugPanel}
          viewerRef={viewerRef}
        />
      )}

      {/* Globe Navigation Bar - Show when modal is closed */}
      {!modalOpen && (
        <div style={{
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            padding: '8px',
            borderRadius: '9999px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}>
            {onBackToMaps && (
              <motion.button
                onClick={onBackToMaps}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '9999px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                }}
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
                <span style={{ display: 'none' }} className="md:inline">Back to Maps</span>
              </motion.button>
            )}

            {onView2D && (
              <motion.button
                onClick={onView2D}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '9999px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                }}
              >
                <Map size={18} strokeWidth={2.5} />
                <span style={{ display: 'none' }} className="md:inline">View in 2D</span>
              </motion.button>
            )}

            <motion.button
              onClick={handleReset}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '9999px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              }}
            >
              <RotateCcw size={18} strokeWidth={2.5} />
              <span style={{ display: 'none' }} className="md:inline">Reset Tour</span>
            </motion.button>
          </div>
        </div>
      )}

      <FullscreenModal
        open={modalOpen && activeLandmarkIdx !== null}
        contentUrl={activeLandmarkIdx !== null ? LANDMARKS[activeLandmarkIdx].contentUrl || '' : ''}
        landmarkName={activeLandmarkIdx !== null ? LANDMARKS[activeLandmarkIdx].name : ''}
        landmarkSubtitle={''}
        landmarkContent={''}
        description={activeLandmarkIdx !== null ? LANDMARKS[activeLandmarkIdx].description : undefined}
        images={activeLandmarkIdx !== null ? LANDMARKS[activeLandmarkIdx].images : undefined}
        links={activeLandmarkIdx !== null ? LANDMARKS[activeLandmarkIdx].links : undefined}
        videos={activeLandmarkIdx !== null ? LANDMARKS[activeLandmarkIdx].videos : undefined}
        onClose={() => {
          setModalOpen(false);
          setActiveLandmarkIdx(null);
          handleZoomBackOut();
        }}
      />
    </div>
  );
};

export default CesiumGlobe; 