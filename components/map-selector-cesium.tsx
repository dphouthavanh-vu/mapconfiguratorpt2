'use client';

import { useEffect, useRef, useState } from 'react';
import { GeographicBounds } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import * as Cesium from 'cesium';

// Set Cesium configuration
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMGUwMzEyZi0xMjIzLTQ2YzMtYTE2YS0wYTc5MWE4ZjQyMjIiLCJpZCI6MzQ2MzY1LCJpYXQiOjE3NTkzMzgwODh9.50LvkStDOWg6cy5JBbUNvB7MtEY0BF4HZ3XnpH03vb4';

// Configure base URL for Cesium assets
if (typeof window !== 'undefined') {
  (window as any).CESIUM_BASE_URL = '/cesium/';
}

interface MapSelectorProps {
  onBoundsSelected: (bounds: GeographicBounds, mapImage?: string) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
}

export default function MapSelectorCesium({ onBoundsSelected }: MapSelectorProps) {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawingMode, setDrawingMode] = useState(false);
  const [selectedBounds, setSelectedBounds] = useState<GeographicBounds | null>(null);
  const [rectangleEntity, setRectangleEntity] = useState<Cesium.Entity | null>(null);

  // Use a ref to hold the latest onBoundsSelected callback
  const onBoundsSelectedRef = useRef(onBoundsSelected);
  useEffect(() => {
    onBoundsSelectedRef.current = onBoundsSelected;
  }, [onBoundsSelected]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    console.log('[Cesium] Initializing viewer...');

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: true,
      navigationHelpButton: false,
      fullscreenButton: false,
      baseLayerPicker: false,
      contextOptions: {
        webgl: {
          preserveDrawingBuffer: true,
        },
      },
    });

    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(
      new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
      })
    );


    console.log('[Cesium] Viewer created successfully');
    viewerRef.current = viewer;

    // Optionally load world terrain (graceful fallback if it fails)
    Cesium.createWorldTerrainAsync()
      .then((terrainProvider) => {
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.terrainProvider = terrainProvider;
          console.log('[Cesium] World terrain loaded successfully');
        }
      })
      .catch((error) => {
        console.warn('[Cesium] Could not load world terrain, using default flat terrain:', error.message || error);
        // Viewer will continue to work with default flat terrain
      });



    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-74.0060, 40.7128, 15000),
    });

    console.log('[Cesium] Initial camera position set');

    return () => {
      console.log('[Cesium] Cleaning up...');
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      if (viewerRef.current) {
        console.log('[Cesium] Destroying viewer...');
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery || !viewerRef.current) {
      console.warn('[Cesium] Search aborted - no query or viewer not ready');
      return;
    }

    console.log('[Cesium] Searching for:', searchQuery);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data: SearchResult[] = await response.json();

      console.log('[Cesium] Search results:', data.length, 'found');

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        console.log('[Cesium] Flying to coordinates:', { lat, lon });

        viewerRef.current.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1000),
          duration: 2,
        });

        const bounds: GeographicBounds = {
          minLat: parseFloat(result.boundingbox[0]),
          maxLat: parseFloat(result.boundingbox[1]),
          minLng: parseFloat(result.boundingbox[2]),
          maxLng: parseFloat(result.boundingbox[3]),
        };

        console.log('[Cesium] Selected bounds:', bounds);

        drawRectangle(bounds);
        setSelectedBounds(bounds);

        // Capture map image
        const mapImage = await captureMapImage(bounds);
        onBoundsSelectedRef.current(bounds, mapImage);
      } else {
        console.warn('[Cesium] No search results found');
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('[Cesium] Search error:', error);
      alert('Search failed. Please try again.');
    }
  };

  const captureMapImage = async (bounds: GeographicBounds): Promise<string> => {
    if (!viewerRef.current) {
      console.error('[Cesium] Viewer not available');
      return '';
    }

    const viewer = viewerRef.current;

    return new Promise((resolve) => {
      console.log('[Cesium] Capturing map image for bounds:', bounds);

      // Store rectangle info for restoration
      let rectangleCoords = null;
      if (rectangleEntity) {
        rectangleCoords = rectangleEntity.rectangle?.coordinates?.getValue(Cesium.JulianDate.now());
        viewer.entities.remove(rectangleEntity);
        setRectangleEntity(null);
        console.log('[Cesium] Rectangle removed before capture');
      }

      // Remove ALL entities to ensure clean capture
      viewer.entities.removeAll();

      // Fly to the bounds
      viewer.camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(
          bounds.minLng,
          bounds.minLat,
          bounds.maxLng,
          bounds.maxLat
        ),
        duration: 1.5,
        complete: () => {
          // Wait for tiles to load
          const checkTilesLoaded = () => {
            const globe = viewer.scene.globe;
            const tilesLoaded = globe.tilesLoaded;

            console.log('[Cesium] Tiles loaded:', tilesLoaded);

            if (tilesLoaded) {
              // Wait for final render, then capture
              setTimeout(() => {
                try {
                  const canvas = viewer.scene.canvas;
                  const dataUrl = canvas.toDataURL('image/png');

                  console.log('[Cesium] Map image captured (clean), size:', dataUrl.length, 'bytes');

                  // Restore the rectangle
                  if (rectangleCoords) {
                    const newEntity = viewer.entities.add({
                      rectangle: {
                        coordinates: rectangleCoords,
                        material: Cesium.Color.BLUE.withAlpha(0.3),
                        outline: true,
                        outlineColor: Cesium.Color.BLUE,
                        outlineWidth: 2,
                        height: 0, // Explicitly set height to avoid terrain clamping issues with outlines
                      },
                    });
                    setRectangleEntity(newEntity);
                    console.log('[Cesium] Rectangle restored after capture');
                  }

                  resolve(dataUrl);
                } catch (error) {
                  console.error('[Cesium] Error capturing canvas:', error);
                  // Restore rectangle even on error
                  if (rectangleCoords) {
                    const newEntity = viewer.entities.add({
                      rectangle: {
                        coordinates: rectangleCoords,
                        material: Cesium.Color.BLUE.withAlpha(0.3),
                        outline: true,
                        outlineColor: Cesium.Color.BLUE,
                        outlineWidth: 2,
                        height: 0, // Explicitly set height to avoid terrain clamping issues with outlines
                      },
                    });
                    setRectangleEntity(newEntity);
                  }
                  resolve('');
                }
              }, 500);
            } else {
              setTimeout(checkTilesLoaded, 100);
            }
          };

          setTimeout(checkTilesLoaded, 500);
        }
      });
    });
  };

  const drawRectangle = (bounds: GeographicBounds) => {
    if (!viewerRef.current) {
      console.warn('[Cesium] Cannot draw rectangle - viewer not ready');
      return;
    }

    // Remove existing rectangle
    if (rectangleEntity) {
      viewerRef.current.entities.remove(rectangleEntity);
    }

    // Create new rectangle
    const entity = viewerRef.current.entities.add({
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(
          bounds.minLng,
          bounds.minLat,
          bounds.maxLng,
          bounds.maxLat
        ),
        material: Cesium.Color.BLUE.withAlpha(0.3),
        outline: true,
        outlineColor: Cesium.Color.BLUE,
        outlineWidth: 2,
        height: 0, // Explicitly set height to avoid terrain clamping issues with outlines
      },
    });

    setRectangleEntity(entity);
  };

  const handleToggleDrawing = () => {
    if (!viewerRef.current) return;

    if (drawingMode) {
      // Cancel drawing mode
      console.log('[Cesium] Canceling drawing mode');
      setDrawingMode(false);

      // Re-enable camera controls
      const scene = viewerRef.current.scene;
      scene.screenSpaceCameraController.enableRotate = true;
      scene.screenSpaceCameraController.enableTranslate = true;
      scene.screenSpaceCameraController.enableZoom = true;
      scene.screenSpaceCameraController.enableTilt = true;
      scene.screenSpaceCameraController.enableLook = true;

      // Destroy the custom handler
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    } else {
      // Enable drawing mode
      console.log('[Cesium] Enabling drawing mode');
      setDrawingMode(true);

      // Disable camera controls to allow drawing
      const scene = viewerRef.current.scene;
      scene.screenSpaceCameraController.enableRotate = false;
      scene.screenSpaceCameraController.enableTranslate = false;
      scene.screenSpaceCameraController.enableZoom = false;
      scene.screenSpaceCameraController.enableTilt = false;
      scene.screenSpaceCameraController.enableLook = false;

      enableDrawingMode();
    }
  };

  const enableDrawingMode = () => {
    if (!viewerRef.current) return;

    // Clean up any existing handler first
    if (handlerRef.current) {
      handlerRef.current.destroy();
    }

    const viewer = viewerRef.current;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handlerRef.current = handler;
    let startPosition: Cesium.Cartographic | null = null;

    console.log('[Cesium] Drawing handler created - Click and drag to select area');

    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        startPosition = Cesium.Cartographic.fromCartesian(cartesian);
        console.log('[Cesium] Drawing started at:', {
          lat: Cesium.Math.toDegrees(startPosition.latitude).toFixed(4),
          lng: Cesium.Math.toDegrees(startPosition.longitude).toFixed(4)
        });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      if (!startPosition) return;

      const cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const endPosition = Cesium.Cartographic.fromCartesian(cartesian);

        const bounds: GeographicBounds = {
          minLat: Math.min(Cesium.Math.toDegrees(startPosition.latitude), Cesium.Math.toDegrees(endPosition.latitude)),
          maxLat: Math.max(Cesium.Math.toDegrees(startPosition.latitude), Cesium.Math.toDegrees(endPosition.latitude)),
          minLng: Math.min(Cesium.Math.toDegrees(startPosition.longitude), Cesium.Math.toDegrees(endPosition.longitude)),
          maxLng: Math.max(Cesium.Math.toDegrees(startPosition.longitude), Cesium.Math.toDegrees(endPosition.longitude)),
        };

        // Only draw preview, don't select yet
        drawRectangle(bounds);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      if (!startPosition) return;

      const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const endPosition = Cesium.Cartographic.fromCartesian(cartesian);

        const bounds: GeographicBounds = {
          minLat: Math.min(Cesium.Math.toDegrees(startPosition.latitude), Cesium.Math.toDegrees(endPosition.latitude)),
          maxLat: Math.max(Cesium.Math.toDegrees(startPosition.latitude), Cesium.Math.toDegrees(endPosition.latitude)),
          minLng: Math.min(Cesium.Math.toDegrees(startPosition.longitude), Cesium.Math.toDegrees(endPosition.longitude)),
          maxLng: Math.max(Cesium.Math.toDegrees(startPosition.longitude), Cesium.Math.toDegrees(endPosition.longitude)),
        };

        console.log('[Cesium] Drawing completed - Area selected:', bounds);

        // Final selection
        drawRectangle(bounds);
        setSelectedBounds(bounds);

        // Re-enable camera controls
        const scene = viewer.scene;
        scene.screenSpaceCameraController.enableRotate = true;
        scene.screenSpaceCameraController.enableTranslate = true;
        scene.screenSpaceCameraController.enableZoom = true;
        scene.screenSpaceCameraController.enableTilt = true;
        scene.screenSpaceCameraController.enableLook = true;

        // Clean up and disable drawing mode
        setDrawingMode(false);
        handler.destroy();
        handlerRef.current = null;

        // Capture map image
        (async () => {
          const mapImage = await captureMapImage(bounds);
          onBoundsSelectedRef.current(bounds, mapImage);
        })();
      }
    }, Cesium.ScreenSpaceEventType.LEFT_UP);
  };

  return (
    <div className="relative h-full w-full">
      {/* Cesium Viewer Container */}
      <div ref={containerRef} className="h-full w-full rounded-lg" />

      {/* Search Control */}
      <div className="absolute top-4 left-4 z-[1000] bg-white p-2 rounded-lg shadow-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex gap-2"
        >
          <Input
            type="text"
            placeholder="Search location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      {/* Drawing Mode Toggle */}
      <div className="absolute top-20 left-4 z-[1000]">
        <button
          onClick={handleToggleDrawing}
          className={`px-4 py-2 rounded-lg shadow-lg font-medium ${drawingMode
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
        >
          {drawingMode ? 'Cancel Drawing' : 'Draw Selection Area'}
        </button>
      </div>

      {/* Selected Bounds Display */}
      {selectedBounds && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white p-3 rounded-lg shadow-lg">
          <div className="text-sm">
            <p className="font-semibold mb-1">Selected Area:</p>
            <p>Lat: {selectedBounds.minLat.toFixed(4)} to {selectedBounds.maxLat.toFixed(4)}</p>
            <p>Lng: {selectedBounds.minLng.toFixed(4)} to {selectedBounds.maxLng.toFixed(4)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
