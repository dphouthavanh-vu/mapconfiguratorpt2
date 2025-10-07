'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GeographicBounds } from '@/lib/types';
import { Upload, MapPin, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import CSVImportDialog from '@/components/csv-import-dialog';
import { GeocodedZone } from '@/lib/csv-importer';

// Dynamically import Cesium map component to avoid SSR issues
const MapSelector = dynamic(() => import('./map-selector-cesium'), { ssr: false });

interface CanvasDefinitionProps {
  onComplete: (bounds: GeographicBounds | null, useMap: boolean, mapImage?: string, importedZones?: GeocodedZone[]) => void;
}

export default function CanvasDefinition({ onComplete }: CanvasDefinitionProps) {
  const [selectedMethod, setSelectedMethod] = useState<'search' | 'manual' | 'import'>('search');
  const [geoBounds, setGeoBounds] = useState<GeographicBounds | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string | undefined>(undefined);
  const [manualBounds, setManualBounds] = useState({
    minLat: '',
    maxLat: '',
    minLng: '',
    maxLng: '',
  });
  const [showCsvImportDialog, setShowCsvImportDialog] = useState(false);
  const [importedZones, setImportedZones] = useState<GeocodedZone[]>([]);
  const [csvImportCompleted, setCsvImportCompleted] = useState(false);

  const handleContinue = () => {
    if (!geoBounds) {
      alert('Please select an area first');
      return;
    }
    onComplete(geoBounds, true, mapImageUrl, importedZones.length > 0 ? importedZones : undefined);
  };

  const handleCsvImport = (zones: GeocodedZone[]) => {
    setImportedZones(zones);
    setCsvImportCompleted(true);

    // Auto-calculate bounds from imported zones with geographic coordinates
    const zonesWithGeoCoords = zones.filter(z => z.geoCoords?.lat && z.geoCoords?.lng);

    if (zonesWithGeoCoords.length > 0) {
      // Find min/max lat/lng from zones
      const lats = zonesWithGeoCoords.map(z => z.geoCoords!.lat);
      const lngs = zonesWithGeoCoords.map(z => z.geoCoords!.lng);

      // Calculate bounds with padding
      const calculatedBounds: GeographicBounds = {
        minLat: Math.min(...lats) - 0.01, // Add small padding
        maxLat: Math.max(...lats) + 0.01,
        minLng: Math.min(...lngs) - 0.01,
        maxLng: Math.max(...lngs) + 0.01,
      };
      setGeoBounds(calculatedBounds);
      console.log('[Canvas] Auto-calculated bounds from CSV:', calculatedBounds);
    }

    setShowCsvImportDialog(false);
  };

  const handleCsvImportComplete = () => {
    if (!geoBounds) {
      alert('Unable to determine map bounds from imported data. Please select an area manually.');
      return;
    }
    onComplete(geoBounds, true, undefined, importedZones);
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
        <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as 'search' | 'manual' | 'import')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">Search Location</TabsTrigger>
            <TabsTrigger value="manual">Enter Coordinates</TabsTrigger>
            <TabsTrigger value="import">Import CSV</TabsTrigger>
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

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Import Zones from CSV</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV file with location data to bulk import zones
                </p>
                <Button onClick={() => setShowCsvImportDialog(true)} size="lg">
                  <Upload className="mr-2 h-4 w-4" />
                  Choose CSV File
                </Button>
              </div>

              {csvImportCompleted && importedZones.length > 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Import Successful</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Imported {importedZones.length} zones from CSV.
                    {geoBounds && " Geographic bounds have been automatically calculated."}
                  </AlertDescription>
                </Alert>
              )}

              {csvImportCompleted && geoBounds && (
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Area Calculated from Import:</p>
                    <p className="text-xs text-gray-700">
                      Lat: {geoBounds.minLat.toFixed(4)} to {geoBounds.maxLat.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-700">
                      Lng: {geoBounds.minLng.toFixed(4)} to {geoBounds.maxLng.toFixed(4)}
                    </p>
                  </div>
                  <Button onClick={handleCsvImportComplete} className="w-full" size="lg">
                    Continue with Imported Data
                  </Button>
                </div>
              )}

              {csvImportCompleted && !geoBounds && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Geographic Coordinates</AlertTitle>
                  <AlertDescription>
                    The imported data doesn't contain valid coordinates. Please add coordinates to your CSV or select an area manually.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* CSV Import Dialog */}
        <CSVImportDialog
          open={showCsvImportDialog}
          onClose={() => setShowCsvImportDialog(false)}
          onImport={handleCsvImport}
          canvasWidth={800}
          canvasHeight={600}
          geoBounds={geoBounds}
        />
      </CardContent>
    </Card>
  );
}
