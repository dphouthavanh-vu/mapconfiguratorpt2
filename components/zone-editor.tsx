'use client';

import { useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Line } from 'react-konva';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ZoneType, ZoneCoordinates, ZoneContent, PointCoordinates, RectangleCoordinates, CircleCoordinates, GeographicBounds } from '@/lib/types';
import useImage from 'use-image';

interface Zone {
  id: string;
  type: ZoneType;
  coordinates: ZoneCoordinates;
  content: ZoneContent;
}

interface ZoneEditorProps {
  imageUrl?: string;
  canvasWidth: number;
  canvasHeight: number;
  geoBounds?: GeographicBounds | null;
  useBaseMap?: boolean;
  onSave: (zones: Zone[]) => void;
}

export default function ZoneEditor({ imageUrl, canvasWidth, canvasHeight, geoBounds, useBaseMap, onSave }: ZoneEditorProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneType, setSelectedZoneType] = useState<ZoneType>('point');
  const [placementMode, setPlacementMode] = useState<'click' | 'manual'>('click');
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [image] = useImage(imageUrl || '');

  // Manual coordinate inputs
  const [manualCoords, setManualCoords] = useState({
    x: '',
    y: '',
    width: '',
    height: '',
    radius: '',
  });

  // Zone content form
  const [zoneContent, setZoneContent] = useState<ZoneContent>({
    title: '',
    description: '',
    images: [],
    videos: [],
    links: [],
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setZoneContent({
          ...zoneContent,
          images: [...(zoneContent.images || []), imageUrl],
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCanvasClick = (e: any) => {
    if (placementMode !== 'click') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    let coordinates: ZoneCoordinates;

    switch (selectedZoneType) {
      case 'point':
        coordinates = { x: point.x, y: point.y };
        break;
      case 'rectangle':
        coordinates = { x: point.x, y: point.y, width: 100, height: 100 };
        break;
      case 'circle':
        coordinates = { x: point.x, y: point.y, radius: 50 };
        break;
      default:
        return;
    }

    const newZone: Zone = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedZoneType,
      coordinates,
      content: { title: `Zone ${zones.length + 1}` },
    };

    setEditingZone(newZone);
    setZoneContent({ title: `Zone ${zones.length + 1}`, description: '', images: [], videos: [], links: [] });
    setShowContentDialog(true);
  };

  const handleManualAdd = () => {
    let coordinates: ZoneCoordinates;

    switch (selectedZoneType) {
      case 'point':
        coordinates = {
          x: parseFloat(manualCoords.x),
          y: parseFloat(manualCoords.y),
        };
        break;
      case 'rectangle':
        coordinates = {
          x: parseFloat(manualCoords.x),
          y: parseFloat(manualCoords.y),
          width: parseFloat(manualCoords.width),
          height: parseFloat(manualCoords.height),
        };
        break;
      case 'circle':
        coordinates = {
          x: parseFloat(manualCoords.x),
          y: parseFloat(manualCoords.y),
          radius: parseFloat(manualCoords.radius),
        };
        break;
      default:
        return;
    }

    const newZone: Zone = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedZoneType,
      coordinates,
      content: { title: `Zone ${zones.length + 1}` },
    };

    setEditingZone(newZone);
    setZoneContent({ title: `Zone ${zones.length + 1}`, description: '', images: [], videos: [], links: [] });
    setShowContentDialog(true);
  };

  const handleSaveZoneContent = () => {
    if (editingZone) {
      const updatedZone = { ...editingZone, content: zoneContent };
      setZones([...zones, updatedZone]);
      setEditingZone(null);
      setShowContentDialog(false);
      setZoneContent({ title: '', description: '', images: [], videos: [], links: [] });
      setManualCoords({ x: '', y: '', width: '', height: '', radius: '' });
    }
  };

  const handleDeleteZone = (id: string) => {
    setZones(zones.filter((z) => z.id !== id));
  };

  const renderZone = (zone: Zone) => {
    const commonProps = {
      fill: 'rgba(59, 130, 246, 0.3)',
      stroke: 'rgb(59, 130, 246)',
      strokeWidth: 2,
    };

    switch (zone.type) {
      case 'point':
        const pointCoords = zone.coordinates as PointCoordinates;
        return <Circle key={zone.id} {...commonProps} x={pointCoords.x} y={pointCoords.y} radius={10} />;
      case 'rectangle':
        const rectCoords = zone.coordinates as RectangleCoordinates;
        return (
          <Rect key={zone.id} {...commonProps} x={rectCoords.x} y={rectCoords.y} width={rectCoords.width} height={rectCoords.height} />
        );
      case 'circle':
        const circleCoords = zone.coordinates as CircleCoordinates;
        return <Circle key={zone.id} {...commonProps} x={circleCoords.x} y={circleCoords.y} radius={circleCoords.radius} />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Canvas */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Canvas Editor</CardTitle>
            <CardDescription>Click to add zones or use manual coordinates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative border rounded-lg overflow-hidden bg-gray-100" style={{ maxWidth: canvasWidth, maxHeight: canvasHeight }}>
              <Stage width={canvasWidth} height={canvasHeight} onClick={handleCanvasClick}>
                <Layer>
                  {/* Background when no blueprint */}
                  {!imageUrl && (
                    <Rect
                      x={0}
                      y={0}
                      width={canvasWidth}
                      height={canvasHeight}
                      fill="#f3f4f6"
                      stroke="#d1d5db"
                      strokeWidth={2}
                    />
                  )}

                  {/* Blueprint image if provided */}
                  {imageUrl && image && <KonvaImage image={image} width={canvasWidth} height={canvasHeight} />}

                  {/* User zones */}
                  {zones.map(renderZone)}
                </Layer>
              </Stage>

              {/* Info overlay when using base map without blueprint */}
              {!imageUrl && geoBounds && useBaseMap && (
                <div className="absolute top-4 left-4 bg-white/90 p-3 rounded-lg shadow-md text-xs">
                  <p className="font-semibold text-gray-700 mb-1">Selected Area:</p>
                  <p className="text-gray-600">Lat: {geoBounds.minLat.toFixed(4)} to {geoBounds.maxLat.toFixed(4)}</p>
                  <p className="text-gray-600">Lng: {geoBounds.minLng.toFixed(4)} to {geoBounds.maxLng.toFixed(4)}</p>
                  <p className="text-gray-500 mt-2 text-xs italic">Click on canvas to add zones</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Add Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Zone Type</Label>
              <Select value={selectedZoneType} onValueChange={(v) => setSelectedZoneType(v as ZoneType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="point">Point</SelectItem>
                  <SelectItem value="rectangle">Rectangle</SelectItem>
                  <SelectItem value="circle">Circle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={placementMode} onValueChange={(v) => setPlacementMode(v as 'click' | 'manual')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="click">Click to Place</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>

              <TabsContent value="click" className="space-y-2">
                <p className="text-sm text-gray-600">Click on the canvas to place a {selectedZoneType}</p>
              </TabsContent>

              <TabsContent value="manual" className="space-y-2">
                <div className="space-y-2">
                  <Label>X Coordinate</Label>
                  <Input
                    type="number"
                    value={manualCoords.x}
                    onChange={(e) => setManualCoords({ ...manualCoords, x: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Y Coordinate</Label>
                  <Input
                    type="number"
                    value={manualCoords.y}
                    onChange={(e) => setManualCoords({ ...manualCoords, y: e.target.value })}
                  />
                </div>

                {selectedZoneType === 'rectangle' && (
                  <>
                    <div className="space-y-2">
                      <Label>Width</Label>
                      <Input
                        type="number"
                        value={manualCoords.width}
                        onChange={(e) => setManualCoords({ ...manualCoords, width: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height</Label>
                      <Input
                        type="number"
                        value={manualCoords.height}
                        onChange={(e) => setManualCoords({ ...manualCoords, height: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {selectedZoneType === 'circle' && (
                  <div className="space-y-2">
                    <Label>Radius</Label>
                    <Input
                      type="number"
                      value={manualCoords.radius}
                      onChange={(e) => setManualCoords({ ...manualCoords, radius: e.target.value })}
                    />
                  </div>
                )}

                <Button onClick={handleManualAdd} className="w-full">
                  Add Zone
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Zones List */}
        <Card>
          <CardHeader>
            <CardTitle>Zones ({zones.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium text-sm">{zone.content.title}</p>
                    <p className="text-xs text-gray-500">{zone.type}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteZone(zone.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button onClick={() => onSave(zones)} className="w-full" size="lg">
          Save Map
        </Button>
      </div>

      {/* Content Dialog */}
      <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zone Content</DialogTitle>
            <DialogDescription>Add rich media and information about this zone</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={zoneContent.title}
                onChange={(e) => setZoneContent({ ...zoneContent, title: e.target.value })}
                placeholder="Zone title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={zoneContent.description}
                onChange={(e) => setZoneContent({ ...zoneContent, description: e.target.value })}
                placeholder="Describe this zone..."
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Images</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              {zoneContent.images && zoneContent.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {zoneContent.images.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt={`Upload ${idx}`} className="w-full h-24 object-cover rounded" />
                      <button
                        onClick={() => {
                          const newImages = zoneContent.images?.filter((_, i) => i !== idx);
                          setZoneContent({ ...zoneContent, images: newImages });
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video URLs */}
            <div className="space-y-2">
              <Label>Video URL (YouTube, Vimeo, etc.)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      if (input.value) {
                        setZoneContent({
                          ...zoneContent,
                          videos: [...(zoneContent.videos || []), input.value],
                        });
                        input.value = '';
                      }
                    }
                  }}
                />
              </div>
              {zoneContent.videos && zoneContent.videos.length > 0 && (
                <div className="space-y-1">
                  {zoneContent.videos.map((video, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                      <span className="text-sm truncate flex-1">{video}</span>
                      <button
                        onClick={() => {
                          const newVideos = zoneContent.videos?.filter((_, i) => i !== idx);
                          setZoneContent({ ...zoneContent, videos: newVideos });
                        }}
                        className="text-red-500 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div className="space-y-2">
              <Label>Links</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Link label"
                  id="link-label"
                />
                <Input
                  placeholder="https://..."
                  id="link-url"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const labelInput = document.getElementById('link-label') as HTMLInputElement;
                      const urlInput = e.target as HTMLInputElement;
                      if (labelInput.value && urlInput.value) {
                        setZoneContent({
                          ...zoneContent,
                          links: [...(zoneContent.links || []), { label: labelInput.value, url: urlInput.value }],
                        });
                        labelInput.value = '';
                        urlInput.value = '';
                      }
                    }
                  }}
                />
              </div>
              {zoneContent.links && zoneContent.links.length > 0 && (
                <div className="space-y-1">
                  {zoneContent.links.map((link, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                      <span className="text-sm">
                        {link.label} → {link.url}
                      </span>
                      <button
                        onClick={() => {
                          const newLinks = zoneContent.links?.filter((_, i) => i !== idx);
                          setZoneContent({ ...zoneContent, links: newLinks });
                        }}
                        className="text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleSaveZoneContent} className="w-full" size="lg">
              Save Zone
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
