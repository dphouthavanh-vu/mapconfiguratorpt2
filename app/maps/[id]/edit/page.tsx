'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import ZoneEditor from '@/components/zone-editor';
import { GeographicBounds, CanvasConfig } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowLeft } from 'lucide-react';

interface Zone {
  id: string;
  type: string;
  coordinates: string;
  content: string;
  style?: string | null;
}

interface MapData {
  id: string;
  title: string;
  description: string | null;
  geographicBounds: string | null;
  canvasConfig: string;
  imageUrl: string | null;
  useBaseMap: boolean;
  categories: string | null;
  zones: Zone[];
}

export default function EditMapPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState<MapData | null>(null);

  // Parsed data
  const [mapTitle, setMapTitle] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [geoBounds, setGeoBounds] = useState<GeographicBounds | null>(null);
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>({
    width: 800,
    height: 600,
    coordinateSystem: 'pixel',
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [useBaseMap, setUseBaseMap] = useState(false);
  const [existingZones, setExistingZones] = useState<any[]>([]);

  useEffect(() => {
    fetchMapData();
  }, [resolvedParams.id]);

  const fetchMapData = async () => {
    try {
      const response = await fetch(`/api/maps/${resolvedParams.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch map');
      }

      const data: MapData = await response.json();
      setMapData(data);

      // Parse and set data
      setMapTitle(data.title);
      setMapDescription(data.description || '');

      if (data.geographicBounds) {
        setGeoBounds(JSON.parse(data.geographicBounds));
      }

      const parsedCanvasConfig = JSON.parse(data.canvasConfig);
      setCanvasConfig(parsedCanvasConfig);

      setImageUrl(data.imageUrl);
      setUseBaseMap(data.useBaseMap);

      // Parse zones
      const parsedZones = data.zones.map(zone => ({
        id: zone.id,
        type: zone.type,
        coordinates: JSON.parse(zone.coordinates),
        content: JSON.parse(zone.content),
      }));
      setExistingZones(parsedZones);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching map:', error);
      alert('Failed to load map data');
      router.push('/maps');
    }
  };

  const handleSaveMap = async (zones: any[], categories: string[]) => {
    try {
      console.log('[Edit] Updating map with zones:', zones.length);
      console.log('[Edit] Updating with categories:', categories);

      const response = await fetch(`/api/maps/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mapTitle,
          description: mapDescription,
          categories,
          zones,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update map');
      }

      const data = await response.json();
      // Redirect to view the updated map
      router.push(`/map/${data.id}`);
    } catch (error) {
      console.error('Error updating map:', error);
      alert('Failed to update map. Please try again.');
    }
  };

  const handleBack = () => {
    if (confirm('Are you sure you want to leave? Any unsaved changes will be lost.')) {
      router.push('/maps');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-center">Loading map data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Maps
        </Button>
        <ThemeToggle />
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Edit Map</h1>
        <p className="text-gray-600 dark:text-gray-300">Update your map's information and zones</p>
      </div>

      {/* Map Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Map Information</CardTitle>
          <CardDescription>Update basic information about your map</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Map Title *</Label>
            <Input
              id="title"
              value={mapTitle}
              onChange={(e) => setMapTitle(e.target.value)}
              placeholder="e.g., Campus Map, Office Layout"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={mapDescription}
              onChange={(e) => setMapDescription(e.target.value)}
              placeholder="Describe your map..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Zone Editor */}
      <ZoneEditor
        imageUrl={imageUrl || undefined}
        canvasWidth={canvasConfig.width}
        canvasHeight={canvasConfig.height}
        geoBounds={geoBounds}
        useBaseMap={useBaseMap}
        onSave={handleSaveMap}
        importedZones={existingZones}
      />
    </div>
  );
}
