'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GeographicBounds } from '@/lib/types';
import dynamic from 'next/dynamic';

// Dynamically import Cesium map component to avoid SSR issues
const MapSelector = dynamic(() => import('./map-selector-cesium'), { ssr: false });

interface CanvasDefinitionProps {
  onComplete: (bounds: GeographicBounds | null, useMap: boolean, mapImage?: string) => void;
}

export default function CanvasDefinition({ onComplete }: CanvasDefinitionProps) {
  const [selectedMethod, setSelectedMethod] = useState<'search' | 'manual'>('search');
  const [geoBounds, setGeoBounds] = useState<GeographicBounds | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string | undefined>(undefined);
  const [manualBounds, setManualBounds] = useState({
    minLat: '',
    maxLat: '',
    minLng: '',
    maxLng: '',
  });

  const handleContinue = () => {
    if (!geoBounds) {
      alert('Please select an area first');
      return;
    }
    onComplete(geoBounds, true, mapImageUrl);
  };

  const handleManualSubmit = () => {
    const bounds: GeographicBounds = {
      minLat: parseFloat(manualBounds.minLat),
      maxLat: parseFloat(manualBounds.maxLat),
      minLng: parseFloat(manualBounds.minLng),
      maxLng: parseFloat(manualBounds.maxLng),
    };

    if (isNaN(bounds.minLat) || isNaN(bounds.maxLat) || isNaN(bounds.minLng) || isNaN(bounds.maxLng)) {
      alert('Please enter valid coordinates');
      return;
    }

    setGeoBounds(bounds);
    onComplete(bounds, true, undefined); // No map image for manual entry
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Define Canvas Area</CardTitle>
        <CardDescription>
          Choose your working area by searching a location or entering coordinates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as 'search' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Location</TabsTrigger>
            <TabsTrigger value="manual">Enter Coordinates</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="space-y-2">
              <Label>Search for a location and draw a selection area</Label>
              <div style={{ height: '500px', width: '100%' }}>
                <MapSelector
                  onBoundsSelected={(bounds, mapImage) => {
                    console.log('[Canvas] Bounds selected:', bounds);
                    console.log('[Canvas] Map image captured:', mapImage ? 'Yes' : 'No');
                    if (mapImage) {
                      console.log('[Canvas] Map image length:', mapImage.length);
                      console.log('[Canvas] Map image preview:', mapImage.substring(0, 100));
                    }
                    setGeoBounds(bounds);
                    setMapImageUrl(mapImage);
                  }}
                />
              </div>
            </div>
            {geoBounds && (
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold mb-1">Area Selected:</p>
                  <p className="text-xs text-gray-700">
                    Lat: {geoBounds.minLat.toFixed(4)} to {geoBounds.maxLat.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-700">
                    Lng: {geoBounds.minLng.toFixed(4)} to {geoBounds.maxLng.toFixed(4)}
                  </p>
                </div>
                <Button onClick={handleContinue} className="w-full" size="lg">
                  Continue with Selected Area
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minLat">Min Latitude</Label>
                <Input
                  id="minLat"
                  type="number"
                  step="any"
                  placeholder="e.g., 40.7128"
                  value={manualBounds.minLat}
                  onChange={(e) => setManualBounds({ ...manualBounds, minLat: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxLat">Max Latitude</Label>
                <Input
                  id="maxLat"
                  type="number"
                  step="any"
                  placeholder="e.g., 40.7580"
                  value={manualBounds.maxLat}
                  onChange={(e) => setManualBounds({ ...manualBounds, maxLat: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minLng">Min Longitude</Label>
                <Input
                  id="minLng"
                  type="number"
                  step="any"
                  placeholder="e.g., -74.0060"
                  value={manualBounds.minLng}
                  onChange={(e) => setManualBounds({ ...manualBounds, minLng: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxLng">Max Longitude</Label>
                <Input
                  id="maxLng"
                  type="number"
                  step="any"
                  placeholder="e.g., -73.9352"
                  value={manualBounds.maxLng}
                  onChange={(e) => setManualBounds({ ...manualBounds, maxLng: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleManualSubmit} className="w-full">
              Continue with These Coordinates
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
