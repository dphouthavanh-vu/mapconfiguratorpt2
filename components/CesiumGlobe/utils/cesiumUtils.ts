import * as Cesium from 'cesium';
import { calculateResolutionBasedZoomDistance, getScreenResolutionInfo } from './scalingUtils';

// Helper function to calculate zoom distance accounting for billboard dimensions

// Helper function specifically for cluster zooming
export function handleClusterZoom(
  viewer: Cesium.Viewer | null,
  clusteredEntities: Cesium.Entity[],
  rotatingRef: { current: boolean },
  animationFrameRef: { current: number | null },
  setAnimating?: (animating: boolean) => void,
  lastClusterZoomHeightRef?: { current: number | null }
) {
  if (!viewer || clusteredEntities.length === 0) return;
  
  console.log('🎯 CLUSTER ZOOM - Processing', clusteredEntities.length, 'entities');
  
  // Stop rotation when cluster is clicked
  rotatingRef.current = false;
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
  }
  
  // Calculate bounding sphere for all entities in the cluster
  const positions = clusteredEntities.map((entity: any) => {
    if (entity.properties) {
      const lon = entity.properties.lon?.getValue();
      const lat = entity.properties.lat?.getValue();
      const height = entity.properties.height?.getValue() ?? 0;
      return Cesium.Cartesian3.fromDegrees(lon, lat, height);
    }
    return Cesium.Cartesian3.fromDegrees(0, 0, 0);
  });
  
  const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
  
  // Calculate zoom distance using screen resolution
  // Use the actual rendered marker dimensions (resolution-scaled)
  const canvas = viewer.scene.canvas;
  const { resolutionScale } = getScreenResolutionInfo(canvas);
  const maxScale = 1.5; // Match the cap used in markerUtils.ts
  const actualScale = Math.min(resolutionScale, maxScale);
  
  const billboardWidthPixels = 300 * actualScale;
  const billboardHeightPixels = 100 * actualScale; // Use actual rendered height
  const spacingMultiplier = clusteredEntities.length <= 6 ? 1.6 : 1.2;
  const safetyMargin = clusteredEntities.length <= 6 ? 3.5 : 2.5; // Increased safety margins
  
  const resolutionBasedDistance = calculateResolutionBasedZoomDistance(
    viewer,
    billboardWidthPixels,
    billboardHeightPixels,
    clusteredEntities.length,
    spacingMultiplier,
    boundingSphere.radius // Pass geographic radius for tight cluster handling
  );
  
  // Combine with geographic distance
  const geographicMultiplier = clusteredEntities.length <= 6 ? 3.5 : 3.0; // Increased geographic multipliers
  const baseGeographicDistance = boundingSphere.radius * geographicMultiplier;
  
  const zoomDistance = Math.max(
    baseGeographicDistance,
    resolutionBasedDistance * safetyMargin
  );
  
  console.log('🎯 Cluster zoom parameters:', {
    numEntities: clusteredEntities.length,
    boundingSphereRadius: boundingSphere.radius,
    boundingSphereRadiusKm: (boundingSphere.radius / 1000).toFixed(2) + 'km',
    resolutionBasedDistance,
    baseGeographicDistance,
    finalZoomDistance: zoomDistance,
    finalZoomDistanceKm: (zoomDistance / 1000).toFixed(2) + 'km',
    boundingSphereCenter: boundingSphere.center,
    isUltraTightCluster: boundingSphere.radius < 300,
    isVeryTightCluster: boundingSphere.radius >= 300 && boundingSphere.radius < 500,
    isTightCluster: boundingSphere.radius >= 500 && boundingSphere.radius < 1000,
    isMediumCluster: boundingSphere.radius >= 1000 && boundingSphere.radius < 10000,
    hasManyLandmarks: clusteredEntities.length >= 5,
    isSixLandmarksCluster: clusteredEntities.length === 6,
    isUltraTightSixCluster: boundingSphere.radius < 600
  });
  
  // Set animation state to prevent billboard scaling during camera movement
  if (setAnimating) {
    setAnimating(true);
  }
  
  // Fly to the cluster with appropriate offset
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: 2.0,
    offset: new Cesium.HeadingPitchRange(
      0, // heading (north)
      Cesium.Math.toRadians(-90), // pitch (45-degree angle from above)
      zoomDistance // Distance accounting for both geographic spread and billboard width
    ),
    complete: () => {
      console.log('✅ Cluster zoom completed successfully');
      // Re-enable billboard scaling after animation completes
      if (setAnimating) {
        setAnimating(false);
      }
      // Store the final zoom height
      if (lastClusterZoomHeightRef && viewer) {
        const finalHeight = viewer.camera.positionCartographic?.height || 0;
        lastClusterZoomHeightRef.current = finalHeight;
        console.log('📏 Stored final cluster zoom height:', finalHeight);
      }
      // Force a render to ensure the view stays
      viewer.scene.requestRender();
    }
  });
  
  console.log('✈️ Flying to cluster with', clusteredEntities.length, 'entities');
}



// Enhanced pin click handler without rotation - flies directly to landmark
export function handlePinClick(
  viewer: Cesium.Viewer | null,
  rotatingRef: { current: boolean },
  animationFrameRef: { current: number | null },
  lon: number,
  lat: number,
  height: number,
  setAnimating?: (animating: boolean) => void,
  rotationAngle: number = 45 // This parameter is kept for compatibility but not used
) {
  console.log('🎯 Enhanced handlePinClick called with:', { lon, lat, height, viewer: !!viewer, rotationAngle });
  
  // Stop rotation
  rotatingRef.current = false;
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
  }
  
  if (!viewer) {
    console.log('❌ No viewer available for camera flyTo');
    return;
  }

  // Set animation state to prevent billboard scaling during camera movement
  if (setAnimating) {
    setAnimating(true);
  }

  // Calculate zoom distance using screen resolution
  // Use the actual rendered marker dimensions (resolution-scaled)
  const canvas = viewer.scene.canvas;
  const { resolutionScale } = getScreenResolutionInfo(canvas);
  const maxScale = 1.5; // Match the cap used in markerUtils.ts
  const actualScale = Math.min(resolutionScale, maxScale);
  
  const billboardHeightPixels = 100 * actualScale; // Use actual rendered height
  const resolutionBasedDistance = calculateResolutionBasedZoomDistance(
    viewer,
    300, // billboard width
    billboardHeightPixels,
    1, // single landmark
    1.0, // no spacing multiplier for single landmark
    undefined // no geographic radius for individual landmarks
  );
  
  const safetyMargin = 2.5; // Reduced safety margin for closer zoom
  const zoomDistance = resolutionBasedDistance * safetyMargin;

  // Calculate target position
  const targetPosition = Cesium.Cartesian3.fromDegrees(lon, lat, height + zoomDistance);

  console.log('🎬 Starting direct fly-to animation');
  console.log('📐 Animation parameters:', {
    targetPosition: { lon, lat },
    resolutionBasedDistance,
    zoomDistance,
    duration: 2.0
  });

  // Fly directly to the landmark without changing camera orientation
  viewer.camera.flyTo({
    destination: targetPosition,
    duration: 2.0, // 2 seconds for the flight
    complete: () => {
      console.log('✅ Direct fly-to animation completed');
      // Re-enable billboard scaling after animation completes
      if (setAnimating) {
        setAnimating(false);
      }
    }
  });

  console.log('✈️ Direct camera animation initiated');
}

export function handleZoomToAll(
  viewer: Cesium.Viewer | null,
  entityRefs: Cesium.Entity[],
  setShowOverlay: (show: boolean) => void
) {
  if (!viewer || entityRefs.length === 0) return;
  
  // Get all entity positions with extra margin positions
  const positions = entityRefs.map(entity => {
    if (entity.properties) {
      const lon = entity.properties.lon?.getValue();
      const lat = entity.properties.lat?.getValue();
      const height = entity.properties.height?.getValue() ?? 0;
      return Cesium.Cartesian3.fromDegrees(lon, lat, height);
    }
    // Fallback: use (0,0,0) if properties are missing
    return Cesium.Cartesian3.fromDegrees(0, 0, 0);
  });
  
  // Create bounding sphere from entity positions
  const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
  
  // Calculate zoom distance using screen resolution
  // Use the actual rendered marker dimensions (resolution-scaled)
  const canvas = viewer.scene.canvas;
  const { resolutionScale } = getScreenResolutionInfo(canvas);
  const maxScale = 1.5; // Match the cap used in markerUtils.ts
  const actualScale = Math.min(resolutionScale, maxScale);
  
  const billboardWidthPixels = 300 * actualScale;
  const billboardHeightPixels = 100 * actualScale; // Use actual rendered height
  const spacingMultiplier = 3.0; // 200% spacing for better visibility
  const safetyMargin = 8.0; // 700% safety margin for zoom to all
  
  const resolutionBasedDistance = calculateResolutionBasedZoomDistance(
    viewer,
    billboardWidthPixels,
    billboardHeightPixels,
    entityRefs.length,
    spacingMultiplier,
    boundingSphere.radius // Pass geographic radius for tight cluster handling
  );
  
  // Add safety margin and use the larger of geographic radius or billboard requirement
  const baseGeographicDistance = boundingSphere.radius * 50; // Much larger geographic distance
  const zoomDistance = Math.max(
    baseGeographicDistance * 15,
    resolutionBasedDistance * safetyMargin
  );
  
  // Fly to bounding sphere with appropriate offset
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: 3.0,
    offset: new Cesium.HeadingPitchRange(
      0, // heading (north)
      Cesium.Math.toRadians(-90), // pitch (straight down)
      zoomDistance // Distance accounting for both geographic spread and billboard width
    )
  });
  
  // Show overlay after zoom
  setShowOverlay(true);
  
  console.log('✈️ Flying to all landmarks with', entityRefs.length, 'entities');
} 