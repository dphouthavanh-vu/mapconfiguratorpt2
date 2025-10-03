import * as Cesium from 'cesium';

// Calculate scaling factor based on screen resolution
export const calculateResolutionScale = (canvas: HTMLCanvasElement, baseResolution: number = 1920): number => {
  const screenWidth = canvas.clientWidth;
  const screenHeight = canvas.clientHeight;
  const screenResolution = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);
  const resolutionScale = screenResolution / baseResolution;
  
  // Cap resolution scale to prevent extreme values
  const maxResolutionScale = 2.0;
  return Math.min(resolutionScale, maxResolutionScale);
};

// Get screen resolution information
export const getScreenResolutionInfo = (canvas: HTMLCanvasElement, baseResolution: number = 1920) => {
  const screenWidth = canvas.clientWidth;
  const screenHeight = canvas.clientHeight;
  const screenResolution = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);
  const resolutionScale = calculateResolutionScale(canvas, baseResolution);
  
  return {
    screenWidth,
    screenHeight,
    screenResolution,
    resolutionScale
  };
};

// Scale a value by resolution
export const scaleByResolution = (value: number, resolutionScale: number): number => {
  return value * resolutionScale;
};

// Calculate resolution-based zoom distance for billboards
export const calculateResolutionBasedZoomDistance = (
  viewer: Cesium.Viewer,
  billboardWidthPixels: number,
  billboardHeightPixels: number,
  numBillboards: number = 1,
  spacingMultiplier: number = 1.2,
  geographicRadius?: number
): number => {
  // Get screen dimensions
  const canvas = viewer.scene.canvas;
  const screenWidth = canvas.clientWidth;
  const screenHeight = canvas.clientHeight;
  const screenResolution = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);
  
  // Get camera field of view
  const fov = (viewer.camera.frustum as Cesium.PerspectiveFrustum).fov || Cesium.Math.toRadians(60);
  const aspectRatio = screenWidth / screenHeight;
  
  // Calculate base zoom distance for billboard visibility
  const totalBillboardWidthPixels = billboardWidthPixels * numBillboards * spacingMultiplier;
  const requiredDistanceForWidth = (totalBillboardWidthPixels / 2) / Math.tan(fov / 2) / aspectRatio;
  const requiredDistanceForHeight = (billboardHeightPixels / 2) / Math.tan(fov / 2);
  
  // Use the larger of the two requirements
  const requiredDistanceForBillboards = Math.max(requiredDistanceForWidth, requiredDistanceForHeight);
  
  // Apply screen resolution scaling
  // Higher resolution screens need more distance to maintain the same visual size
  const baseResolution = 1920; // Base resolution for scaling calculations
  const resolutionScale = screenResolution / baseResolution;
  const resolutionAdjustedDistance = requiredDistanceForBillboards * resolutionScale;
  
  // If geographic radius is provided, adjust distance based on geographic density
  if (geographicRadius !== undefined) {
    // For very tight clusters (small geographic radius), reduce the zoom distance
    const tightClusterThreshold = 1000; // 1km threshold for tight clusters
    const looseClusterThreshold = 10000; // 10km threshold for loose clusters
    const veryTightClusterThreshold = 500; // 500m threshold for very tight clusters
    const ultraTightClusterThreshold = 300; // 300m threshold for ultra tight clusters
    
    // Additional multiplier for clusters with many landmarks in tight space
    const manyLandmarksMultiplier = numBillboards >= 5 ? 0.3 : 1.0; // Reduce by 70% for 5+ landmarks
    
    // Special bonus for exactly 6 landmarks in ultra-tight spaces (Tampa General Hospital area)
    const sixLandmarksBonus = (numBillboards === 6 && geographicRadius < 600) ? 0.5 : 1.0; // Additional 50% reduction
    
    // Special case: exactly 6 landmarks in very tight space - nuclear zoom option
    if (numBillboards === 6 && geographicRadius < 600) {
      // For the Tampa General Hospital area, use extremely aggressive zooming
      const nuclearZoomMultiplier = 0.02; // Reduce to 2% of calculated distance
      const finalDistance = Math.min(resolutionAdjustedDistance, geographicRadius * 3); // Cap at 3x geographic radius
      return Math.min(finalDistance, finalDistance * nuclearZoomMultiplier);
    }
    
    if (geographicRadius < ultraTightClusterThreshold) {
      // Ultra tight cluster - very close zoom for extremely close landmarks
      const ultraTightClusterMultiplier = 0.05; // Reduce to 5% of calculated distance
      const finalDistance = Math.min(resolutionAdjustedDistance, geographicRadius * 6); // Cap at 6x geographic radius
      return Math.min(finalDistance, finalDistance * ultraTightClusterMultiplier * manyLandmarksMultiplier * sixLandmarksBonus);
    } else if (geographicRadius < veryTightClusterThreshold) {
      // Very tight cluster - close zoom, but not too close (sweet spot)
      const veryTightClusterMultiplier = 0.08; // Reduce to 8% of calculated distance
      const finalDistance = Math.min(resolutionAdjustedDistance, geographicRadius * 8); // Cap at 8x geographic radius
      return Math.min(finalDistance, finalDistance * veryTightClusterMultiplier * manyLandmarksMultiplier * sixLandmarksBonus);
    } else if (geographicRadius < tightClusterThreshold) {
      // Tight cluster - moderate close zoom
      const tightClusterMultiplier = 0.25; // Reduce to 25% of calculated distance
      const finalDistance = Math.min(resolutionAdjustedDistance, geographicRadius * 20); // Cap at 20x geographic radius
      return Math.min(finalDistance, finalDistance * tightClusterMultiplier * manyLandmarksMultiplier * sixLandmarksBonus);
    } else if (geographicRadius < looseClusterThreshold) {
      // Medium tightness - moderate distance reduction
      const mediumClusterMultiplier = 0.5; // Reduce to 50% of calculated distance
      return Math.min(resolutionAdjustedDistance, resolutionAdjustedDistance * mediumClusterMultiplier * manyLandmarksMultiplier * sixLandmarksBonus);
    }
  }
  
  // Add a base distance multiplier to ensure adequate zoom distance
  const baseDistanceMultiplier = 2.0; // Increase base distance by 2x
  const finalDistance = resolutionAdjustedDistance * baseDistanceMultiplier;
  
  // Ensure minimum zoom distance to maintain context
  const minimumZoomDistance = 200; // 200m minimum to maintain some context
  return Math.max(finalDistance, minimumZoomDistance);
};

// Calculate resolution-dependent clustering parameters
export const calculateClusteringParameters = (
  canvas: HTMLCanvasElement,
  baseResolution: number = 1920,
  isOverviewMode: boolean = false,
  isUltraOverviewMode: boolean = false
) => {
  const { resolutionScale } = getScreenResolutionInfo(canvas, baseResolution);
  
  let basePixelRange: number;
  let maxPixelRange: number;
  let baseMinimumClusterSize: number;
  let maxMinimumClusterSize: number;
  
  if (isUltraOverviewMode || isOverviewMode) {
    // Ultra-overview mode: very high camera, minimal clustering
    basePixelRange = 20;
    maxPixelRange = 30;
    baseMinimumClusterSize = 3;
    maxMinimumClusterSize = 8;
  } else {
    // Medium/Detailed mode: minimal clustering
    basePixelRange = 45;
    maxPixelRange = 70;
    baseMinimumClusterSize = 3;
    maxMinimumClusterSize = 5;
  }
  
  const pixelRange = Math.round(basePixelRange * resolutionScale);
  const maxPixelRangeScaled = Math.round(maxPixelRange * resolutionScale);
  const finalPixelRange = Math.min(pixelRange, maxPixelRangeScaled);
  
  const minimumClusterSize = Math.round(baseMinimumClusterSize * resolutionScale);
  const maxMinimumClusterSizeScaled = Math.round(maxMinimumClusterSize * resolutionScale);
  const finalMinimumClusterSize = Math.min(minimumClusterSize, maxMinimumClusterSizeScaled);
  
  return {
    resolutionScale,
    pixelRange: finalPixelRange,
    minimumClusterSize: finalMinimumClusterSize,
    clusteringMode: isUltraOverviewMode ? 'ultra-overview' : isOverviewMode ? 'overview' : 'detailed'
  };
};

// Update clustering parameters for a data source
export const updateClusteringParameters = (
  dataSource: Cesium.CustomDataSource,
  pixelRange: number,
  minimumClusterSize: number
) => {
  dataSource.clustering.pixelRange = pixelRange;
  dataSource.clustering.minimumClusterSize = minimumClusterSize;
};

// Refresh clustering by temporarily disabling and re-enabling
export const refreshClustering = (dataSource: Cesium.CustomDataSource) => {
  const wasEnabled = dataSource.clustering.enabled;
  dataSource.clustering.enabled = false;
  setTimeout(() => {
    dataSource.clustering.enabled = wasEnabled;
  }, 100);
};

// Get current clustering parameters
export const getCurrentClusteringParameters = (dataSource: Cesium.CustomDataSource) => {
  return {
    pixelRange: dataSource.clustering.pixelRange,
    minimumClusterSize: dataSource.clustering.minimumClusterSize,
    enabled: dataSource.clustering.enabled
  };
};

// Update adaptive clustering based on camera height
export const updateAdaptiveClustering = (
  dataSource: Cesium.CustomDataSource,
  viewer: Cesium.Viewer,
  disableAdaptiveClusteringRef?: React.MutableRefObject<boolean>,
  clusteringRestoreTimeRef?: React.MutableRefObject<number | null>
): { pixelRange: number; minimumClusterSize: number; resolutionScale: number; clusteringMode: string } => {
  // Check if adaptive clustering is disabled
  if (disableAdaptiveClusteringRef?.current) {
    console.log('🚫 updateAdaptiveClustering: Skipped due to disableAdaptiveClusteringRef');
    return {
      pixelRange: dataSource.clustering.pixelRange,
      minimumClusterSize: dataSource.clustering.minimumClusterSize,
      resolutionScale: 1.0,
      clusteringMode: 'disabled'
    };
  }
  
  // Check if parameters were recently restored
  if (clusteringRestoreTimeRef?.current) {
    const timeSinceRestore = Date.now() - clusteringRestoreTimeRef.current;
    if (timeSinceRestore < 3000) { // 3 seconds protection
      console.log('🚫 updateAdaptiveClustering: Skipped due to recent restore (time since restore:', timeSinceRestore + 'ms)');
      return {
        pixelRange: dataSource.clustering.pixelRange,
        minimumClusterSize: dataSource.clustering.minimumClusterSize,
        resolutionScale: 1.0,
        clusteringMode: 'recently-restored'
      };
    }
  }
  
  const cameraHeight = viewer.camera.positionCartographic?.height || 0;
  const cameraHeightKm = cameraHeight / 1000;
  
  let isUltraOverviewMode = false;
  let isOverviewMode = false;
  
  if (cameraHeightKm > 15000) {
    // Ultra-overview mode: camera very high above Earth (lowered threshold)
    isUltraOverviewMode = true;
  } else if (cameraHeightKm > 8000) {
    // Overview mode: camera high above Earth (lowered threshold)
    isOverviewMode = true;
  }
  
  const canvas = viewer.scene.canvas;
  const clusteringParams = calculateClusteringParameters(canvas, 1920, isOverviewMode, isUltraOverviewMode);
  
  updateClusteringParameters(dataSource, clusteringParams.pixelRange, clusteringParams.minimumClusterSize);
  
  return clusteringParams;
};

// Disable clustering entirely
export const disableClustering = (dataSource: Cesium.CustomDataSource) => {
  dataSource.clustering.enabled = false;
};

// Force immediate clustering update with scene render
export const forceImmediateClusteringUpdate = (
  dataSource: Cesium.CustomDataSource,
  viewer: Cesium.Viewer,
  pixelRange: number,
  minimumClusterSize: number
) => {
  // Set the clustering parameters
  dataSource.clustering.pixelRange = pixelRange;
  dataSource.clustering.minimumClusterSize = minimumClusterSize;
  
  // Temporarily disable clustering
  const wasEnabled = dataSource.clustering.enabled;
  dataSource.clustering.enabled = false;
  
  // Force scene render to clear existing clusters
  viewer.scene.requestRender();
  
  // Re-enable clustering immediately
  setTimeout(() => {
    dataSource.clustering.enabled = wasEnabled;
    
    // Force another render to show new clusters immediately
    viewer.scene.requestRender();
  }, 10);
  
  return {
    pixelRange: dataSource.clustering.pixelRange,
    minimumClusterSize: dataSource.clustering.minimumClusterSize,
    enabled: dataSource.clustering.enabled
  };
};

// Set exact clustering parameters (3, 3, 7) for consistent behavior
export const setExactClusteringParameters = (
  dataSource: Cesium.CustomDataSource,
  viewer: Cesium.Viewer
) => {
  // Set the exact clustering parameters you want: pixelRange=3, minimumClusterSize=3
  // The third parameter (7) might be a different clustering setting or threshold
  // For now, we're using pixelRange=3, minimumClusterSize=3
  const exactPixelRange = 3;
  const exactMinimumClusterSize = 3;
  
  console.log('🎯 Setting exact clustering parameters:', {
    pixelRange: exactPixelRange,
    minimumClusterSize: exactMinimumClusterSize,
    note: 'Looking for 3, 3, 7 pattern'
  });
  
  return forceImmediateClusteringUpdate(
    dataSource,
    viewer,
    exactPixelRange,
    exactMinimumClusterSize
  );
}; 