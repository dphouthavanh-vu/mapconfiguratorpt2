import { useEffect, useState, useRef } from 'react';
import * as Cesium from 'cesium';
import { setupClusterBillboards } from './useClusterBillboards';
import { getScreenResolutionInfo, calculateClusteringParameters, updateAdaptiveClustering } from '../utils/scalingUtils';
import type { AtmosphereConfig } from './useAtmosphereConfig';

export function useCesiumViewerSetup({
  cesiumContainerRef,
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
  markerImages,
  disableAdaptiveClusteringRef,
  clusteringRestoreTimeRef,
  isInteractingWithClusterRef,
  lastClusterZoomHeightRef,
  atmosphereConfig,
}: {
  cesiumContainerRef: React.RefObject<HTMLDivElement | null>;
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
  dataSourceRef: React.MutableRefObject<Cesium.CustomDataSource | null>;
  animationFrameRef: React.MutableRefObject<number | null>;
  rotatingRef: React.MutableRefObject<boolean>;
  spinLongitudeRef: React.MutableRefObject<number>;
  fitDistanceRef: React.MutableRefObject<number>;
  entityRefs: React.MutableRefObject<Cesium.Entity[]>;
  animate: () => void;
  MAPBOX_TOKEN: string;
  LANDMARKS: Array<any>;
  markerImages: { [id: number]: string };
  disableAdaptiveClusteringRef?: React.MutableRefObject<boolean>;
  clusteringRestoreTimeRef?: React.MutableRefObject<number | null>;
  isInteractingWithClusterRef?: React.MutableRefObject<boolean>;
  lastClusterZoomHeightRef?: React.MutableRefObject<number | null>;
  atmosphereConfig?: AtmosphereConfig;
}) {
  const [entitiesReady, setEntitiesReady] = useState(false);
  const [cesiumError, setCesiumError] = useState<string | null>(null);
  const [containerReady, setContainerReady] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [dataSourceReady, setDataSourceReady] = useState(false);
  const cleanupClusterRef = useRef<{ cleanup: () => void; forceRegeneration: () => void } | undefined>(undefined);
  const cloudLayersRef = useRef<Cesium.Primitive[]>([]);
  const cloudAnimationRef = useRef<{ rotationTime: number; speed: number; rotation: number }[]>([]);

  // Effect to monitor when the container ref becomes available
  useEffect(() => {
    if (cesiumContainerRef.current && !containerReady) {
      setContainerReady(true);
    } else if (!cesiumContainerRef.current && containerReady) {
      setContainerReady(false);
    }
  }, [cesiumContainerRef.current, containerReady]);

  // Effect 1: Setup Cesium viewer and data source (runs when container is ready)
  useEffect(() => {
    // Wait for the container ref to be available
    if (!containerReady || !cesiumContainerRef.current) {
      return;
    }
    
    let viewer: Cesium.Viewer;
    let dataSource: Cesium.CustomDataSource;
    let hiddenCreditDiv: HTMLDivElement;
    let cleanupCluster: { cleanup: () => void; forceRegeneration: () => void } | undefined;
    
    try {
      // Configure Cesium to load assets from public folder
      (window as any).CESIUM_BASE_URL = '/cesium';

      // Create a hidden div for Cesium credits
      hiddenCreditDiv = document.createElement('div');
      hiddenCreditDiv.style.display = 'none';
      document.body.appendChild(hiddenCreditDiv);

      // Use Mapbox Satellite as the base imagery
      viewer = new Cesium.Viewer(cesiumContainerRef.current, {
      baseLayerPicker: false,
      timeline: false,
      animation: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      infoBox: false,
      fullscreenButton: false,
      creditContainer: hiddenCreditDiv,
      // Performance optimization: only render when needed
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity, // Let us control when to render
    });
    
    // Enable all camera controls for user interaction
    viewer.scene.screenSpaceCameraController.enableZoom = true;
    viewer.scene.screenSpaceCameraController.enableRotate = true;
    viewer.scene.screenSpaceCameraController.enableTranslate = true;
    viewer.scene.screenSpaceCameraController.enableTilt = true;
    viewer.scene.screenSpaceCameraController.enableLook = true;

    // Set up scene change detection for requestRenderMode
    // This ensures we only render when necessary
    let lastRenderTime = 0;
    const minRenderInterval = 16; // ~60fps max when changes occur

    // Monitor for scene changes that require rendering
    viewer.scene.postUpdate.addEventListener(() => {
      const now = Date.now();
      if (now - lastRenderTime > minRenderInterval) {
        viewer.scene.requestRender();
        lastRenderTime = now;
      }
    });

    // Also trigger render on camera movement and control cloud visibility
    viewer.camera.changed.addEventListener(() => {
      viewer.scene.requestRender();

      // Hide clouds when zoomed in close with fade effect
      const cameraHeight = viewer.camera.positionCartographic.height;
      const cloudFadeStart = 15000000; // 15,000 km - start fading
      const cloudFadeEnd = 8000000; // 8,000 km - completely hidden

      cloudLayersRef.current.forEach((cloudPrimitive, index) => {
        if (cloudPrimitive) {
          if (cameraHeight < cloudFadeEnd) {
            // Completely hide when very close
            cloudPrimitive.show = false;
          } else {
            cloudPrimitive.show = true;

            // Apply fade based on camera distance
            if (cameraHeight < cloudFadeStart) {
              // Calculate fade factor (1 at fadeStart, 0 at fadeEnd)
              const fadeFactor = (cameraHeight - cloudFadeEnd) / (cloudFadeStart - cloudFadeEnd);

              // Get the original opacity from cloud config
              const cloudLayers = [
                { opacity: cloudConfig.lowOpacity },
                { opacity: cloudConfig.midOpacity },
                { opacity: cloudConfig.highOpacity }
              ];

              const originalOpacity = cloudLayers[index]?.opacity || 0.3;
              const adjustedOpacity = originalOpacity * cloudConfig.coverage * cloudConfig.density;

              // Update the cloud material opacity
              if (cloudPrimitive.appearance && cloudPrimitive.appearance.material) {
                cloudPrimitive.appearance.material.uniforms.color =
                  Cesium.Color.WHITE.withAlpha(adjustedOpacity * fadeFactor);
              }
            }
          }
        }
      });
    });

    // Trigger render when terrain changes
    viewer.scene.globe.terrainProviderChanged.addEventListener(() => {
      viewer.scene.requestRender();
    });


    viewerRef.current = viewer;
    setViewerReady(true);

    // Remove default imagery and add Mapbox Satellite
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
      })
    );

    // Enable atmospheric glow and lighting effects
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.dynamicAtmosphereLighting = true;
    // Note: atmosphere values are set via the config system in CesiumGlobe.tsx

    // Note: Fade distances are set via the config system

    // Enable sky atmosphere (all values set via config system)
    viewer.scene.skyAtmosphere.show = true;

    // Note: All scattering parameters are set via the config system in CesiumGlobe.tsx

    // Add multiple cloud shells at different altitudes for depth effect
    const earthRadius = 6378137.0; // meters (WGS84)

    // Cloud layer configurations with dynamic parameters from atmosphereConfig
    const cloudConfig = atmosphereConfig?.depthLayers?.clouds || {
      lowOpacity: 0.6,
      midOpacity: 0.3,
      highOpacity: 0.15,
      textureScaleX: 2.0,
      textureScaleY: 1.0,
      textureOffsetX: 0,
      textureOffsetY: 0,
      lowRotation: 0,
      midRotation: 45,
      highRotation: 90,
      lowSpeed: 0.01,
      midSpeed: 0.02,
      highSpeed: 0.03,
      coverage: 0.8,
      density: 0.7,
      feathering: 0.5,
    };

    const cloudLayers = [
      {
        altitude: 8000,
        opacity: cloudConfig.lowOpacity,
        rotation: cloudConfig.lowRotation,
        speed: cloudConfig.lowSpeed,
        scaleMultiplier: 1.0
      },   // Low clouds
      {
        altitude: 15000,
        opacity: cloudConfig.midOpacity,
        rotation: cloudConfig.midRotation,
        speed: cloudConfig.midSpeed,
        scaleMultiplier: 1.2
      }, // Mid clouds
      {
        altitude: 25000,
        opacity: cloudConfig.highOpacity,
        rotation: cloudConfig.highRotation,
        speed: cloudConfig.highSpeed,
        scaleMultiplier: 1.5
      }, // High clouds
    ];

    // Clear existing cloud layers before creating new ones
    cloudLayersRef.current.forEach(primitive => {
      viewer.scene.primitives.remove(primitive);
    });
    cloudLayersRef.current = [];
    cloudAnimationRef.current = [];

    // Create multiple cloud layers
    cloudLayers.forEach((layer, index) => {
      const cloudShellRadius = earthRadius + layer.altitude;
      const rotationAngle = Cesium.Math.toRadians(layer.rotation);
      const rotationMatrix = Cesium.Matrix3.fromRotationZ(rotationAngle);
      const modelMatrix = Cesium.Matrix4.fromRotationTranslation(rotationMatrix);

      // Calculate texture parameters with layer-specific scaling
      const textureScaleX = cloudConfig.textureScaleX * layer.scaleMultiplier;
      const textureScaleY = cloudConfig.textureScaleY * layer.scaleMultiplier;

      // Apply coverage and density to opacity
      const adjustedOpacity = layer.opacity * cloudConfig.coverage * cloudConfig.density;

      const cloudShell = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.EllipsoidGeometry({
            radii: new Cesium.Cartesian3(cloudShellRadius, cloudShellRadius, cloudShellRadius),
            vertexFormat: Cesium.VertexFormat.ALL,
          }),
        }),
        appearance: new Cesium.EllipsoidSurfaceAppearance({
          material: Cesium.Material.fromType('Image', {
            image: '/cloudMap.png',
            repeat: new Cesium.Cartesian2(textureScaleX, textureScaleY),
            color: Cesium.Color.WHITE.withAlpha(adjustedOpacity),
            transparent: true,
          }),
          aboveGround: true,
        }),
        modelMatrix: modelMatrix,
        show: true,
        allowPicking: false, // Disable picking to prevent interference with landmark clicks
      });

      viewer.scene.primitives.add(cloudShell);
      cloudLayersRef.current.push(cloudShell);

      // Store animation state for this layer
      cloudAnimationRef.current.push({
        rotationTime: 0,
        speed: layer.speed,
        rotation: layer.rotation
      });
    });

    // Initial cloud visibility check based on camera distance
    const initialCameraHeight = viewer.camera.positionCartographic.height;
    const cloudFadeEnd = 8000000; // 8,000 km - completely hidden
    if (initialCameraHeight < cloudFadeEnd) {
      cloudLayersRef.current.forEach(cloudPrimitive => {
        if (cloudPrimitive) {
          cloudPrimitive.show = false;
        }
      });
    }

    // Single animation handler for all cloud layers
    viewer.scene.postUpdate.addEventListener(() => {
      let hasAnimatingClouds = false;
      cloudLayersRef.current.forEach((cloudPrimitive, index) => {
        if (cloudAnimationRef.current[index]) {
          const animState = cloudAnimationRef.current[index];
          // Only animate if speed is non-zero
          if (animState.speed !== 0) {
            animState.rotationTime += animState.speed;
            const rotationAngle = Cesium.Math.toRadians(animState.rotation);
            const animatedRotation = Cesium.Matrix3.fromRotationZ(rotationAngle + animState.rotationTime);
            cloudPrimitive.modelMatrix = Cesium.Matrix4.fromRotationTranslation(animatedRotation);
            hasAnimatingClouds = true;
          }
        }
      });
      // Request render only if clouds are actually animating
      if (hasAnimatingClouds) {
        viewer.scene.requestRender();
      }
    });

    // Enable clustering
          dataSource = new Cesium.CustomDataSource('landmarks');
      dataSource.clustering.enabled = true;
      
      // Calculate resolution-dependent clustering parameters
      const canvas = viewer.scene.canvas;
      const clusteringParams = calculateClusteringParameters(canvas, 1920, true); // Use overview mode for initial setup
      
      dataSource.clustering.pixelRange = clusteringParams.pixelRange;
      dataSource.clustering.minimumClusterSize = clusteringParams.minimumClusterSize;
      
    dataSourceRef.current = dataSource;
    setDataSourceReady(true);

    // Set initial camera view from space (centered on Florida)
    spinLongitudeRef.current = -81; // Florida longitude
    if (viewerRef.current) {
      // Start with camera close to Earth for cinematic zoom-out effect
      const initialDistance = 5000000; // 5,000 km - closer starting position for smoother animation
      fitDistanceRef.current = initialDistance;
      
      viewerRef.current.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          spinLongitudeRef.current,
          0,  // Changed to 0 to look at center
          initialDistance
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0
        }
      });
    }

    rotatingRef.current = true;
    animationFrameRef.current = requestAnimationFrame(animate);

    cleanupClusterRef.current = undefined;
    if (dataSourceRef.current && viewerRef.current) {
      cleanupClusterRef.current = setupClusterBillboards(dataSourceRef.current, viewerRef.current);
    } else {
      console.warn('⚠️ Skipping setupClusterBillboards - missing dataSource or viewer', {
        dataSource: !!dataSourceRef.current,
        viewer: !!viewerRef.current
      });
    }
    
    } catch (error) {
      console.error('❌ Error during Cesium viewer initialization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during Cesium initialization';
      setCesiumError(errorMessage);
      console.error('Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        mapboxToken: MAPBOX_TOKEN ? 'Present' : 'Missing'
      });
    }

    // Cleanup
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
        setViewerReady(false);
      }
      if (hiddenCreditDiv && hiddenCreditDiv.parentNode) {
        hiddenCreditDiv.parentNode.removeChild(hiddenCreditDiv);
      }
      if (dataSourceRef.current && viewerRef.current && 'dataSources' in viewerRef.current) {
        (viewerRef.current as Cesium.Viewer).dataSources.remove(dataSourceRef.current, true);
      }
      if (dataSourceRef.current) {
        dataSourceRef.current = null;
        setDataSourceReady(false);
      }
      if (cleanupCluster) cleanupCluster.cleanup();
    };
  }, [containerReady]);

  // Effect to handle window resize and camera movement for adaptive clustering
  useEffect(() => {
    if (!viewerReady || !dataSourceReady || !dataSourceRef.current) return;

    const handleResize = () => {
      if (viewerRef.current && dataSourceRef.current) {
        const updatedParams = updateAdaptiveClustering(dataSourceRef.current, viewerRef.current);
        
      }
    };

    // Throttle adaptive clustering updates to prevent excessive calls during camera movement
    let adaptiveClusteringTimeout: NodeJS.Timeout | null = null;
    
    const handleCameraMove = () => {
      // Clear any pending timeout
      if (adaptiveClusteringTimeout) {
        clearTimeout(adaptiveClusteringTimeout);
      }
      
      // Throttle adaptive clustering updates to every 100ms
      adaptiveClusteringTimeout = setTimeout(() => {
        if (viewerRef.current && dataSourceRef.current) {
          const updatedParams = updateAdaptiveClustering(
            dataSourceRef.current, 
            viewerRef.current,
            disableAdaptiveClusteringRef,
            clusteringRestoreTimeRef
          );
          
          // Only log if the clustering was actually updated (not skipped)
          if (updatedParams.clusteringMode !== 'disabled' && updatedParams.clusteringMode !== 'recently-restored') {
          }
        }
      }, 100); // Throttle to 100ms
    };

    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Add camera movement listener for adaptive clustering
    if (viewerRef.current) {
      viewerRef.current.camera.moveEnd.addEventListener(handleCameraMove);
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (viewerRef.current) {
        viewerRef.current.camera.moveEnd.removeEventListener(handleCameraMove);
      }
    };
  }, [viewerReady, dataSourceReady]);

  // Effect 2: Add entities when markerImages, dataSource, and viewer are ready
  useEffect(() => {
    
    if (!dataSourceRef.current || !viewerRef.current || !viewerReady || !dataSourceReady) {
      return;
    }
    if (!markerImages || Object.keys(markerImages).length === 0) {
      return;
    }
    if (!LANDMARKS || LANDMARKS.length === 0) {
      return;
    }
    
    // Check if we have marker images for all landmarks
    const missingImages = [];
    for (let i = 0; i < LANDMARKS.length; i++) {
      if (!markerImages[i]) {
        missingImages.push(i);
      }
    }
    
    if (missingImages.length > 0) {
      return; // Don't create entities if we're missing images
    }
    
    // Additional validation: ensure all marker images are valid data URLs
    const invalidImages = [];
    for (let i = 0; i < LANDMARKS.length; i++) {
      if (!markerImages[i] || !markerImages[i].startsWith('data:image/')) {
        invalidImages.push({ index: i, value: markerImages[i] });
      }
    }
    
    if (invalidImages.length > 0) {
      return; // Don't create entities if we have invalid images
    }
    
    
    // Clear previous entities
    dataSourceRef.current.entities.removeAll();
    entityRefs.current = [];

    console.log(`[createEntities] Creating entities for ${LANDMARKS.length} landmarks`);

    LANDMARKS.forEach((landmark, i) => {
      console.log(`[createEntities] Landmark ${i}:`, {
        name: landmark.name,
        lon: landmark.lon,
        lat: landmark.lat,
        height: landmark.height
      });

      if (!markerImages[i]) {
        console.error(`❌ Cannot create entity ${i} - missing marker image`);
        return; // Skip this entity
      }

      // Validate coordinates
      if (!isFinite(landmark.lon) || !isFinite(landmark.lat) ||
          landmark.lon < -180 || landmark.lon > 180 ||
          landmark.lat < -90 || landmark.lat > 90) {
        console.error(`❌ Invalid coordinates for landmark ${i}:`, {
          name: landmark.name,
          lon: landmark.lon,
          lat: landmark.lat
        });
        return; // Skip this entity
      }

      try {
                const entity = dataSourceRef.current!.entities.add({
          position: Cesium.Cartesian3.fromDegrees(landmark.lon, landmark.lat, landmark.height || 0),
          billboard: {
            image: markerImages[i],
            show: true,
            scale: 0.6,
            // Position the marker so the pointer tip (bottom-left) points to the geographic coordinate
            // The pointer tip is at the bottom-left of the SVG, so no offset is needed
            pixelOffset: new Cesium.Cartesian2(0, 0), // No offset needed when positioning at bottom-left
            // Position relative to bottom-left for consistent pointer tip positioning
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            // Removed scaleByDistance to prevent automatic scaling during camera movements
            translucencyByDistance: new Cesium.NearFarScalar(1.0e6, 1.0, 2.0e6, 0.0),
            // Enable depth testing to prevent border bleeding through overlapping markers
            disableDepthTestDistance: 0.0,
            // Set height reference to ensure proper depth ordering
            // Only set if scene is available to avoid errors
            heightReference: viewerRef.current?.scene ? Cesium.HeightReference.CLAMP_TO_GROUND : undefined,
          },
          name: landmark.name,
          description: 'Click to zoom!',
          properties: {
            lon: landmark.lon,
            lat: landmark.lat,
            height: landmark.height || 1, // Use the same height as the position
          },
        });
        entityRefs.current.push(entity);
      } catch (error) {
        console.error(`❌ Failed to create entity ${i}:`, error);
      }
    });
    
    
    // Ensure data source is attached to the viewer
    if (viewerRef.current && dataSourceRef.current && !viewerRef.current.dataSources.contains(dataSourceRef.current)) {
      viewerRef.current.dataSources.add(dataSourceRef.current);
    }

    
    // Set entities ready state
    const readyConditions = {
      hasEntities: entityRefs.current.length > 0,
      hasViewer: !!viewerRef.current,
      hasDataSource: !!dataSourceRef.current,
      viewerReady,
      dataSourceReady,
      entitiesCount: entityRefs.current.length
    };
    const isReady = readyConditions.hasEntities && readyConditions.hasViewer && readyConditions.hasDataSource && viewerReady && dataSourceReady;
    setEntitiesReady(isReady);
  }, [markerImages, LANDMARKS, viewerReady, dataSourceReady]);

  // Update cloud layers when atmosphereConfig changes
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || cloudLayersRef.current.length === 0) return;

    const cloudConfig = atmosphereConfig?.depthLayers?.clouds || {
      lowOpacity: 0.6,
      midOpacity: 0.3,
      highOpacity: 0.15,
      textureScaleX: 2.0,
      textureScaleY: 1.0,
      coverage: 0.8,
      density: 0.7,
      lowSpeed: 0.01,
      midSpeed: 0.02,
      highSpeed: 0.03,
      lowRotation: 0,
      midRotation: 45,
      highRotation: 90,
    };

    const opacityValues = [
      cloudConfig.lowOpacity * cloudConfig.coverage * cloudConfig.density,
      cloudConfig.midOpacity * cloudConfig.coverage * cloudConfig.density,
      cloudConfig.highOpacity * cloudConfig.coverage * cloudConfig.density
    ];

    const scaleMultipliers = [1.0, 1.2, 1.5];
    const speeds = [cloudConfig.lowSpeed, cloudConfig.midSpeed, cloudConfig.highSpeed];
    const rotations = [cloudConfig.lowRotation, cloudConfig.midRotation, cloudConfig.highRotation];

    cloudLayersRef.current.forEach((cloudPrimitive, index) => {
      if (index < opacityValues.length && cloudPrimitive.appearance) {
        // Update the material properties
        const material = cloudPrimitive.appearance.material;
        if (material) {
          material.uniforms.color = Cesium.Color.WHITE.withAlpha(opacityValues[index]);
          material.uniforms.repeat = new Cesium.Cartesian2(
            cloudConfig.textureScaleX * scaleMultipliers[index],
            cloudConfig.textureScaleY * scaleMultipliers[index]
          );
        }
      }

      // Update animation speeds and rotations
      if (cloudAnimationRef.current[index]) {
        cloudAnimationRef.current[index].speed = speeds[index];
        cloudAnimationRef.current[index].rotation = rotations[index];
      }
    });
  }, [atmosphereConfig?.depthLayers?.clouds, viewerReady]);

  return { entitiesReady, cesiumError, viewerReady, dataSourceReady, cleanupCluster: cleanupClusterRef.current };
}