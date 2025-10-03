'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CanvasDefinition from '@/components/canvas-definition';
import BlueprintUpload from '@/components/blueprint-upload';
import ZoneEditor from '@/components/zone-editor';
import { GeographicBounds, CanvasConfig } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowLeft, X } from 'lucide-react';

type Step = 'info' | 'canvas' | 'blueprint' | 'zones';

export default function CreateMapPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('info');

  // Map data
  const [mapTitle, setMapTitle] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [geoBounds, setGeoBounds] = useState<GeographicBounds | null>(null);
  const [useBaseMap, setUseBaseMap] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(null);
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>({
    width: 800,
    height: 600,
    coordinateSystem: 'pixel',
  });

  const handleInfoSubmit = () => {
    if (!mapTitle) {
      alert('Please enter a map title');
      return;
    }
    setCurrentStep('canvas');
  };

  const handleCanvasComplete = (bounds: GeographicBounds | null, useMap: boolean, mapImage?: string) => {
    setGeoBounds(bounds);
    setUseBaseMap(useMap);
    setMapImageUrl(mapImage || null);
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

  const handleSaveMap = async (zones: any[]) => {
    try {
      // Use blueprint if uploaded, otherwise use captured map image
      const imageToSave = blueprintUrl || mapImageUrl;

      console.log('[Create] Saving map with imageUrl:', imageToSave?.substring(0, 100));

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
          zones,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create map');
      }

      const data = await response.json();
      router.push(`/maps/${data.id}`);
    } catch (error) {
      console.error('Error saving map:', error);
      alert('Failed to save map. Please try again.');
    }
  };

  const stepIndicator = (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-4">
        {(['info', 'canvas', 'blueprint', 'zones'] as Step[]).map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep === step
                  ? 'bg-blue-600 text-white'
                  : index < ['info', 'canvas', 'blueprint', 'zones'].indexOf(currentStep)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {index + 1}
            </div>
            {index < 3 && <div className="w-16 h-1 bg-gray-300 mx-2" />}
          </div>
        ))}
      </div>
      <div className="flex justify-center space-x-20 mt-2">
        <span className="text-sm text-gray-600 dark:text-gray-300">Info</span>
        <span className="text-sm text-gray-600 dark:text-gray-300">Canvas</span>
        <span className="text-sm text-gray-600 dark:text-gray-300">Blueprint</span>
        <span className="text-sm text-gray-600 dark:text-gray-300">Zones</span>
      </div>
    </div>
  );

  const handleBack = () => {
    const steps: Step[] = ['info', 'canvas', 'blueprint', 'zones'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
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

      <h1 className="text-4xl font-bold mb-2 text-center">Create Interactive Map</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
        Build your own interactive map with custom zones and content
      </p>

      {stepIndicator}

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
              <Button onClick={handleInfoSubmit} className="w-full">
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {currentStep === 'canvas' && (
        <div className="max-w-4xl mx-auto">
          <CanvasDefinition onComplete={handleCanvasComplete} />
        </div>
      )}

      {currentStep === 'blueprint' && (
        <div className="max-w-4xl mx-auto">
          <BlueprintUpload onUpload={handleBlueprintUpload} onSkip={handleBlueprintSkip} />
        </div>
      )}

      {currentStep === 'zones' && (
        <div className="max-w-7xl mx-auto">
          {console.log('[Create] Rendering ZoneEditor with:', {
            blueprintUrl,
            mapImageUrl: mapImageUrl ? mapImageUrl.substring(0, 100) : 'none',
            imageUrl: blueprintUrl || mapImageUrl || 'undefined',
            canvasWidth: canvasConfig.width,
            canvasHeight: canvasConfig.height,
          })}
          <ZoneEditor
            imageUrl={blueprintUrl || mapImageUrl || undefined}
            canvasWidth={canvasConfig.width}
            canvasHeight={canvasConfig.height}
            geoBounds={geoBounds}
            useBaseMap={useBaseMap}
            onSave={handleSaveMap}
          />
        </div>
      )}
    </div>
  );
}
