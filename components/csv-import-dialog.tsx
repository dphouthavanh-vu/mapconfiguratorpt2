'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, MapPin, AlertCircle, Check, Loader2, FileText } from 'lucide-react';
import {
  parseCSV,
  analyzeCsvColumns,
  csvToZones,
  prepareZonesForCanvas,
  batchGeocodeZones,
  CSVRow,
  CSVImportOptions,
  GeocodedZone,
  ImportedZone
} from '@/lib/csv-importer';
import { GeographicBounds } from '@/lib/types';

interface CSVImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (zones: GeocodedZone[], calculatedBounds?: GeographicBounds) => void;
  canvasWidth: number;
  canvasHeight: number;
  geoBounds?: GeographicBounds | null;
}

export default function CSVImportDialog({
  open,
  onClose,
  onImport,
  canvasWidth,
  canvasHeight,
  geoBounds
}: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<CSVImportOptions>({});
  const [previewZones, setPreviewZones] = useState<ImportedZone[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0, address: '' });
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setFile(null);
      setCsvData([]);
      setColumns([]);
      setMappings({});
      setPreviewZones([]);
      setStep('upload');
      setError(null);
      setIsProcessing(false);
      setIsGeocoding(false);
      setGeocodingProgress({ current: 0, total: 0, address: '' });
    }
  }, [open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    setError(null);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        setError('No data found in CSV file');
        setIsProcessing(false);
        return;
      }

      setCsvData(data);
      setColumns(Object.keys(data[0]));

      // Analyze columns and suggest mappings
      const suggestions = analyzeCsvColumns(data);
      setMappings(suggestions);

      setStep('mapping');
    } catch (err) {
      setError('Failed to parse CSV file. Please ensure it is a valid CSV format.');
      console.error('CSV parse error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (field: keyof CSVImportOptions, value: string) => {
    setMappings(prev => ({
      ...prev,
      [field]: value === 'none' ? undefined : value
    }));
  };

  const handlePreview = () => {
    const zones = csvToZones(csvData, mappings);
    setPreviewZones(zones);
    setStep('preview');
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Check if any zones need geocoding
      const needsGeocoding = previewZones.some(z => !z.latitude && z.address);

      // If we need to geocode but don't have bounds, we need to:
      // 1. Geocode all addresses first
      // 2. Auto-calculate bounds from geocoded results
      // 3. Then convert to canvas coordinates
      let calculatedBounds = geoBounds;

      let canvasZones: GeocodedZone[];

      if (needsGeocoding && !geoBounds) {
        console.log('[CSV Import] No bounds provided, will geocode and auto-calculate bounds');
        setIsGeocoding(true);

        // Create temporary bounds just for geocoding (will be recalculated)
        const tempBounds = {
          minLat: -90,
          maxLat: 90,
          minLng: -180,
          maxLng: 180,
        };

        // Prepare zones with temp bounds (they'll be in wrong canvas coords, but we only need geoCoords)
        let tempZones = prepareZonesForCanvas(
          previewZones,
          tempBounds,
          canvasWidth,
          canvasHeight
        );

        // Geocode all addresses
        tempZones = await batchGeocodeZones(
          tempZones,
          tempBounds,
          canvasWidth,
          canvasHeight,
          (current, total, address) => {
            setGeocodingProgress({ current, total, address: address || '' });
          }
        );

        // Auto-calculate bounds from geocoded results
        const allGeoCoords = tempZones
          .filter(z => z.geoCoords)
          .map(z => z.geoCoords!);

        if (allGeoCoords.length > 0) {
          calculatedBounds = {
            minLat: Math.min(...allGeoCoords.map(c => c.lat)) - 0.01,
            maxLat: Math.max(...allGeoCoords.map(c => c.lat)) + 0.01,
            minLng: Math.min(...allGeoCoords.map(c => c.lng)) - 0.01,
            maxLng: Math.max(...allGeoCoords.map(c => c.lng)) + 0.01,
          };
          console.log('[CSV Import] Auto-calculated bounds from geocoded addresses:', calculatedBounds);
        } else {
          throw new Error('Failed to geocode any addresses');
        }

        // Use the already-geocoded zones (don't prepare them again)
        canvasZones = tempZones;
      } else {
        // Convert imported zones to canvas format (with proper bounds)
        canvasZones = prepareZonesForCanvas(
          previewZones,
          calculatedBounds || null,
          canvasWidth,
          canvasHeight
        );

        // If we still need geocoding (and we have bounds), do it now
        const stillNeedsGeocoding = canvasZones.some(z => z.needsGeocoding);

        if (stillNeedsGeocoding && calculatedBounds) {
          setIsGeocoding(true);
          // Perform batch geocoding for addresses
          canvasZones = await batchGeocodeZones(
            canvasZones,
            calculatedBounds,
            canvasWidth,
            canvasHeight,
            (current, total, address) => {
              setGeocodingProgress({ current, total, address: address || '' });
            }
          );
        }
      }

      // Check if any zones fall outside the canvas bounds
      console.log('[CSV Import] Checking if zones are outside bounds...');
      console.log('[CSV Import] Canvas size:', { width: canvasWidth, height: canvasHeight });

      const zonesOutsideBounds = canvasZones.filter(z => {
        const coords = z.coordinates as { x: number; y: number };
        const isOutside = coords.x < 0 || coords.x > canvasWidth || coords.y < 0 || coords.y > canvasHeight;
        if (isOutside) {
          console.log('[CSV Import] Zone outside bounds:', z.content.title, coords);
        }
        return isOutside;
      });

      console.log('[CSV Import] Zones outside bounds:', zonesOutsideBounds.length, 'of', canvasZones.length);

      if (zonesOutsideBounds.length > 0) {
        const outsideCount = zonesOutsideBounds.length;
        const totalCount = canvasZones.length;

        console.error(`[CSV Import] BLOCKING IMPORT: ${outsideCount} of ${totalCount} zones fall outside canvas bounds`);
        console.warn('[CSV Import] Current bounds:', geoBounds);
        console.warn('[CSV Import] Canvas size:', { width: canvasWidth, height: canvasHeight });

        // Calculate suggested bounds that would fit all geocoded locations
        const allGeoCoords = canvasZones
          .filter(z => z.geoCoords)
          .map(z => z.geoCoords!);

        if (allGeoCoords.length > 0) {
          const suggestedBounds = {
            minLat: Math.min(...allGeoCoords.map(c => c.lat)) - 0.01,
            maxLat: Math.max(...allGeoCoords.map(c => c.lat)) + 0.01,
            minLng: Math.min(...allGeoCoords.map(c => c.lng)) - 0.01,
            maxLng: Math.max(...allGeoCoords.map(c => c.lng)) + 0.01,
          };
          console.warn('[CSV Import] Suggested bounds to fit all locations:', suggestedBounds);

          // Show error and stop import
          const latRange = (suggestedBounds.maxLat - suggestedBounds.minLat).toFixed(2);
          const lngRange = (suggestedBounds.maxLng - suggestedBounds.minLng).toFixed(2);

          const errorMessage = `❌ Import Blocked: ${outsideCount} of ${totalCount} locations fall outside your map!\n\n` +
            `Your map area is too small:\n` +
            `  Current: ${geoBounds?.minLat.toFixed(4)}° to ${geoBounds?.maxLat.toFixed(4)}° lat (${((geoBounds?.maxLat || 0) - (geoBounds?.minLat || 0)).toFixed(2)}° span)\n` +
            `  Needed: ${suggestedBounds.minLat.toFixed(4)}° to ${suggestedBounds.maxLat.toFixed(4)}° lat (${latRange}° span)\n\n` +
            `💡 TIP: Cancel this wizard and start over:\n` +
            `   1. Go back to Create New Map\n` +
            `   2. In Step 2 (Canvas), use the "Import CSV" tab\n` +
            `   3. Import your CSV there - it will auto-calculate the right bounds!\n\n` +
            `Or manually select a larger area in Step 2 that covers all of Orlando (not just UCF campus).`;

          console.error('[CSV Import] Error message:', errorMessage);
          alert(errorMessage); // Also show as alert to be extra sure
          setError(errorMessage);
          setIsProcessing(false);
          setIsGeocoding(false);
          setStep('preview'); // Go back to preview step so user can see the error

          console.log('[CSV Import] RETURNING EARLY - Import should be blocked');
          return;
        } else {
          console.warn('[CSV Import] No geo coords found, allowing import to proceed');
        }
      } else {
        console.log('[CSV Import] All zones within bounds, proceeding with import');
      }

      // Import the zones (and pass calculated bounds if we had to calculate them)
      onImport(canvasZones, calculatedBounds || undefined);
      onClose();
    } catch (err) {
      setError('Failed to import zones. Please try again.');
      console.error('Import error:', err);
    } finally {
      setIsProcessing(false);
      setIsGeocoding(false);
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <div className="space-y-2">
          <Label htmlFor="csv-upload" className="cursor-pointer">
            <span className="text-primary hover:underline">Choose CSV file</span>
            {' or drag and drop'}
          </Label>
          <Input
            id="csv-upload"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <p className="text-sm text-gray-500">
            CSV files should contain columns for name, address, and description
          </p>
        </div>
      </div>

      {file && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <FileText className="h-4 w-4" />
          <span>{file.name}</span>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        Found {csvData.length} rows and {columns.length} columns in your CSV
      </div>

      <div className="space-y-4">
        <div>
          <Label>Zone Name Column *</Label>
          <Select value={mappings.nameColumn || ''} onValueChange={(value) => handleMappingChange('nameColumn', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select name column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Address Column</Label>
          <Select value={mappings.addressColumn || 'none'} onValueChange={(value) => handleMappingChange('addressColumn', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select address column (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {columns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Description Column</Label>
          <Select value={mappings.descriptionColumn || 'none'} onValueChange={(value) => handleMappingChange('descriptionColumn', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select description column (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {columns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Category Column</Label>
          <Select value={mappings.categoryColumn || 'none'} onValueChange={(value) => handleMappingChange('categoryColumn', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category column (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {columns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Latitude Column</Label>
            <Select value={mappings.latitudeColumn || 'none'} onValueChange={(value) => handleMappingChange('latitudeColumn', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select latitude (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Longitude Column</Label>
            <Select value={mappings.longitudeColumn || 'none'} onValueChange={(value) => handleMappingChange('longitudeColumn', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select longitude (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!mappings.addressColumn && !mappings.latitudeColumn && !mappings.longitudeColumn && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No location data</AlertTitle>
          <AlertDescription>
            Without address or coordinate columns, zones will be placed in a grid pattern
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderPreviewStep = () => {
    const hasCoordinates = previewZones.some(z => z.latitude && z.longitude);
    const hasAddresses = previewZones.some(z => z.address);
    const needsGeocoding = hasAddresses && !hasCoordinates;

    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Ready to import {previewZones.length} zones
        </div>

        <div className="max-h-64 overflow-y-auto border rounded-lg p-4 space-y-2">
          {previewZones.slice(0, 5).map((zone, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{zone.name}</h4>
                  {zone.address && (
                    <p className="text-xs text-gray-600 mt-1">
                      <MapPin className="inline h-3 w-3 mr-1" />
                      {zone.address}
                    </p>
                  )}
                  {zone.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {zone.description}
                    </p>
                  )}
                  {zone.category && (
                    <p className="text-xs text-blue-500 mt-1">
                      Category: {zone.category}
                    </p>
                  )}
                </div>
                {(zone.latitude && zone.longitude) && (
                  <Check className="h-4 w-4 text-green-500 ml-2" />
                )}
              </div>
            </Card>
          ))}
          {previewZones.length > 5 && (
            <p className="text-sm text-gray-500 text-center py-2">
              ... and {previewZones.length - 5} more zones
            </p>
          )}
        </div>

        {/* Note: We removed the "Map Area Not Defined" error because the import handler
            now auto-calculates bounds from geocoded addresses when geoBounds is null */}

        {needsGeocoding && geoBounds && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Geocoding Required</AlertTitle>
            <AlertDescription>
              Addresses will be converted to map coordinates. This may take a few moments.
              {isGeocoding && geocodingProgress.total > 0 && (
                <div className="mt-3 space-y-2">
                  <Progress value={(geocodingProgress.current / geocodingProgress.total) * 100} className="h-2" />
                  <div className="text-xs space-y-1">
                    <div>Progress: {geocodingProgress.current} of {geocodingProgress.total} addresses</div>
                    {geocodingProgress.address && (
                      <div className="text-gray-600">
                        <span className="font-semibold">Processing: </span>
                        <span className="italic">{geocodingProgress.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!hasAddresses && !hasCoordinates && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Location Data</AlertTitle>
            <AlertDescription>
              Zones will be placed in a grid pattern. You can manually reposition them after import.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Zones from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing zone data to bulk import locations
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className={`flex items-center ${step === 'upload' ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'upload' ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="ml-2 text-sm">Upload</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${step !== 'upload' ? 'bg-primary' : 'bg-gray-300'}`} />
            <div className={`flex items-center ${step === 'mapping' ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'mapping' ? 'border-primary bg-primary text-white' : step === 'preview' ? 'border-gray-300 bg-gray-300 text-white' : 'border-gray-300'}`}>
                2
              </div>
              <span className="ml-2 text-sm">Map Columns</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${step === 'preview' ? 'bg-primary' : 'bg-gray-300'}`} />
            <div className={`flex items-center ${step === 'preview' ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'preview' ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
                3
              </div>
              <span className="ml-2 text-sm">Preview</span>
            </div>
          </div>

          {/* Step content */}
          {step === 'upload' && renderUploadStep()}
          {step === 'mapping' && renderMappingStep()}
          {step === 'preview' && renderPreviewStep()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing || isGeocoding}>
            Cancel
          </Button>
          {step === 'upload' && (
            <Button
              onClick={() => document.getElementById('csv-upload')?.click()}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Select File'
              )}
            </Button>
          )}
          {step === 'mapping' && (
            <Button
              onClick={handlePreview}
              disabled={!mappings.nameColumn}
            >
              Preview Import
            </Button>
          )}
          {step === 'preview' && (
            <Button
              onClick={handleImport}
              disabled={
                isProcessing ||
                isGeocoding
                // Note: Removed the geoBounds check - we now support auto-calculating bounds from geocoded addresses
              }
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {geocodingProgress.total > 0
                    ? `Geocoding ${geocodingProgress.current}/${geocodingProgress.total}...`
                    : 'Geocoding Addresses...'
                  }
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${previewZones.length} Zones`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}