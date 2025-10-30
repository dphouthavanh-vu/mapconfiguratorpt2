'use client';

import { useState, useEffect } from 'react';
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
import { Upload, FileText } from 'lucide-react';
import useImage from 'use-image';
import CSVImportDialog from '@/components/csv-import-dialog';
import { GeocodedZone } from '@/lib/csv-importer';

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
  onSave: (zones: Zone[], categories: string[]) => void;
  importedZones?: GeocodedZone[];
}

export default function ZoneEditor({ imageUrl, canvasWidth, canvasHeight, geoBounds, useBaseMap, onSave, importedZones }: ZoneEditorProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneType, setSelectedZoneType] = useState<ZoneType>('point');
  const [placementMode, setPlacementMode] = useState<'click' | 'manual'>('click');
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [showCsvImportDialog, setShowCsvImportDialog] = useState(false);

  // Generate static map URL if we have geographic bounds but no blueprint
  const staticMapUrl = !imageUrl && geoBounds && useBaseMap
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${(geoBounds.minLat + geoBounds.maxLat) / 2},${(geoBounds.minLng + geoBounds.maxLng) / 2}&zoom=17&size=${Math.min(canvasWidth, 640)}x${Math.min(canvasHeight, 640)}&scale=2&maptype=satellite&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    : null;

  const [image] = useImage(imageUrl || staticMapUrl || '');

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

  // Track mouse position for coordinate display
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Track all available categories from existing zones
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Update available categories when zones change
  useEffect(() => {
    const categories = Array.from(new Set(
      zones
        .map(zone => zone.content.category)
        .filter((cat): cat is string => !!cat && cat.trim() !== '')
    )).sort();
    setAvailableCategories(categories);
  }, [zones]);

  // Initialize with imported zones if provided
  useEffect(() => {
    if (importedZones && importedZones.length > 0) {
      const convertedZones: Zone[] = importedZones.map(geoZone => ({
        id: geoZone.id,
        type: geoZone.type,
        coordinates: geoZone.coordinates,
        content: geoZone.content,
      }));
      setZones(convertedZones);
      console.log('[ZoneEditor] Initialized with imported zones:', convertedZones.length);
    }
  }, [importedZones]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        // Use functional setState to get the latest state
        setZoneContent(prevContent => ({
          ...prevContent,
          images: [...(prevContent.images || []), imageUrl],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // Check file size (limit to 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB in bytes
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 100MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const videoUrl = event.target?.result as string;
        // Use functional setState to get the latest state
        setZoneContent(prevContent => ({
          ...prevContent,
          videos: [...(prevContent.videos || []), videoUrl],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCanvasMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (point && point.x != null && point.y != null) {
      const x = Math.round(point.x);
      const y = Math.round(point.y);

      if (x >= 0 && x <= canvasWidth && y >= 0 && y <= canvasHeight) {
        setMousePos({ x, y });
      } else {
        setMousePos(null);
      }
    } else {
      setMousePos(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    setMousePos(null);
  };

  const handleCanvasClick = (e: any) => {
    if (placementMode !== 'click') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    // Ensure we have valid coordinates
    if (!point || point.x == null || point.y == null) return;

    // Round to nearest pixel for accuracy
    const x = Math.round(point.x);
    const y = Math.round(point.y);

    // Ensure coordinates are within canvas bounds
    if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) return;

    let coordinates: ZoneCoordinates;

    switch (selectedZoneType) {
      case 'point':
        coordinates = { x, y };
        break;
      case 'rectangle':
        // Larger default size for better visibility
        coordinates = { x, y, width: 150, height: 150 };
        break;
      case 'circle':
        // Larger default radius for better visibility
        coordinates = { x, y, radius: 75 };
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

  const handleCsvImport = (importedZones: GeocodedZone[], calculatedBounds?: GeographicBounds) => {
    const newZones: Zone[] = importedZones.map(geoZone => ({
      id: geoZone.id,
      type: geoZone.type,
      coordinates: geoZone.coordinates,
      content: geoZone.content,
    }));

    setZones(prevZones => [...prevZones, ...newZones]);
    setShowCsvImportDialog(false);

    // Note: We can't update geoBounds here in zone-editor since it comes from parent
    // If bounds were calculated, user should have imported from Canvas step instead
    if (calculatedBounds) {
      console.warn('[ZoneEditor] Bounds were calculated but cannot be updated from this step');
    }
  };

  const handleZoneDragEnd = (zoneId: string, e: any) => {
    const newX = e.target.x();
    const newY = e.target.y();

    setZones(zones.map(zone => {
      if (zone.id !== zoneId) return zone;

      let newCoordinates: ZoneCoordinates;
      switch (zone.type) {
        case 'point':
          newCoordinates = { x: newX, y: newY } as PointCoordinates;
          break;
        case 'rectangle':
          const rectCoords = zone.coordinates as RectangleCoordinates;
          newCoordinates = { ...rectCoords, x: newX, y: newY } as RectangleCoordinates;
          break;
        case 'circle':
          const circleCoords = zone.coordinates as CircleCoordinates;
          newCoordinates = { ...circleCoords, x: newX, y: newY } as CircleCoordinates;
          break;
        default:
          return zone;
      }

      return { ...zone, coordinates: newCoordinates };
    }));
  };

  const handleZoneTransformEnd = (zoneId: string, node: any) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    setZones(zones.map(zone => {
      if (zone.id !== zoneId) return zone;

      let newCoordinates: ZoneCoordinates;
      switch (zone.type) {
        case 'rectangle':
          const rectCoords = zone.coordinates as RectangleCoordinates;
          newCoordinates = {
            x: node.x(),
            y: node.y(),
            width: Math.max(5, rectCoords.width * scaleX),
            height: Math.max(5, rectCoords.height * scaleY),
          } as RectangleCoordinates;
          break;
        case 'circle':
          const circleCoords = zone.coordinates as CircleCoordinates;
          newCoordinates = {
            x: node.x(),
            y: node.y(),
            radius: Math.max(5, circleCoords.radius * Math.max(scaleX, scaleY)),
          } as CircleCoordinates;
          break;
        default:
          return zone;
      }

      return { ...zone, coordinates: newCoordinates };
    }));
  };

  const renderZone = (zone: Zone) => {
    const commonProps = {
      fill: 'rgba(239, 68, 68, 0.3)', // Bright red with transparency for better visibility
      stroke: 'rgb(239, 68, 68)', // Solid red stroke
      strokeWidth: 3, // Thicker stroke for better visibility
      draggable: true,
      onDragEnd: (e: any) => handleZoneDragEnd(zone.id, e),
      onMouseEnter: (e: any) => {
        const container = e.target.getStage().container();
        container.style.cursor = 'move';
        e.target.strokeWidth(4);
      },
      onMouseLeave: (e: any) => {
        const container = e.target.getStage().container();
        container.style.cursor = 'crosshair';
        e.target.strokeWidth(3);
      },
      // Add shadow for better visibility
      shadowColor: 'black',
      shadowBlur: 5,
      shadowOpacity: 0.3,
      shadowOffset: { x: 2, y: 2 },
    };

    switch (zone.type) {
      case 'point':
        const pointCoords = zone.coordinates as PointCoordinates;
        // Larger radius for points to be more visible
        return <Circle key={zone.id} {...commonProps} x={pointCoords.x} y={pointCoords.y} radius={15} />;
      case 'rectangle':
        const rectCoords = zone.coordinates as RectangleCoordinates;
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
        const circleCoords = zone.coordinates as CircleCoordinates;
        return <Circle key={zone.id} {...commonProps} x={circleCoords.x} y={circleCoords.y} radius={circleCoords.radius} />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8">
      {/* Canvas */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Canvas Editor</CardTitle>
            <CardDescription>Click to add zones or use manual coordinates</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="relative border rounded-lg overflow-auto bg-gray-100"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                width: 'fit-content',
                cursor: placementMode === 'click' ? 'crosshair' : 'default'
              }}
            >
              <Stage
                width={canvasWidth}
                height={canvasHeight}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleCanvasMouseLeave}
              >
                <Layer>
                  {/* Background - either blueprint, static map, or gray placeholder */}
                  {image ? (
                    <KonvaImage image={image} width={canvasWidth} height={canvasHeight} />
                  ) : (
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

              {/* Coordinate display overlay */}
              {placementMode === 'click' && mousePos && (
                <div className="absolute bottom-4 right-4 bg-black/75 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-mono">
                  <div className="flex gap-3">
                    <span>X: {mousePos.x}</span>
                    <span>Y: {mousePos.y}</span>
                  </div>
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

            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCsvImportDialog(true)}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import from CSV
              </Button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Bulk import zones from a CSV file with names, addresses, and descriptions
              </p>
            </div>
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
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 capitalize">{zone.type}</span>
                      {zone.content.category && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                          {zone.content.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteZone(zone.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => {
            console.log("Saving zones:", JSON.stringify(zones, null, 2));
            console.log("Available categories:", availableCategories);
            onSave(zones, availableCategories);
          }}
          className="w-full"
          size="lg"
        >
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

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                list="category-options"
                value={zoneContent.category || ''}
                onChange={(e) => setZoneContent({ ...zoneContent, category: e.target.value })}
                placeholder="e.g., Parking, Building, Amenity, Dining"
              />
              <datalist id="category-options">
                {availableCategories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                {availableCategories.length > 0
                  ? `Select from existing categories or type a new one. ${availableCategories.length} categories available.`
                  : 'Categories allow users to filter zones on the map. Type to create your first category.'}
              </p>
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
                          setZoneContent(prevContent => ({
                            ...prevContent,
                            images: prevContent.images?.filter((_, i) => i !== idx) || [],
                          }));
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

            {/* Videos */}
            <div className="space-y-2">
              <Label>Videos</Label>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload Video</TabsTrigger>
                  <TabsTrigger value="url">Video URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="space-y-2">
                  <p className="text-sm text-muted-foreground">Upload video files (MP4, WebM, MOV) - Max 100MB</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                      multiple
                      onChange={handleVideoUpload}
                      className="cursor-pointer"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="url" className="space-y-2">
                  <p className="text-sm text-muted-foreground">Add video URLs from YouTube, Vimeo, or other platforms</p>
                  <div className="flex gap-2">
                    <Input
                      id="video-url-input"
                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          if (input.value) {
                            setZoneContent(prevContent => ({
                              ...prevContent,
                              videos: [...(prevContent.videos || []), input.value],
                            }));
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('video-url-input') as HTMLInputElement;
                        if (input && input.value) {
                          setZoneContent(prevContent => ({
                            ...prevContent,
                            videos: [...(prevContent.videos || []), input.value],
                          }));
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Video List */}
              {zoneContent.videos && zoneContent.videos.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-sm font-medium">{zoneContent.videos.length} video{zoneContent.videos.length !== 1 ? 's' : ''} added</p>
                  {zoneContent.videos.map((video, idx) => {
                    const isDataUrl = video.startsWith('data:video/');
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate block">{isDataUrl ? 'Uploaded video file' : video}</span>
                            {isDataUrl && <span className="text-xs text-muted-foreground">Local file</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setZoneContent(prevContent => ({
                              ...prevContent,
                              videos: prevContent.videos?.filter((_, i) => i !== idx) || [],
                            }));
                          }}
                          className="text-red-500 hover:text-red-700 ml-3 px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
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
                        setZoneContent(prevContent => ({
                          ...prevContent,
                          links: [...(prevContent.links || []), { label: labelInput.value, url: urlInput.value }],
                        }));
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
                          setZoneContent(prevContent => ({
                            ...prevContent,
                            links: prevContent.links?.filter((_, i) => i !== idx) || [],
                          }));
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

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={showCsvImportDialog}
        onClose={() => setShowCsvImportDialog(false)}
        onImport={handleCsvImport}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        geoBounds={geoBounds}
      />
    </div>
  );
}
