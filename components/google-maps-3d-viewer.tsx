'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Map3D, Map3DCameraProps } from '@/components/map-3d';
import { MapController } from '@/lib/map-controller';
import { useMapStore, MapMarker } from '@/lib/map-state';
import { GeographicBounds } from '@/lib/types';
import { ArrowLeft, Map as MapIcon, RotateCcw, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import CategoryFilterPanel from '@/components/CategoryFilterPanel';
import dynamic from 'next/dynamic';
import { buildAINavigatorPrompt } from '@/lib/ai-navigator-prompt';
import { getMarkerColor, getContrastTextColor } from '@/lib/color-utils';

// Dynamically import components to avoid SSR issues
const ZoneDetailView = dynamic(() => import('@/components/ZoneDetailView'), { ssr: false });
const AIChatDialog = dynamic(() => import('@/components/ai-chat-dialog'), { ssr: false });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

interface Zone {
  id: string;
  type: string;
  coordinates: string;
  content: string;
  style: string | null;
}

interface CanvasConfig {
  width: number;
  height: number;
}

interface GoogleMaps3DViewerProps {
  zones?: Zone[];
  landmarks?: Array<{
    name: string;
    lon: number;
    lat: number;
    icon: string;
    color?: string; // Custom color for marker
    contentUrl?: string;
    description?: string;
    category?: string;
    images?: string[];
    links?: Array<{url: string; label?: string}>;
    videos?: string[];
  }>;
  mapTitle?: string;
  title?: string;
  geoBounds?: GeographicBounds | null;
  canvasConfig?: CanvasConfig;
  aiNavigatorEnabled?: boolean;
  aiNavigatorPrompt?: string | null;
  onBackToMaps?: () => void;
  onView2D?: () => void;
}

function GoogleMaps3DViewerComponent({
  zones,
  landmarks: propLandmarks,
  mapTitle,
  title,
  geoBounds,
  canvasConfig,
  aiNavigatorEnabled = true,
  aiNavigatorPrompt,
  onBackToMaps,
  onView2D
}: GoogleMaps3DViewerProps) {
  const [map, setMap] = useState<google.maps.maps3d.Map3DElement | null>(null);
  const maps3dLib = useMapsLibrary('maps3d');
  const elevationLib = useMapsLibrary('elevation');

  const { cameraTarget, setCameraTarget, preventAutoFrame } = useMapStore();
  const mapController = useRef<MapController | null>(null);

  // Convert zones to landmarks format if zones are provided
  const landmarks = useMemo(() => {
    if (propLandmarks) return propLandmarks;
    if (!zones || zones.length === 0) {
      console.log('[GoogleMaps3DViewer] No zones provided');
      return [];
    }

    console.log('[GoogleMaps3DViewer] Converting zones to landmarks:', zones.length, 'zones');
    console.log('[GoogleMaps3DViewer] First zone:', zones[0]);
    console.log('[GoogleMaps3DViewer] Geographic bounds:', geoBounds);
    console.log('[GoogleMaps3DViewer] Canvas config:', canvasConfig);

    const converted = zones.map((zone, idx) => {
      try {
        const content = typeof zone.content === 'string' ? JSON.parse(zone.content) : zone.content;
        const coordinates = typeof zone.coordinates === 'string' ? JSON.parse(zone.coordinates) : zone.coordinates;

        console.log(`[GoogleMaps3DViewer] Zone ${idx} raw coordinates:`, coordinates);

        // Check if coordinates are already in lat/lng format or need conversion
        let lat: number, lng: number;

        if (coordinates.lat !== undefined && coordinates.lng !== undefined) {
          // Already in geographic format
          lat = coordinates.lat;
          lng = coordinates.lng;
          console.log(`[GoogleMaps3DViewer] Zone ${idx} using existing lat/lng:`, { lat, lng });
        } else if (geoBounds && canvasConfig && coordinates.x !== undefined && coordinates.y !== undefined) {
          // Need to convert from pixel coordinates using zonesToLandmarks
          console.log(`[GoogleMaps3DViewer] Zone ${idx} has pixel coordinates, converting using zonesToLandmarks`);
          const { zonesToLandmarks: convertZones } = require('@/lib/csv-generator');
          const { zoneToGeo } = require('@/lib/coordinate-converter');

          const geoCoords = zoneToGeo(
            coordinates,
            zone.type,
            canvasConfig.width,
            canvasConfig.height,
            geoBounds
          );
          lat = geoCoords.lat;
          lng = geoCoords.lng;
          console.log(`[GoogleMaps3DViewer] Zone ${idx} converted to:`, { lat, lng });
        } else {
          // Can't convert - missing data
          console.error(`[GoogleMaps3DViewer] Zone ${idx} cannot be converted - missing geoBounds or canvasConfig`);
          lat = 0;
          lng = 0;
        }

        // Parse style for color
        const style = zone.style ? (typeof zone.style === 'string' ? JSON.parse(zone.style) : zone.style) : {};

        return {
          name: content.title || 'Unnamed Zone',
          lat: lat,
          lon: lng,
          icon: 'maki:marker',
          color: style.color, // Include zone's custom color if available
          description: content.description || '',
          category: content.category,
          images: content.images || [],
          videos: content.videos || [],
          links: content.links || [],
        };
      } catch (error) {
        console.error(`[GoogleMaps3DViewer] Error converting zone ${idx}:`, error, zone);
        return null;
      }
    }).filter(Boolean);

    console.log('[GoogleMaps3DViewer] Converted landmarks:', converted.length);
    console.log('[GoogleMaps3DViewer] Landmarks:', converted);
    return converted as any[];
  }, [zones, propLandmarks, geoBounds, canvasConfig]);

  // Use mapTitle if provided, otherwise use title
  const displayTitle = mapTitle || title;

  // Category filtering state
  const allCategories = useMemo(() =>
    Array.from(
      new Set(landmarks.map(l => l.category).filter((c): c is string => !!c))
    ).sort(),
    [landmarks]
  );

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(allCategories)
  );

  // Filter landmarks based on selected categories
  const filteredLandmarks = useMemo(() =>
    landmarks.filter(landmark => {
      if (!landmark.category) return true;
      return selectedCategories.has(landmark.category);
    }),
    [landmarks, selectedCategories]
  );

  // Zone detail view state (focus mode)
  const [zoneDetailOpen, setZoneDetailOpen] = useState(false);
  const [activeLandmarkIdx, setActiveLandmarkIdx] = useState<number | null>(null);

  // AI Chat state - always visible when enabled
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const aiSystemPrompt = useMemo(() => {
    if (landmarks.length === 0) return '';

    // Convert landmarks back to zone format for the prompt builder
    // This ensures we use the CONVERTED geographic coordinates, not raw pixel coordinates
    const zonesData = landmarks.map((landmark, idx) => {
      return {
        id: `landmark-${idx}`,
        content: {
          title: landmark.name,
          description: landmark.description || '',
          category: landmark.category,
          images: landmark.images || [],
          videos: landmark.videos || [],
          links: landmark.links || []
        },
        coordinates: {
          lat: landmark.lat,
          lng: landmark.lon
        }
      };
    });

    console.log('[GoogleMaps3DViewer] Building AI prompt with landmarks:', zonesData);
    console.log('[GoogleMaps3DViewer] Landmarks array order:', landmarks.map((l, idx) => `${idx}: ${l.name}`));
    return buildAINavigatorPrompt(zonesData, aiNavigatorPrompt);
  }, [landmarks, aiNavigatorPrompt]);

  // Auto-open AI chat when navigator is enabled
  useEffect(() => {
    if (aiNavigatorEnabled && zones && zones.length > 0) {
      setAiChatOpen(true);
    }
  }, [aiNavigatorEnabled, zones]);

  // Globe intro state
  const [showGlobeIntro, setShowGlobeIntro] = useState(true);
  const [isEnteringGlobe, setIsEnteringGlobe] = useState(false);

  const activeLandmark = activeLandmarkIdx !== null ? landmarks[activeLandmarkIdx] : null;

  // Calculate initial view - start with globe view
  const initialViewProps = useMemo(() => {
    if (geoBounds) {
      const centerLat = (geoBounds.minLat + geoBounds.maxLat) / 2;
      const centerLng = (geoBounds.minLng + geoBounds.maxLng) / 2;

      // Start with a zoomed-out globe view
      return {
        center: { lat: centerLat, lng: centerLng, altitude: 0 },
        range: 15000000, // Very zoomed out to show globe
        heading: 0,
        tilt: 0, // Top-down view for globe
        roll: 0,
      };
    }

    return {
      center: { lat: 0, lng: 0, altitude: 0 },
      range: 15000000,
      heading: 0,
      tilt: 0,
      roll: 0,
    };
  }, [geoBounds]);

  const [viewProps, setViewProps] = useState<Map3DCameraProps>(initialViewProps);

  // Category filter handlers
  const handleToggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleSelectAllCategories = useCallback(() => {
    setSelectedCategories(new Set(allCategories));
  }, [allCategories]);

  const handleClearAllCategories = useCallback(() => {
    setSelectedCategories(new Set());
  }, []);

  // Handle entering the globe (zooming to markers)
  const handleEnterGlobe = useCallback(() => {
    setIsEnteringGlobe(true);

    // Hide the intro overlay after a short delay
    setTimeout(() => {
      setShowGlobeIntro(false);
    }, 500);

    // Zoom to markers
    if (mapController.current && filteredLandmarks.length > 0) {
      const entities = filteredLandmarks.map(l => ({ position: { lat: l.lat, lng: l.lon } }));
      mapController.current.frameEntities(entities, [0.05, 0.05, 0.15, 0.05]);
    }

    // Trigger AI welcome speech after user interaction (allows audio to play)
    // Small delay to ensure AI chat is fully initialized
    setTimeout(() => {
      if (aiNavigatorEnabled) {
        // Dispatch custom event that AI chat can listen to
        window.dispatchEvent(new CustomEvent('trigger-ai-welcome-speech'));
      }
    }, 1000);
  }, [filteredLandmarks, aiNavigatorEnabled]);

  // Reset camera to initial view
  const handleResetView = useCallback(() => {
    if (mapController.current && filteredLandmarks.length > 0) {
      const entities = filteredLandmarks.map(l => ({ position: { lat: l.lat, lng: l.lon } }));
      mapController.current.frameEntities(entities, [0.05, 0.05, 0.05, 0.05]);
    }
  }, [filteredLandmarks]);

  // Initialize MapController
  useEffect(() => {
    if (map && maps3dLib && elevationLib) {
      mapController.current = new MapController({
        map,
        maps3dLib,
        elevationLib,
      });
    }
    return () => {
      mapController.current = null;
    };
  }, [map, maps3dLib, elevationLib]);

  // Convert landmarks to markers and add them to the map with click handlers
  useEffect(() => {
    if (!mapController.current || filteredLandmarks.length === 0) return;

    const controller = mapController.current;
    controller.clearMap();

    // Convert landmarks to MapMarker format with colors
    const mapMarkers: MapMarker[] = filteredLandmarks.map((landmark) => {
      // Determine marker color: use zone's color, category-based color, or default
      const markerColors = getMarkerColor(landmark.color, landmark.category);
      const textColor = getContrastTextColor(markerColors.bg);

      return {
        position: {
          lat: landmark.lat,
          lng: landmark.lon,
          altitude: 0,
        },
        label: landmark.name,
        showLabel: true,
        color: markerColors.bg,
        accentColor: markerColors.accent,
        textColor: textColor,
      };
    });

    // Add markers with click handler
    controller.addMarkers(mapMarkers, (index, label) => {
      console.log('[GoogleMaps3DViewer] Marker clicked - index:', index, 'label:', label);

      // Find the landmark in the original landmarks array (not filtered)
      const landmarkIndex = landmarks.findIndex(l => l.name === label);
      console.log('[GoogleMaps3DViewer] Found landmark at index:', landmarkIndex);

      if (landmarkIndex !== -1) {
        setActiveLandmarkIdx(landmarkIndex);
        setZoneDetailOpen(true);

        // Position zone in bottom-left open space
        const landmark = landmarks[landmarkIndex];
        if (mapController.current && landmark) {
          // Move camera slightly to the right and up so the zone appears on the left and down
          // Very small offsets to keep zone visible but shift it to bottom-left
          const offsetLat = 0.001; // Move camera north (zone appears down on screen)
          const offsetLng = 0.0015; // Move camera east (zone appears left on screen)

          mapController.current.flyTo({
            center: {
              lat: landmark.lat + offsetLat,
              lng: landmark.lon + offsetLng,
              altitude: 0
            },
            range: 600, // Closer zoom
            heading: 0, // No rotation
            tilt: 60, // Tilt to see from an angle
            roll: 0,
          });
        }
      }
    });

    // Frame all markers in view (but not if we're showing the globe intro)
    const entities = filteredLandmarks.map(l => ({ position: { lat: l.lat, lng: l.lon } }));
    if (entities.length > 0 && !preventAutoFrame && !showGlobeIntro) {
      controller.frameEntities(entities, [0.05, 0.05, 0.15, 0.05]); // Extra padding at bottom for controls
    }
  }, [filteredLandmarks, preventAutoFrame, landmarks, showGlobeIntro]);

  // Handle camera target changes from store
  useEffect(() => {
    if (cameraTarget && mapController.current) {
      mapController.current.flyTo(cameraTarget);
      setCameraTarget(null);
      useMapStore.getState().setPreventAutoFrame(false);
    }
  }, [cameraTarget, setCameraTarget]);

  const handleCameraChange = useCallback((props: Map3DCameraProps) => {
    setViewProps(oldProps => ({ ...oldProps, ...props }));
  }, []);

  return (
    <div className="relative h-screen w-full">
      {/* Globe Intro Overlay - No blur, just centered button */}
      {showGlobeIntro && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: isEnteringGlobe ? 0 : 1 }}
            transition={{ duration: 0.22 }}
            onClick={handleEnterGlobe}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '16px 32px',
              cursor: 'pointer',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '9999px',
              fontSize: '18px',
              letterSpacing: '0.4px',
              fontWeight: 600,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(20px)',
              transition: 'transform 220ms ease, box-shadow 220ms ease, background-color 220ms ease, color 220ms ease',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.5)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
            }}
          >
            Enter Globe
          </motion.button>
        </div>
      )}

      {/* Category Filter Panel - Hidden in focus mode */}
      {!zoneDetailOpen && (
        <CategoryFilterPanel
          categories={allCategories}
          selectedCategories={selectedCategories}
          onToggleCategory={handleToggleCategory}
          onSelectAll={handleSelectAllCategories}
          onClearAll={handleClearAllCategories}
          visible={allCategories.length > 0}
        />
      )}

      {/* Bottom Control Panel - Hidden in focus mode */}
      {!zoneDetailOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
          }}
        >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            padding: '8px',
            borderRadius: '9999px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
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
              <span>Back</span>
            </motion.button>
          )}

          <motion.button
            onClick={handleResetView}
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
            <span>Reset</span>
          </motion.button>

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
              <MapIcon size={18} strokeWidth={2.5} />
              <span>View 2D</span>
            </motion.button>
          )}
        </div>
      </div>
      )}

      {/* Map container */}
      <div className="h-full w-full">
        <Map3D
          ref={element => setMap(element ?? null)}
          onCameraChange={handleCameraChange}
          {...viewProps}
        />
      </div>

      {/* Zone Detail View - Floating cards over map */}
      {activeLandmark && (
        <ZoneDetailView
          open={zoneDetailOpen}
          landmarkName={activeLandmark.name}
          description={activeLandmark.description}
          images={activeLandmark.images}
          links={activeLandmark.links}
          videos={activeLandmark.videos}
          onBack={() => {
            setZoneDetailOpen(false);
            setActiveLandmarkIdx(null);
            // Reset camera to show all markers
            handleResetView();
          }}
        />
      )}

      {/* AI Chat Dialog - Auto-minimizes when zone details open */}
      {aiNavigatorEnabled && (
        <AIChatDialog
          open={aiChatOpen}
          onClose={() => setAiChatOpen(false)}
          systemPrompt={aiSystemPrompt}
          mapTitle={displayTitle || 'Interactive Map'}
          forceMinimize={zoneDetailOpen}
          onFlyToLocation={(lat, lng) => {
            if (mapController.current) {
              console.log('[GoogleMaps3DViewer] AI Navigator requesting flyTo:', lat, lng);

              // FIRST: Find the CLOSEST landmark instead of just the first within tolerance
              // This prevents matching the wrong landmark when multiple landmarks are nearby
              let closestIndex = -1;
              let closestDistance = Infinity;

              landmarks.forEach((l, idx) => {
                const latDiff = Math.abs(l.lat - lat);
                const lngDiff = Math.abs(l.lon - lng);
                // Calculate total distance (simple Euclidean distance)
                const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

                console.log(`[GoogleMaps3DViewer] Checking ${l.name}: lat diff=${latDiff.toFixed(6)}, lng diff=${lngDiff.toFixed(6)}, distance=${distance.toFixed(6)}`);

                if (distance < closestDistance) {
                  closestDistance = distance;
                  closestIndex = idx;
                }
              });

              // Only accept if the closest landmark is within reasonable tolerance (0.01 degrees = ~1.1km)
              const tolerance = 0.01;
              const landmarkIndex = closestDistance < tolerance ? closestIndex : -1;

              console.log('[GoogleMaps3DViewer] Closest landmark index:', landmarkIndex, 'distance:', closestDistance.toFixed(6));

              if (landmarkIndex !== -1) {
                const landmark = landmarks[landmarkIndex];
                console.log('[GoogleMaps3DViewer] Flying to landmark:', landmark.name, `(${landmark.lat}, ${landmark.lon})`);

                // Use the landmark's exact coordinates for positioning
                const offsetLat = 0.001;
                const offsetLng = 0.0015;

                // Pan the camera to the location
                mapController.current.flyTo({
                  center: {
                    lat: landmark.lat + offsetLat,
                    lng: landmark.lon + offsetLng,
                    altitude: 0
                  },
                  range: 600, // Same zoom as manual clicks
                  heading: 0,
                  tilt: 60,
                  roll: 0,
                });

                // Show landmark details immediately (no delay needed)
                console.log('[GoogleMaps3DViewer] Setting active landmark index:', landmarkIndex);
                console.log('[GoogleMaps3DViewer] Active landmark will be:', landmark);
                setActiveLandmarkIdx(landmarkIndex);
                setZoneDetailOpen(true);
              } else {
                console.warn('[GoogleMaps3DViewer] Could not find landmark at coordinates:', lat, lng);
                console.warn('[GoogleMaps3DViewer] Available landmarks:', landmarks.map(l => ({ name: l.name, lat: l.lat, lon: l.lon })));
                console.warn(`[GoogleMaps3DViewer] Tolerance used: ${tolerance} degrees (~${(tolerance * 111).toFixed(1)}km)`);

                // Still fly to the location even if we can't find the exact landmark
                mapController.current.flyTo({
                  center: {
                    lat: lat,
                    lng: lng,
                    altitude: 0
                  },
                  range: 600,
                  heading: 0,
                  tilt: 60,
                  roll: 0,
                });
              }
            }
          }}
        />
      )}
    </div>
  );
}

export default function GoogleMaps3DViewer(props: GoogleMaps3DViewerProps) {
  if (!API_KEY) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">API Key Required</h2>
          <p className="text-gray-400">
            Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      version="alpha"
      apiKey={API_KEY}
      solutionChannel="gmp_mapconfiguratorpt2_v1.0.0"
    >
      <GoogleMaps3DViewerComponent {...props} />
    </APIProvider>
  );
}
