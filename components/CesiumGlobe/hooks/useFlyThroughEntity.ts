import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

// Known aspect ratio from the SVG file (width="1407" height="448")
const SVG_ASPECT_RATIO = 1407 / 448; // = 3.141

/**
 * Custom hook to manage the fly-through entity lifecycle in Cesium.
 * Accepts all necessary refs, state, and dependencies as arguments.
 */
export function useFlyThroughEntity({
  viewerRef,
  showFlyThroughEntity,
  flyThroughPrimitiveRef,
  flyThroughPositionRef,
  logoSize,
}: {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
  showFlyThroughEntity: boolean;
  flyThroughPrimitiveRef: React.MutableRefObject<Cesium.Primitive | null>;
  flyThroughPositionRef: React.MutableRefObject<{ lon: number; lat: number; height: number }>;
  logoSize: { width: number; height: number };
}) {
  // Use a ref to store the current logo size to avoid dependency issues
  const logoSizeRef = useRef(logoSize);
  logoSizeRef.current = logoSize;
    useEffect(() => {
    
    if (!viewerRef.current || !viewerRef.current.scene) {
      return;
    }
    
    const viewer = viewerRef.current;
    const scene = viewer.scene;
    
    // Helper function to calculate proper plane size based on desired screen size
    const calculatePlaneSize = (desiredScreenWidth: number, desiredScreenHeight: number, cameraDistance: number) => {
      if (!viewer.camera) return { width: 10000000, height: 10000000 };
      
      // Get camera's field of view - handle different frustum types
      let fov = 60; // Default fallback FOV
      if (viewer.camera.frustum && 'fov' in viewer.camera.frustum) {
        const frustumFov = (viewer.camera.frustum as any).fov;
        if (typeof frustumFov === 'number') {
          fov = frustumFov;
        }
      } else if (viewer.camera.frustum) {
        // For PerspectiveOffCenterFrustum, calculate FOV from top/bottom
        const frustum = viewer.camera.frustum as any;
        if (frustum.top !== undefined && frustum.bottom !== undefined && frustum.near !== undefined) {
          fov = 2 * Math.atan(Math.abs(frustum.top - frustum.bottom) / (2 * frustum.near)) * 180 / Math.PI;
        }
      }
      
      const canvas = viewer.scene.canvas;
      const screenWidth = canvas.clientWidth;
      const screenHeight = canvas.clientHeight;
      
      // Calculate world size based on desired screen size and camera distance
      // Using trigonometry: worldSize = 2 * distance * tan(fov/2) * (screenSize / screenDimension)
      const fovRadians = fov * Math.PI / 180;
      
      // Use the SVG aspect ratio to calculate proper dimensions
      // Since we want the plane to match the overlay size, we'll use the smaller screen dimension
      // and apply the SVG aspect ratio to maintain proportions
      
      // Use a more balanced approach: calculate size based on the smaller dimension
      // This prevents the plane from becoming too large when applying the aspect ratio
      const minScreenDimension = Math.min(desiredScreenWidth, desiredScreenHeight);
      const baseWorldSize = 2 * cameraDistance * Math.tan(fovRadians / 2) * (minScreenDimension / Math.max(screenWidth, screenHeight)) * 20.0; // 200% of original size
      
      // Apply the SVG aspect ratio (1407/448 = 3.141)
      let worldWidth, worldHeight;
      if (SVG_ASPECT_RATIO >= 1) {
        // SVG is wider than tall - use height as base
        worldHeight = baseWorldSize;
        worldWidth = baseWorldSize * SVG_ASPECT_RATIO;
      } else {
        // SVG is taller than wide - use width as base
        worldWidth = baseWorldSize;
        worldHeight = baseWorldSize / SVG_ASPECT_RATIO;
      }
      
      // Force a much smaller size if the calculated size is still too large
      const maxAllowedSize = 1000000; // 1,000km maximum
      if (worldWidth > maxAllowedSize || worldHeight > maxAllowedSize) {
        const scaleFactor = maxAllowedSize / Math.max(worldWidth, worldHeight);
        worldWidth *= scaleFactor;
        worldHeight *= scaleFactor;
      }
      
      
      return { width: worldWidth, height: worldHeight };
    };
    
    // ALWAYS check for existing entities, regardless of whether we're creating new ones
    
    // Check the entities collection for TGH logos
    
    // Try to access entities in different ways
    try {
      
      if (viewer && viewer.entities) {
        const entities = viewer.entities.values;
        
        for (let i = 0; i < entities.length; i++) {
          const entity = entities[i];
        }
      } else {
        
        // Try alternative access methods
        if (viewer) {
          if ('dataSources' in viewer) {
          }
        }
      }
      
      // TEST LOG: Verify this code is running
      
      // ENHANCED DEBUGGING: Check alternative storage locations
      
      if (viewer) {
        // Check dataSources
        if ('dataSources' in viewer && viewer.dataSources) {
          for (let i = 0; i < viewer.dataSources.length; i++) {
            const dataSource = viewer.dataSources.get(i);
            
            // Check entities within this data source
            if (dataSource.entities) {
              const entities = dataSource.entities.values;
              for (let j = 0; j < entities.length; j++) {
                const entity = entities[j];
              }
            }
          }
        }
        
        // Check other potential storage locations
        const alternativeLocations = [
          'scene', 'camera', 'screenSpaceEventHandler', 'canvas', 'container',
          'cesiumWidget', 'dataSourceDisplay', 'imageryLayers', 'terrainProvider'
        ];
        
        for (const location of alternativeLocations) {
          if (location in viewer) {
            const obj = (viewer as any)[location];
          }
        }
      }
    } catch (error) {
      console.error('❌ Error accessing entities collection:', error);
    }
    
    // If showFlyThroughEntity is false, ensure all fly-through primitives are removed
    if (!showFlyThroughEntity) {
      
      // Remove the primitive referenced by the ref
      if (flyThroughPrimitiveRef.current && scene.primitives.contains(flyThroughPrimitiveRef.current)) {
        scene.primitives.remove(flyThroughPrimitiveRef.current);
      }
      flyThroughPrimitiveRef.current = null;
      
      // Also clean up any other fly-through primitives that might be in the scene
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
      return; // Exit early, don't proceed with creation logic
    }
    
    if (showFlyThroughEntity) {
      
      // Always remove any existing fly-through entities first
      let existingFlyThroughPrimitives = [];
      for (let i = 0; i < scene.primitives.length; i++) {
        const primitive = scene.primitives.get(i);
        if (primitive && 
            primitive.appearance && 
            primitive.appearance.material && 
            primitive.appearance.material.uniforms && 
            primitive.appearance.material.uniforms.image && 
            primitive.appearance.material.uniforms.image.indexOf('tghMainLogo.svg') !== -1) {
          existingFlyThroughPrimitives.push({ index: i, primitive });
        }
      }
      
      
      // Remove all existing fly-through primitives
      for (const { primitive, index } of existingFlyThroughPrimitives) {
        scene.primitives.remove(primitive);
      }
      
      // Clear the ref since we're removing all existing ones
      flyThroughPrimitiveRef.current = null;
      
      
      // Only create a new one if we don't already have one
      if (flyThroughPrimitiveRef.current === null) {
      
      
      // Count existing fly-through primitives
      let existingCount = 0;
      for (let i = 0; i < scene.primitives.length; i++) {
        const primitive = scene.primitives.get(i);
        if (primitive && 
            primitive.appearance && 
            primitive.appearance.material && 
            primitive.appearance.material.uniforms && 
            primitive.appearance.material.uniforms.image && 
            primitive.appearance.material.uniforms.image.indexOf('tghMainLogo.svg') !== -1) {
          existingCount++;
        }
      }
      
      
      // Use the stored position for the primitive
      let position = Cesium.Cartesian3.fromDegrees(flyThroughPositionRef.current.lon, flyThroughPositionRef.current.lat, flyThroughPositionRef.current.height);
      
      // Debug: Log the actual Cartesian position
      
      // Debug: Log camera position for reference
      if (viewer.camera) {
        const cameraPos = viewer.camera.position;
        const cameraCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cameraPos);
        const cameraLon = Cesium.Math.toDegrees(cameraCartographic.longitude);
        const cameraLat = Cesium.Math.toDegrees(cameraCartographic.latitude);
        const cameraHeight = cameraCartographic.height;
        
        // Calculate distance from camera to entity position
        const distance = Cesium.Cartesian3.distance(cameraPos, position);
        
        // Log the positioning method used
        
        // Show the positioning relationship
        const entityCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position);
        const entityLon = Cesium.Math.toDegrees(entityCartographic.longitude);
        const entityLat = Cesium.Math.toDegrees(entityCartographic.latitude);
        const entityHeight = entityCartographic.height;
        
      }
      
      // Calculate proper plane size based on desired screen size and camera distance
      let planeWidth = 10000000; // Default fallback
      let planeHeight = 10000000; // Default fallback
      
      if (viewer.camera && logoSizeRef.current.width > 0 && logoSizeRef.current.height > 0) {
        // Calculate distance from camera to entity position
        const cameraPos = viewer.camera.position;
        const distance = Cesium.Cartesian3.distance(cameraPos, position);
        
        // Use the logo size as the desired screen size
        const { width, height } = calculatePlaneSize(logoSizeRef.current.width, logoSizeRef.current.height, distance);
        planeWidth = width;
        planeHeight = height;
        
        // Add minimum size check to ensure visibility
    
        
      } else {
        // Use a larger default size to ensure visibility
        planeWidth = 5000000; // 5km
        planeHeight = 5000000; // 5km
      }
      
      // Orient the plane so it is perfectly flat to the camera (column-major order)
      let modelMatrix = Cesium.Matrix4.IDENTITY;
      if (viewer.camera) {
        // Get the camera's direction and up vectors
        const direction = Cesium.Cartesian3.normalize(viewer.camera.directionWC, new Cesium.Cartesian3());
        const up = Cesium.Cartesian3.normalize(viewer.camera.upWC, new Cesium.Cartesian3());
        const right = Cesium.Cartesian3.cross(direction, up, new Cesium.Cartesian3());
        Cesium.Cartesian3.normalize(right, right);
        
        // Create a simpler rotation matrix that maintains aspect ratio
        // Cesium.Matrix3 is column-major: right, up, -direction
        const rotation = new Cesium.Matrix3(
          right.x, up.x, -direction.x,
          right.y, up.y, -direction.y,
          right.z, up.z, -direction.z
        );
        
        // Model matrix: rotation + translation, then scale for width/height
        const baseMatrix = Cesium.Matrix4.fromRotationTranslation(rotation, position);
        
        // Apply scaling with explicit aspect ratio control
        const scaleVector = new Cesium.Cartesian3(planeWidth, planeHeight, 1.0);
        
        modelMatrix = Cesium.Matrix4.multiplyByScale(
          baseMatrix,
          scaleVector,
          new Cesium.Matrix4()
        );
        
        // Debug the final model matrix
      }
      // Create material with error handling
      let material;
      try {
        material = Cesium.Material.fromType('Image', {
          image: '/tghMainLogo.svg',
          repeat: new Cesium.Cartesian2(1.0, 1.0),
          color: Cesium.Color.WHITE,
          transparent: true,
        });
      } catch (error) {
        console.error('❌ Error creating material:', error);
        // Fallback to a simple colored material
        material = Cesium.Material.fromType('Color', {
          color: Cesium.Color.YELLOW.withAlpha(0.8),
        });
      }

      const primitive = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PlaneGeometry({
            vertexFormat: Cesium.VertexFormat.ALL,
          }),
          modelMatrix,
        }),
        appearance: new Cesium.MaterialAppearance({
          material: material,
        }),
        show: true,
      });
      
      scene.primitives.add(primitive);
      flyThroughPrimitiveRef.current = primitive;
      
      // Alternative approach: Also try adding a billboard for comparison
      try {
        const billboard = viewer.scene.primitives.add(new Cesium.BillboardCollection());
        billboard.add({
          position: position,
          image: '/tghMainLogo.svg',
          width: planeWidth / 1000, // Scale down for billboard
          height: planeHeight / 1000, // Scale down for billboard
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
        });
      } catch (error) {
      }
      
      // Debug: Check if the primitive is in the camera's view
      if (viewer.camera) {
        const cameraPos = viewer.camera.position;
        const entityPos = position;
        const distance = Cesium.Cartesian3.distance(cameraPos, entityPos);
        
        // Check if entity is within camera's view frustum
        const entityScreenPos = Cesium.SceneTransforms.worldToWindowCoordinates(scene, entityPos);
        
        if (entityScreenPos) {
          
          // Calculate what size the entity should appear on screen
          const expectedScreenWidth = logoSizeRef.current.width;
          const expectedScreenHeight = logoSizeRef.current.height;
          
          // Check if the entity size matches the overlay size
          const sizeRatio = planeWidth / planeHeight;
          const overlayRatio = expectedScreenWidth / expectedScreenHeight;
          
          // Additional verification that dimensions match exactly
        } else {
        }
      }
      
      
      // Log all primitives in the scene for debugging
      for (let i = 0; i < scene.primitives.length; i++) {
        const primitive = scene.primitives.get(i);
        const isFlyThrough = primitive && 
          primitive.appearance && 
          primitive.appearance.material && 
          primitive.appearance.material.uniforms && 
          primitive.appearance.material.uniforms.image && 
          primitive.appearance.material.uniforms.image.indexOf('tghMainLogo.svg') !== -1;
        
      }
    } else if (showFlyThroughEntity && flyThroughPrimitiveRef.current) {
      // Update existing primitive position during rotation
      const { lon, lat, height } = flyThroughPositionRef.current;
      const newPosition = Cesium.Cartesian3.fromDegrees(lon, lat, height);
      
      if (viewer.camera) {
        // Get the camera's direction and up vectors
        const direction = Cesium.Cartesian3.normalize(viewer.camera.directionWC, new Cesium.Cartesian3());
        const up = Cesium.Cartesian3.normalize(viewer.camera.upWC, new Cesium.Cartesian3());
        const right = Cesium.Cartesian3.cross(direction, up, new Cesium.Cartesian3());
        Cesium.Cartesian3.normalize(right, right);
        
        // Cesium.Matrix3 is column-major: right, up, -direction
        const rotation = new Cesium.Matrix3(
          right.x, up.x, -direction.x,
          right.y, up.y, -direction.y,
          right.z, up.z, -direction.z
        );
        
        // Calculate plane size using the same logic as creation
        let planeWidth = 10000000;
        let planeHeight = 10000000;
        if (logoSizeRef.current.width > 0 && logoSizeRef.current.height > 0) {
          const cameraPos = viewer.camera.position;
          const distance = Cesium.Cartesian3.distance(cameraPos, newPosition);
          const { width, height } = calculatePlaneSize(logoSizeRef.current.width, logoSizeRef.current.height, distance);
          planeWidth = width;
          planeHeight = height;
          
          // Add minimum size check to ensure visibility
          const minSize = 1000000; // 1km minimum
          if (planeWidth < minSize || planeHeight < minSize) {
            planeWidth = Math.max(planeWidth, minSize);
            planeHeight = Math.max(planeHeight, minSize);
          }
        }
        
        // Update model matrix with new position
        const baseMatrix = Cesium.Matrix4.fromRotationTranslation(rotation, newPosition);
        const newModelMatrix = Cesium.Matrix4.multiplyByScale(
          baseMatrix,
          new Cesium.Cartesian3(planeWidth, planeHeight, 1.0),
          new Cesium.Matrix4()
        );
        
        // Update the primitive's geometry instance
        if (flyThroughPrimitiveRef.current && 'geometryInstances' in flyThroughPrimitiveRef.current) {
          const geometryInstances = (flyThroughPrimitiveRef.current as any).geometryInstances;
          const geometryInstance = Array.isArray(geometryInstances) ? geometryInstances[0] : geometryInstances;
          if (geometryInstance && 'modelMatrix' in geometryInstance) {
            (geometryInstance as any).modelMatrix = newModelMatrix;
          }
        }
      }
    }
  }
    return () => {
      if (flyThroughPrimitiveRef.current && scene.primitives.contains(flyThroughPrimitiveRef.current)) {
        scene.primitives.remove(flyThroughPrimitiveRef.current);
        flyThroughPrimitiveRef.current = null;
      }
    };
  }, [showFlyThroughEntity, viewerRef, flyThroughPrimitiveRef, flyThroughPositionRef]);
}