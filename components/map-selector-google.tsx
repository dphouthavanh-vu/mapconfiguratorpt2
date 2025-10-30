'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeographicBounds } from '@/lib/types';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

interface MapSelectorProps {
  onBoundsSelect: (bounds: GeographicBounds, mapImageUrl?: string) => void;
}

type SelectionMode = 'point' | 'rectangle';

function MapSelectorComponent({ onBoundsSelect }: MapSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // Default to NYC
  const [zoom, setZoom] = useState(12);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('rectangle');

  // Rectangle selection state
  const [firstCorner, setFirstCorner] = useState<{lat: number; lng: number} | null>(null);
  const [secondCorner, setSecondCorner] = useState<{lat: number; lng: number} | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentMousePos, setCurrentMousePos] = useState<{lat: number; lng: number} | null>(null);

  // Point selection state
  const [markerPosition, setMarkerPosition] = useState<{lat: number; lng: number} | null>(null);

  // Manual coordinate inputs
  const [manualBounds, setManualBounds] = useState({
    minLat: '',
    maxLat: '',
    minLng: '',
    maxLng: '',
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const rectangleRef = useRef<google.maps.Rectangle | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    // Use Google Geocoding API
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        const newCenter = { lat: location.lat(), lng: location.lng() };
        setMapCenter(newCenter);
        setZoom(14);
      }
    });
  }, [searchQuery]);

  const handleMapClick = useCallback((event: any) => {
    if (!event.detail?.latLng) return;

    const latLng = event.detail.latLng;
    // Check if latLng has methods (Google Maps LatLng object) or is a plain object
    const position = typeof latLng.lat === 'function'
      ? { lat: latLng.lat(), lng: latLng.lng() }
      : { lat: latLng.lat, lng: latLng.lng };

    if (selectionMode === 'point') {
      setMarkerPosition(position);
      setMapCenter(position);
    } else if (selectionMode === 'rectangle') {
      if (!firstCorner || (firstCorner && secondCorner)) {
        // Start new rectangle
        setFirstCorner(position);
        setSecondCorner(null);
        setIsDrawing(true);
      } else {
        // Complete rectangle
        setSecondCorner(position);
        setIsDrawing(false);
      }
    }
  }, [selectionMode, firstCorner, secondCorner]);

  const handleMapMouseMove = useCallback((event: any) => {
    if (isDrawing && firstCorner && event.detail?.latLng) {
      const latLng = event.detail.latLng;
      // Check if latLng has methods (Google Maps LatLng object) or is a plain object
      const position = typeof latLng.lat === 'function'
        ? { lat: latLng.lat(), lng: latLng.lng() }
        : { lat: latLng.lat, lng: latLng.lng };
      setCurrentMousePos(position);
    }
  }, [isDrawing, firstCorner]);

  // Update rectangle overlay
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear previous rectangle
    if (rectangleRef.current) {
      rectangleRef.current.setMap(null);
      rectangleRef.current = null;
    }

    const corner1 = firstCorner;
    const corner2 = secondCorner || currentMousePos;

    if (corner1 && corner2) {
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(
          Math.min(corner1.lat, corner2.lat),
          Math.min(corner1.lng, corner2.lng)
        ),
        new google.maps.LatLng(
          Math.max(corner1.lat, corner2.lat),
          Math.max(corner1.lng, corner2.lng)
        )
      );

      rectangleRef.current = new google.maps.Rectangle({
        bounds: bounds,
        map: mapRef.current,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#3B82F6',
        fillOpacity: 0.2,
      });
    }
  }, [firstCorner, secondCorner, currentMousePos]);

  const handleConfirmBounds = useCallback(() => {
    let bounds: GeographicBounds;

    if (selectionMode === 'point' && markerPosition) {
      // Create bounds around point (approximately 1km radius)
      const latOffset = 0.005;
      const lngOffset = 0.005;
      bounds = {
        minLat: markerPosition.lat - latOffset,
        maxLat: markerPosition.lat + latOffset,
        minLng: markerPosition.lng - lngOffset,
        maxLng: markerPosition.lng + lngOffset,
      };
    } else if (selectionMode === 'rectangle' && firstCorner && secondCorner) {
      bounds = {
        minLat: Math.min(firstCorner.lat, secondCorner.lat),
        maxLat: Math.max(firstCorner.lat, secondCorner.lat),
        minLng: Math.min(firstCorner.lng, secondCorner.lng),
        maxLng: Math.max(firstCorner.lng, secondCorner.lng),
      };
    } else {
      return;
    }

    onBoundsSelect(bounds);
  }, [selectionMode, markerPosition, firstCorner, secondCorner, onBoundsSelect]);

  const handleManualBoundsConfirm = useCallback(() => {
    const { minLat, maxLat, minLng, maxLng } = manualBounds;

    if (!minLat || !maxLat || !minLng || !maxLng) {
      alert('Please fill in all coordinate fields');
      return;
    }

    const bounds: GeographicBounds = {
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLng: parseFloat(minLng),
      maxLng: parseFloat(maxLng),
    };

    // Validate bounds
    if (bounds.minLat >= bounds.maxLat) {
      alert('Min Latitude must be less than Max Latitude');
      return;
    }
    if (bounds.minLng >= bounds.maxLng) {
      alert('Min Longitude must be less than Max Longitude');
      return;
    }

    onBoundsSelect(bounds);
  }, [manualBounds, onBoundsSelect]);

  const handleReset = useCallback(() => {
    setFirstCorner(null);
    setSecondCorner(null);
    setCurrentMousePos(null);
    setIsDrawing(false);
    setMarkerPosition(null);
    if (rectangleRef.current) {
      rectangleRef.current.setMap(null);
      rectangleRef.current = null;
    }
  }, []);

  return (
    <Tabs defaultValue="visual" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="visual">Visual Selection</TabsTrigger>
        <TabsTrigger value="manual">Manual Coordinates</TabsTrigger>
      </TabsList>

      <TabsContent value="visual" className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 items-center">
          <Label>Selection Mode:</Label>
          <div className="flex gap-2">
            <Button
              variant={selectionMode === 'rectangle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectionMode('rectangle');
                handleReset();
              }}
            >
              Rectangle
            </Button>
            <Button
              variant={selectionMode === 'point' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectionMode('point');
                handleReset();
              }}
            >
              Point
            </Button>
          </div>
          {(firstCorner || markerPosition) && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Reset
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-muted p-3 rounded-lg text-sm">
          {selectionMode === 'rectangle' ? (
            <p>
              {!firstCorner && 'Click on the map to set the first corner of your rectangle'}
              {firstCorner && !secondCorner && 'Click again to set the second corner'}
              {firstCorner && secondCorner && `Rectangle selected: ${Math.abs((secondCorner.lat - firstCorner.lat) * 111).toFixed(2)} km × ${Math.abs((secondCorner.lng - firstCorner.lng) * 111 * Math.cos(firstCorner.lat * Math.PI / 180)).toFixed(2)} km`}
            </p>
          ) : (
            <p>
              {!markerPosition && 'Click on the map to select a center point (1km×1km area will be created)'}
              {markerPosition && `Point selected at: ${markerPosition.lat.toFixed(6)}, ${markerPosition.lng.toFixed(6)}`}
            </p>
          )}
        </div>

        {/* Map */}
        <div className="h-[500px] w-full rounded-lg overflow-hidden border relative">
          <Map
            center={mapCenter}
            zoom={zoom}
            mapId="map-selector"
            onClick={handleMapClick}
            onMousemove={handleMapMouseMove}
            gestureHandling="greedy"
            style={{ width: '100%', height: '100%' }}
            onLoad={(map) => {
              mapRef.current = map.map;
            }}
          >
            {selectionMode === 'point' && markerPosition && (
              <Marker position={markerPosition} />
            )}
            {selectionMode === 'rectangle' && firstCorner && (
              <Marker position={firstCorner} />
            )}
            {selectionMode === 'rectangle' && secondCorner && (
              <Marker position={secondCorner} />
            )}
          </Map>
        </div>

        {/* Confirm button */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {selectionMode === 'rectangle' && firstCorner && secondCorner && (
              <div className="space-y-1">
                <p>Bounds: {Math.min(firstCorner.lat, secondCorner.lat).toFixed(6)} to {Math.max(firstCorner.lat, secondCorner.lat).toFixed(6)} (Lat)</p>
                <p>Bounds: {Math.min(firstCorner.lng, secondCorner.lng).toFixed(6)} to {Math.max(firstCorner.lng, secondCorner.lng).toFixed(6)} (Lng)</p>
              </div>
            )}
          </div>
          <Button
            onClick={handleConfirmBounds}
            disabled={
              (selectionMode === 'rectangle' && (!firstCorner || !secondCorner)) ||
              (selectionMode === 'point' && !markerPosition)
            }
          >
            Confirm Selection
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="manual" className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm mb-4">Enter the geographic bounds manually. You can find coordinates from Google Maps or other mapping tools.</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minLat">Min Latitude</Label>
              <Input
                id="minLat"
                type="number"
                step="0.000001"
                placeholder="e.g., 28.5870"
                value={manualBounds.minLat}
                onChange={(e) => setManualBounds({ ...manualBounds, minLat: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxLat">Max Latitude</Label>
              <Input
                id="maxLat"
                type="number"
                step="0.000001"
                placeholder="e.g., 28.6119"
                value={manualBounds.maxLat}
                onChange={(e) => setManualBounds({ ...manualBounds, maxLat: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minLng">Min Longitude</Label>
              <Input
                id="minLng"
                type="number"
                step="0.000001"
                placeholder="e.g., -81.2088"
                value={manualBounds.minLng}
                onChange={(e) => setManualBounds({ ...manualBounds, minLng: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxLng">Max Longitude</Label>
              <Input
                id="maxLng"
                type="number"
                step="0.000001"
                placeholder="e.g., -81.1866"
                value={manualBounds.maxLng}
                onChange={(e) => setManualBounds({ ...manualBounds, maxLng: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            <p><strong>Tip:</strong> To find coordinates on Google Maps:</p>
            <ol className="list-decimal ml-5 mt-1 space-y-1">
              <li>Right-click on the map and select "What's here?"</li>
              <li>The coordinates will appear at the bottom</li>
              <li>First number is Latitude, second is Longitude</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleManualBoundsConfirm}>
            Confirm Bounds
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default function MapSelector(props: MapSelectorProps) {
  if (!API_KEY) {
    return (
      <div className="p-4 border rounded-lg bg-muted">
        <p className="text-sm text-muted-foreground">
          Google Maps API key not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <MapSelectorComponent {...props} />
    </APIProvider>
  );
}
