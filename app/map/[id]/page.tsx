'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GlobeViewer from '@/components/globe-viewer';
import dynamic from 'next/dynamic';
import { GeographicBounds, CanvasConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';

// Dynamically import Google Maps viewer for maps without bounds
const GoogleMaps3DViewer = dynamic(() => import('@/components/google-maps-3d-viewer'), { ssr: false });

interface Zone {
  id: string;
  type: string;
  coordinates: string;
  content: string;
  style: string | null;
}

interface MapData {
  id: string;
  title: string;
  description: string | null;
  geographicBounds: string | null;
  canvasConfig: string;
  zones: Zone[];
}

export default function MapViewerPage() {
  const params = useParams();
  const router = useRouter();
  const [map, setMap] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMap();
  }, [params.id]);

  const fetchMap = async () => {
    try {
      const response = await fetch(`/api/maps/${params.id}`);
      const data = await response.json();
      console.log('[MapViewer] Loaded map:', data.title);
      console.log('[MapViewer] Zones:', data.zones.length);
      console.log('[MapViewer] Geographic bounds:', data.geographicBounds);
      setMap(data);
    } catch (error) {
      console.error('Error fetching map:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-xl">Loading 3D globe...</p>
      </div>
    );
  }

  if (!map) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Map not found</p>
          <Button onClick={() => router.push('/maps')}>Back to Maps</Button>
        </div>
      </div>
    );
  }

  const geoBounds: GeographicBounds | null = map.geographicBounds
    ? JSON.parse(map.geographicBounds)
    : null;
  const canvasConfig: CanvasConfig = JSON.parse(map.canvasConfig);

  // If no geographic bounds, use Google Maps 3D viewer
  if (!geoBounds) {
    return (
      <div className="relative h-screen w-full bg-black">
        <GoogleMaps3DViewer
          zones={map.zones}
          mapTitle={map.title}
          geoBounds={null}
          canvasConfig={canvasConfig}
          aiNavigatorEnabled={map.aiNavigatorEnabled}
          aiNavigatorPrompt={map.aiNavigatorPrompt}
          onBackToMaps={() => router.push('/maps')}
        />
      </div>
    );
  }

  // Otherwise use Cesium globe viewer
  return (
    <div className="relative h-screen w-full bg-black">
      {/* Globe Viewer */}
      <GlobeViewer
        zones={map.zones}
        canvasConfig={canvasConfig}
        geoBounds={geoBounds}
        mapTitle={map.title}
        aiNavigatorEnabled={map.aiNavigatorEnabled}
        aiNavigatorPrompt={map.aiNavigatorPrompt}
        onBackToMaps={() => router.push('/maps')}
        onView2D={() => router.push(`/map/${params.id}/2d`)}
      />
    </div>
  );
}
