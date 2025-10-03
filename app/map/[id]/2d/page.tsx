'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Stage, Layer, Image as KonvaImage, Circle, Rect } from 'react-konva';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PointCoordinates, RectangleCoordinates, CircleCoordinates, ZoneContent } from '@/lib/types';
import useImage from 'use-image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X, Globe } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface Zone {
  id: string;
  type: string;
  coordinates: string;
  content: string;
}

interface MapData {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  canvasConfig: string;
  zones: Zone[];
}

export default function Map2DViewerPage() {
  const params = useParams();
  const router = useRouter();
  const [map, setMap] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<{ content: ZoneContent } | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  const canvasConfig = map ? JSON.parse(map.canvasConfig) : { width: 800, height: 600 };
  const [image, status] = useImage(map?.imageUrl || '');

  useEffect(() => {
    if (map?.imageUrl) {
      console.log('[2DMapViewer] Loading image from:', map.imageUrl.substring(0, 100));
      console.log('[2DMapViewer] Image status:', status);
      console.log('[2DMapViewer] Image loaded:', !!image);
    }
  }, [map?.imageUrl, status, image]);

  useEffect(() => {
    fetchMap();
  }, [params.id]);

  const fetchMap = async () => {
    try {
      const response = await fetch(`/api/maps/${params.id}`);
      const data = await response.json();
      console.log('[2DMapViewer] Loaded map:', data.title);
      console.log('[2DMapViewer] ImageURL:', data.imageUrl?.substring(0, 100));
      console.log('[2DMapViewer] ImageURL length:', data.imageUrl?.length);
      setMap(data);
    } catch (error) {
      console.error('Error fetching map:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleZoneClick = (zone: Zone) => {
    const content = JSON.parse(zone.content);
    setSelectedZone({ content });
  };

  const renderZone = (zone: Zone) => {
    const coordinates = JSON.parse(zone.coordinates);
    const isHovered = hoveredZoneId === zone.id;

    const commonProps = {
      fill: isHovered ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.3)',
      stroke: 'rgb(59, 130, 246)',
      strokeWidth: isHovered ? 3 : 2,
      onClick: () => handleZoneClick(zone),
      onMouseEnter: () => setHoveredZoneId(zone.id),
      onMouseLeave: () => setHoveredZoneId(null),
      style: { cursor: 'pointer' },
    };

    switch (zone.type) {
      case 'point':
        const pointCoords = coordinates as PointCoordinates;
        return <Circle key={zone.id} {...commonProps} x={pointCoords.x} y={pointCoords.y} radius={15} />;
      case 'rectangle':
        const rectCoords = coordinates as RectangleCoordinates;
        return (
          <Rect
            key={zone.id}
            {...commonProps}
            x={rectCoords.x}
            y={rectCoords.y}
            width={rectCoords.width}
            height={rectCoords.height}
          />
        );
      case 'circle':
        const circleCoords = coordinates as CircleCoordinates;
        return <Circle key={zone.id} {...commonProps} x={circleCoords.x} y={circleCoords.y} radius={circleCoords.radius} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading map...</p>
      </div>
    );
  }

  if (!map) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Map not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-8">
        <div className="flex items-start justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/map/${params.id}`)}
            className="text-white hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to 3D Globe
          </Button>
          <div className="flex gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/maps')}
              className="text-white hover:text-white hover:bg-white/10"
            >
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        </div>
        <h1 className="text-5xl font-bold text-white mb-2">{map.title} - 2D Map</h1>
        {map.description && <p className="text-xl text-gray-300">{map.description}</p>}
      </div>

      {/* Main Canvas - Centered */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative shadow-2xl" style={{
          background: 'linear-gradient(135deg, rgba(30,58,138,0.1) 0%, rgba(88,28,135,0.1) 100%)',
          padding: '2rem',
          borderRadius: '1rem',
        }}>
          <Stage width={canvasConfig.width} height={canvasConfig.height}>
            <Layer>
              {map.imageUrl && image && <KonvaImage image={image} width={canvasConfig.width} height={canvasConfig.height} />}
              {map.zones.map(renderZone)}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Interactive hint */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white/70 text-lg animate-pulse">Click on the highlighted zones to explore</p>
      </div>

      {/* Immersive Modal */}
      <Dialog open={!!selectedZone} onOpenChange={() => setSelectedZone(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-2 border-blue-500/30">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {selectedZone?.content.title}
            </DialogTitle>
            {selectedZone?.content.description && (
              <DialogDescription className="text-lg text-gray-300 mt-2">
                {selectedZone.content.description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="overflow-y-auto max-h-[70vh] pr-4 space-y-6">
            {/* Images Gallery */}
            {selectedZone?.content.images && selectedZone.content.images.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-blue-300">Gallery</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedZone.content.images.map((img, index) => (
                    <div key={index} className="relative group overflow-hidden rounded-xl shadow-2xl">
                      <img
                        src={img}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {selectedZone?.content.videos && selectedZone.content.videos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-purple-300">Videos</h3>
                <div className="space-y-4">
                  {selectedZone.content.videos.map((video, index) => (
                    <div key={index} className="rounded-xl overflow-hidden shadow-2xl">
                      <iframe
                        width="100%"
                        height="400"
                        src={video.includes('youtube') ? video.replace('watch?v=', 'embed/') : video}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {selectedZone?.content.links && selectedZone.content.links.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-green-300">Resources</h3>
                <div className="grid gap-3">
                  {selectedZone.content.links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-blue-400/50 transition-all duration-300"
                    >
                      <span className="text-lg font-medium group-hover:text-blue-400 transition-colors">
                        {link.label}
                      </span>
                      <svg className="w-6 h-6 text-blue-400 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
