'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CanvasDefinition from '@/components/canvas-definition';
import BlueprintUpload from '@/components/blueprint-upload';
import ZoneEditor from '@/components/zone-editor';
import MapZoneEditor from '@/components/map-zone-editor';
import { GeographicBounds, CanvasConfig } from '@/lib/types';
import { GeocodedZone } from '@/lib/csv-importer';
import { geoToPixel } from '@/lib/coordinate-converter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowLeft, X } from 'lucide-react';
import { getDefaultPromptHint } from '@/lib/ai-navigator-prompt';

type Step = 'info' | 'zones'; // Simplified: skip canvas and blueprint steps

export default function CreateMapPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('info');

  // Skip canvas/blueprint steps - go straight to map zone editor
  const useSimplifiedFlow = true;

  // Map data
  const [mapTitle, setMapTitle] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [geoBounds, setGeoBounds] = useState<GeographicBounds | null>(null);
  const [useBaseMap, setUseBaseMap] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(null);
  const [importedZones, setImportedZones] = useState<GeocodedZone[]>([]);
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>({
    width: 800,
    height: 600,
    coordinateSystem: 'pixel',
  });

  // AI Navigator settings
  const [aiNavigatorEnabled, setAiNavigatorEnabled] = useState(true);
  const [aiNavigatorPrompt, setAiNavigatorPrompt] = useState('');

  const handleInfoSubmit = () => {
    if (!mapTitle) {
      alert('Please enter a map title');
      return;
    }
    // Skip directly to zones step (map editor)
    setCurrentStep('zones');
  };

  const handleCanvasComplete = (bounds: GeographicBounds | null, useMap: boolean, mapImage?: string, zones?: GeocodedZone[]) => {
    setGeoBounds(bounds);
    setUseBaseMap(useMap);
    setMapImageUrl(mapImage || null);
    if (zones && zones.length > 0) {
      setImportedZones(zones);
      console.log('[Create] Received imported zones from Canvas:', zones.length);
    }
    setCurrentStep('blueprint');
  };

  const handleBlueprintUpload = (imageUrl: string, dimensions: { width: number; height: number }) => {
    setBlueprintUrl(imageUrl);
    setCanvasConfig({
      ...canvasConfig,
      width: Math.min(dimensions.width, 1200),
      height: Math.min(dimensions.height, 800),
    });
    setCurrentStep('zones');
  };

  const handleBlueprintSkip = () => {
    // Set reasonable canvas dimensions when using base map without blueprint
    // If we have a map image, try to use its dimensions
    if (mapImageUrl) {
      const img = new Image();
      img.onload = () => {
        setCanvasConfig({
          ...canvasConfig,
          width: Math.min(img.width, 1200),
          height: Math.min(img.height, 800),
        });
        setCurrentStep('zones');
      };
      img.onerror = () => {
        // Fallback to default dimensions
        setCanvasConfig({
          ...canvasConfig,
          width: 1000,
          height: 600,
        });
        setCurrentStep('zones');
      };
      img.src = mapImageUrl;
    } else {
      // No map image, use default dimensions
      setCanvasConfig({
        ...canvasConfig,
        width: 1000,
        height: 600,
      });
      setCurrentStep('zones');
    }
  };

  const handleSaveMap = async (zones: any[], categories: string[]) => {
    try {
      // Use blueprint if uploaded, otherwise use captured map image
      const imageToSave = blueprintUrl || mapImageUrl;

      console.log('[Create] Saving map with imageUrl:', imageToSave?.substring(0, 100));
      console.log('[Create] Saving with categories:', categories);

      const response = await fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mapTitle,
          description: mapDescription,
          geographicBounds: geoBounds,
          canvasConfig,
          imageUrl: imageToSave,
          useBaseMap,
          categories,
          zones,
          aiNavigatorEnabled,
          aiNavigatorPrompt: aiNavigatorPrompt || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create map');
      }

      const data = await response.json();
      // Fixed: redirect to /map/{id} not /maps/{id}
      router.push(`/map/${data.id}`);
    } catch (error) {
      console.error('Error saving map:', error);
      alert('Failed to save map. Please try again.');
    }
  };

  const stepIndicator = (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-4">
        {(['info', 'zones'] as Step[]).map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep === step
                  ? 'bg-blue-600 text-white'
                  : index < ['info', 'zones'].indexOf(currentStep)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
            >
              {index + 1}
            </div>
            {index < 1 && <div className="w-16 h-1 bg-gray-300 mx-2" />}
          </div>
        ))}
      </div>
      <div className="flex justify-center space-x-20 mt-2">
        <span className="text-sm text-gray-600 dark:text-gray-300">Info</span>
        <span className="text-sm text-gray-600 dark:text-gray-300">Add Zones</span>
      </div>
    </div>
  );

  const handleBack = () => {
    const steps: Step[] = ['info', 'zones'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    } else {
      router.push('/');
    }
  };

  if (currentStep === 'zones') {
    console.log('[Create] Rendering ZoneEditor with:', {
      blueprintUrl,
      mapImageUrl: mapImageUrl ? mapImageUrl.substring(0, 100) : 'none',
      imageUrl: blueprintUrl || mapImageUrl || 'undefined',
      canvasWidth: canvasConfig.width,
      canvasHeight: canvasConfig.height,
    });
  }

  return (
    <div className="container mx-auto py-8 px-4" style={{ maxWidth: currentStep === 'zones' ? '100%' : '1280px' }}>
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentStep === 'info' ? 'Back to Home' : 'Back'}
        </Button>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>

      {currentStep !== 'zones' && (
        <>
          <h1 className="text-4xl font-bold mb-2 text-center">Create Interactive Map</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
            Build your own interactive map with custom zones and content
          </p>
        </>
      )}

      {currentStep !== 'zones' && stepIndicator}

      {currentStep === 'info' && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Map Information</CardTitle>
              <CardDescription>Give your map a title and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Map Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Office Floor Plan, Campus Map, Store Layout"
                  value={mapTitle}
                  onChange={(e) => setMapTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your map..."
                  value={mapDescription}
                  onChange={(e) => setMapDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aiNavigator"
                    checked={aiNavigatorEnabled}
                    onCheckedChange={(checked) => setAiNavigatorEnabled(checked as boolean)}
                  />
                  <Label htmlFor="aiNavigator" className="cursor-pointer">
                    Enable AI Navigator (Gemini-powered guide)
                  </Label>
                </div>

                {aiNavigatorEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="aiPrompt">
                      AI Navigator Instructions (Optional)
                    </Label>
                    <Textarea
                      id="aiPrompt"
                      placeholder={getDefaultPromptHint()}
                      value={aiNavigatorPrompt}
                      onChange={(e) => setAiNavigatorPrompt(e.target.value)}
                      rows={6}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      The AI will automatically have context about all zones on your map.
                      Add custom instructions here to guide the AI's behavior and tone.
                    </p>
                  </div>
                )}
              </div>

              <Button onClick={handleInfoSubmit} className="w-full">
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {currentStep === 'zones' && (
        <>
          <h1 className="text-3xl font-bold mb-6">Place Zones on Map</h1>
          <MapZoneEditor
            onSave={(zones, calculatedBounds, canvasSize) => {
              console.log('[Create] MapZoneEditor onSave called with:', {
                zoneCount: zones.length,
                calculatedBounds,
                canvasSize,
                firstZone: zones[0]
              });

              // Convert MapZone format to regular Zone format
              // Keep BOTH geographic coordinates (for 3D viewer) AND pixel coordinates (for canvas)
              const convertedZones = zones.map(mapZone => {
                const pixelCoords = geoToPixel(
                  mapZone.lat,
                  mapZone.lng,
                  canvasSize.width,
                  canvasSize.height,
                  calculatedBounds
                );

                const converted = {
                  id: mapZone.id,
                  type: mapZone.type,
                  // Store geographic coordinates directly (not nested)
                  // The API will stringify this, so pass as object
                  coordinates: {
                    lat: mapZone.lat,
                    lng: mapZone.lng,
                    x: pixelCoords.x,
                    y: pixelCoords.y,
                  },
                  content: mapZone.content,
                };

                console.log('[Create] Converted zone:', converted);
                return converted;
              });

              // Set the calculated bounds and canvas config
              setGeoBounds(calculatedBounds);
              setCanvasConfig(canvasSize);

              console.log('[Create] Calling handleSaveMap with:', {
                zoneCount: convertedZones.length,
                geoBounds: calculatedBounds,
              });

              // Call the regular save handler
              handleSaveMap(convertedZones, []);
            }}
          />
        </>
      )}
    </div>
  );
}
