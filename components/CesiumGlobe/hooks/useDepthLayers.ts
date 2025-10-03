import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

interface DepthLayersConfig {
  particles: {
    enabled: boolean;
    count: number;
    speed: number;
    sizeMin: number;
    sizeMax: number;
    opacityMin: number;
    opacityMax: number;
  };
  orbitalRings: {
    enabled: boolean;
    count: number;
    opacity: number;
    rotationSpeed: number;
  };
  starField: {
    enabled: boolean;
    count: number;
    brightness: number;
  };
}

const defaultConfig: DepthLayersConfig = {
  particles: {
    enabled: true,
    count: 100,
    speed: 0.0001,
    sizeMin: 1,
    sizeMax: 3,
    opacityMin: 0.1,
    opacityMax: 0.3,
  },
  orbitalRings: {
    enabled: true,
    count: 2,
    opacity: 0.15,
    rotationSpeed: 0.0001,
  },
  starField: {
    enabled: true,
    count: 500,
    brightness: 0.8,
  },
};

export function useDepthLayers(
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>,
  viewerReady: boolean,
  config: DepthLayersConfig = defaultConfig
) {
  const particlePrimitivesRef = useRef<Cesium.PointPrimitiveCollection[]>([]);
  const orbitalRingPrimitivesRef = useRef<Cesium.Primitive[]>([]);
  const starFieldPrimitiveRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Create floating particles for depth effect
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || !config.particles.enabled) return;

    const viewer = viewerRef.current;
    const scene = viewer.scene;

    // Clean up existing particles
    particlePrimitivesRef.current.forEach(collection => {
      scene.primitives.remove(collection);
    });
    particlePrimitivesRef.current = [];

    // Create multiple layers of particles at different depths
    const layers = [0.3, 0.5, 0.7, 0.9]; // Depth multipliers

    layers.forEach((depthMultiplier, layerIndex) => {
      const pointCollection = new Cesium.PointPrimitiveCollection();
      // Disable picking to prevent interference with landmark clicks
      (pointCollection as any).allowPicking = false;
      const particleCount = Math.floor(config.particles.count * depthMultiplier);

      for (let i = 0; i < particleCount; i++) {
        // Random position in view frustum
        const lon = Math.random() * 360 - 180;
        const lat = Math.random() * 180 - 90;
        const height = 10000000 * (1 - depthMultiplier) + 5000000; // Vary height based on layer

        const position = Cesium.Cartesian3.fromDegrees(lon, lat, height);

        // Size and opacity based on depth
        const size = Cesium.Math.lerp(
          config.particles.sizeMin,
          config.particles.sizeMax,
          Math.random()
        ) * (1 - depthMultiplier * 0.5);

        const opacity = Cesium.Math.lerp(
          config.particles.opacityMin,
          config.particles.opacityMax,
          Math.random()
        ) * (1 - depthMultiplier * 0.3);

        pointCollection.add({
          position: position,
          pixelSize: size,
          color: Cesium.Color.WHITE.withAlpha(opacity),
          outlineColor: Cesium.Color.TRANSPARENT,
          outlineWidth: 0,
        });
      }

      scene.primitives.add(pointCollection);
      particlePrimitivesRef.current.push(pointCollection);
    });

    // Animate particles
    const animateParticles = () => {
      // Only animate if speed is non-zero and particles are enabled
      if (config.particles.speed === 0 || !config.particles.enabled) {
        animationFrameRef.current = requestAnimationFrame(animateParticles);
        return;
      }

      // Get camera distance for LOD
      const cameraHeight = viewer.camera.positionCartographic.height;
      const lodThreshold = 30000000; // 30,000 km - hide particles when very far

      particlePrimitivesRef.current.forEach((collection, layerIndex) => {
        // Apply LOD - hide distant particles when zoomed out
        if (cameraHeight > lodThreshold) {
          collection.show = false;
        } else {
          collection.show = true;
          const depthSpeed = config.particles.speed * (1 + layerIndex * 0.5);

          // Rotate particles around the globe
          for (let i = 0; i < collection.length; i++) {
            const point = collection.get(i);
            const cartographic = Cesium.Cartographic.fromCartesian(point.position);

            // Slowly drift particles
            cartographic.longitude += depthSpeed * (layerIndex % 2 === 0 ? 1 : -1);
            cartographic.latitude += depthSpeed * 0.1 * Math.sin(Date.now() * 0.0001 + i);

            point.position = Cesium.Cartesian3.fromRadians(
              cartographic.longitude,
              cartographic.latitude,
              cartographic.height
            );
          }
        }
      });

      // Request render if we're using requestRenderMode
      if (viewer.scene.requestRenderMode) {
        viewer.scene.requestRender();
      }

      animationFrameRef.current = requestAnimationFrame(animateParticles);
    };

    animateParticles();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      particlePrimitivesRef.current.forEach(collection => {
        scene.primitives.remove(collection);
      });
    };
  }, [viewerRef, viewerReady, config.particles]);

  // Create orbital rings
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || !config.orbitalRings.enabled) return;

    const viewer = viewerRef.current;
    const scene = viewer.scene;

    // Clean up existing rings
    orbitalRingPrimitivesRef.current.forEach(ring => {
      scene.primitives.remove(ring);
    });
    orbitalRingPrimitivesRef.current = [];

    // Create orbital rings using polyline collections for better visual effect
    for (let i = 0; i < config.orbitalRings.count; i++) {
      const polylines = new Cesium.PolylineCollection();
      // Disable picking to prevent interference with landmark clicks
      (polylines as any).allowPicking = false;

      // Ring parameters
      const radius = 8000000 + i * 1000000; // Different radii for each ring
      const tiltAngle = Cesium.Math.toRadians(30 + i * 25); // Different tilts
      const rotationAngle = Cesium.Math.toRadians(i * 60); // Different rotations

      // Create ring points
      const positions = [];
      const segments = 100;

      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Cesium.Math.TWO_PI;

        // Create point on ring
        let x = radius * Math.cos(angle);
        let y = radius * Math.sin(angle);
        let z = 0;

        // Apply tilt rotation (around X axis)
        const cosT = Math.cos(tiltAngle);
        const sinT = Math.sin(tiltAngle);
        const yTilted = y * cosT - z * sinT;
        const zTilted = y * sinT + z * cosT;

        // Apply rotation (around Z axis)
        const cosR = Math.cos(rotationAngle);
        const sinR = Math.sin(rotationAngle);
        const xRotated = x * cosR - yTilted * sinR;
        const yRotated = x * sinR + yTilted * cosR;

        positions.push(new Cesium.Cartesian3(xRotated, yRotated, zTilted));
      }

      // Create gradient effect with multiple polylines
      const gradientSteps = 3;
      for (let g = 0; g < gradientSteps; g++) {
        const opacity = config.orbitalRings.opacity * (1 - g * 0.3);
        const width = 2 - g * 0.5;

        polylines.add({
          positions: positions,
          width: width,
          material: Cesium.Material.fromType('Color', {
            color: Cesium.Color.fromCssColorString('#60D1DF').withAlpha(opacity),
          }),
        });
      }

      scene.primitives.add(polylines);
      orbitalRingPrimitivesRef.current.push(polylines as any);
    }

    // Animate ring rotation
    let rotationTime = 0;
    const animateRings = () => {
      // Only animate if speed is non-zero and rings are enabled
      if (config.orbitalRings.rotationSpeed === 0 || !config.orbitalRings.enabled) {
        animationFrameRef.current = requestAnimationFrame(animateRings);
        return;
      }

      // Get camera distance for LOD
      const cameraHeight = viewer.camera.positionCartographic.height;
      const lodThreshold = 35000000; // 35,000 km - hide rings when very far

      rotationTime += config.orbitalRings.rotationSpeed;

      orbitalRingPrimitivesRef.current.forEach((polylineCollection, index) => {
        // Apply LOD - hide distant rings when zoomed out
        if (cameraHeight > lodThreshold) {
          polylineCollection.show = false;
        } else {
          polylineCollection.show = true;
          const rotation = Cesium.Matrix3.fromRotationZ(rotationTime * (index % 2 === 0 ? 1 : -1));
          const modelMatrix = Cesium.Matrix4.fromRotationTranslation(rotation, Cesium.Cartesian3.ZERO);

          if (polylineCollection && polylineCollection.modelMatrix) {
            polylineCollection.modelMatrix = modelMatrix;
          }
        }
      });

      // Request render if we're using requestRenderMode
      if (viewer.scene.requestRenderMode) {
        viewer.scene.requestRender();
      }

      animationFrameRef.current = requestAnimationFrame(animateRings);
    };

    animateRings();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      orbitalRingPrimitivesRef.current.forEach(ring => {
        scene.primitives.remove(ring);
      });
    };
  }, [viewerRef, viewerReady, config.orbitalRings]);

  // Create star field background
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || !config.starField.enabled) return;

    const viewer = viewerRef.current;
    const scene = viewer.scene;

    // Clean up existing star field
    if (starFieldPrimitiveRef.current) {
      scene.primitives.remove(starFieldPrimitiveRef.current);
    }

    // Create star field
    const starCollection = new Cesium.PointPrimitiveCollection();
    // Disable picking to prevent interference with landmark clicks
    (starCollection as any).allowPicking = false;
    const starData: { baseAlpha: number; point: any }[] = [];

    for (let i = 0; i < config.starField.count; i++) {
      // Random position on a large sphere
      const lon = Math.random() * 360 - 180;
      const lat = Math.random() * 180 - 90;
      const distance = 50000000; // Far distance for background

      const position = Cesium.Cartesian3.fromDegrees(lon, lat, distance);

      // Random size and brightness
      const size = Math.random() * 2 + 0.5;
      const baseBrightness = Math.random() * config.starField.brightness;

      const point = starCollection.add({
        position: position,
        pixelSize: size,
        color: Cesium.Color.WHITE.withAlpha(baseBrightness),
        outlineColor: Cesium.Color.TRANSPARENT,
        outlineWidth: 0,
      });

      starData.push({ baseAlpha: baseBrightness, point });
    }

    scene.primitives.add(starCollection);
    starFieldPrimitiveRef.current = starCollection;

    // Add camera distance-based visibility for stars
    const updateStarVisibility = () => {
      if (!starFieldPrimitiveRef.current) return;

      const cameraHeight = viewer.camera.positionCartographic.height;
      // Stars fade in as camera moves away from Earth
      const fadeStart = 10000000; // 10,000 km
      const fadeEnd = 30000000; // 30,000 km

      if (cameraHeight < fadeStart) {
        starFieldPrimitiveRef.current.show = false;
      } else {
        starFieldPrimitiveRef.current.show = true;
        // Calculate fade factor
        const fadeFactor = Math.min(1, (cameraHeight - fadeStart) / (fadeEnd - fadeStart));

        // Update star brightness based on camera distance
        starData.forEach(({ baseAlpha, point }) => {
          point.color = Cesium.Color.WHITE.withAlpha(baseAlpha * fadeFactor);
        });

        // Request render if stars visibility changed
        if (viewer.scene.requestRenderMode) {
          viewer.scene.requestRender();
        }
      }
    };

    // Listen to camera changes
    viewer.camera.changed.addEventListener(updateStarVisibility);
    updateStarVisibility(); // Initial update

    return () => {
      if (starFieldPrimitiveRef.current) {
        scene.primitives.remove(starFieldPrimitiveRef.current);
      }
      viewer.camera.changed.removeEventListener(updateStarVisibility);
    };
  }, [viewerRef, viewerReady, config.starField]);
}

export { defaultConfig as defaultDepthLayersConfig, type DepthLayersConfig };