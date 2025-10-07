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
  onImport: (zones: GeocodedZone[]) => void;
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
      // Convert imported zones to canvas format
      let canvasZones = prepareZonesForCanvas(
        previewZones,
        geoBounds,
        canvasWidth,
        canvasHeight
      );

      // Check if any zones need geocoding
      const needsGeocoding = canvasZones.some(z => z.needsGeocoding);

      if (needsGeocoding && geoBounds) {
        setIsGeocoding(true);
        // Perform batch geocoding for addresses
        canvasZones = await batchGeocodeZones(
          canvasZones,
          geoBounds,
          canvasWidth,
          canvasHeight,
          (current, total, address) => {
            setGeocodingProgress({ current, total, address: address || '' });
          }
        );
      }

      // Import the zones
      onImport(canvasZones);
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

        {needsGeocoding && !geoBounds && hasAddresses && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Map Area Not Defined</AlertTitle>
            <AlertDescription>
              You need to define the map area in Step 1 before importing zones with addresses.
              Either go back and select a geographic area, or use a CSV with latitude/longitude coordinates.
            </AlertDescription>
          </Alert>
        )}

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
                isGeocoding ||
                (previewZones.some(z => z.address && !z.latitude && !z.longitude) && !geoBounds)
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