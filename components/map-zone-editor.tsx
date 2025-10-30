'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Autocomplete } from '@react-google-maps/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZoneType, ZoneContent, GeographicBounds } from '@/lib/types';
import { MapPin, Trash2, Info, Upload } from 'lucide-react';
import CSVImportDialog from '@/components/csv-import-dialog';
import { GeocodedZone } from '@/lib/csv-importer';

interface MapZone {
  id: string;
  type: 'point'; // For now, only support point markers on map
  lat: number;
  lng: number;
  content: ZoneContent;
}

interface MapZoneEditorProps {
  onSave: (zones: MapZone[], bounds: GeographicBounds, canvasSize: { width: number; height: number }) => void;
}

const containerStyle = {
  width: '100%',
  height: '600px'
};

const defaultCenter = {
  lat: 28.6024,
  lng: -81.2001
};

// Define libraries outside component to maintain stable reference
// Must be defined as a constant array outside the component to avoid re-initialization
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

export default function MapZoneEditor({ onSave }: MapZoneEditorProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Log any loading errors
  useEffect(() => {
    if (loadError) {
      console.error('Google Maps API failed to load:', loadError);
    }
  }, [loadError]);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [zones, setZones] = useState<MapZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [editingZone, setEditingZone] = useState<MapZone | null>(null);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [zoneContent, setZoneContent] = useState<ZoneContent>({
    title: '',
    description: '',
    images: [],
    videos: [],
    links: [],
  });

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [showCsvImportDialog, setShowCsvImportDialog] = useState(false);

  // Update available categories when zones change
  useEffect(() => {
    const categories = Array.from(new Set(
      zones
        .map(zone => zone.content.category)
        .filter((cat): cat is string => !!cat && cat.trim() !== '')
    )).sort();
    setAvailableCategories(categories);
  }, [zones]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        map?.panTo(place.geometry.location);
        map?.setZoom(15);
      }
    }
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    const newZone: MapZone = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'point',
      lat,
      lng,
      content: { title: `Zone ${zones.length + 1}`, description: '', images: [], videos: [], links: [] },
    };

    setEditingZone(newZone);
    setZoneContent({ title: `Zone ${zones.length + 1}`, description: '', images: [], videos: [], links: [] });
    setShowContentDialog(true);
  }, [zones.length]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
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
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 100MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const videoUrl = event.target?.result as string;
        setZoneContent(prevContent => ({
          ...prevContent,
          videos: [...(prevContent.videos || []), videoUrl],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveZoneContent = () => {
    if (editingZone) {
      const updatedZone = { ...editingZone, content: zoneContent };
      setZones(prev => [...prev, updatedZone]);
      setEditingZone(null);
      setShowContentDialog(false);
      setZoneContent({ title: '', description: '', images: [], videos: [], links: [] });
    }
  };

  const handleDeleteZone = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
    setSelectedZone(null);
  };

  const handleCsvImport = (importedZones: GeocodedZone[]) => {
    // Convert GeocodedZone to MapZone format
    const newZones: MapZone[] = importedZones
      .filter(z => z.geoCoords) // Only zones with geocoded coordinates
      .map(geoZone => ({
        id: geoZone.id,
        type: 'point',
        lat: geoZone.geoCoords!.lat,
        lng: geoZone.geoCoords!.lng,
        content: geoZone.content,
      }));

    setZones(prev => [...prev, ...newZones]);
    setShowCsvImportDialog(false);

    // Pan map to show first imported zone
    if (newZones.length > 0 && map) {
      map.panTo({ lat: newZones[0].lat, lng: newZones[0].lng });
      map.setZoom(12);
    }
  };

  const handleSaveMap = () => {
    if (zones.length === 0) {
      alert('Please add at least one zone before saving');
      return;
    }

    // Calculate bounds from all zones
    const lats = zones.map(z => z.lat);
    const lngs = zones.map(z => z.lng);

    const bounds: GeographicBounds = {
      minLat: Math.min(...lats) - 0.01,
      maxLat: Math.max(...lats) + 0.01,
      minLng: Math.min(...lngs) - 0.01,
      maxLng: Math.max(...lngs) + 0.01,
    };

    // Use a standard canvas size
    const canvasSize = { width: 1000, height: 600 };

    onSave(zones, bounds, canvasSize);
  };

  if (loadError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">Error loading Google Maps</p>
        <p className="text-sm text-gray-600">{loadError.message}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="p-8 text-center">
        <p>Loading Google Maps...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8">
      {/* Map */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Interactive Map</CardTitle>
            <CardDescription>Click anywhere on the map to add a zone marker</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="relative">
              {isLoaded && (
                <Autocomplete
                  onLoad={onAutocompleteLoad}
                  onPlaceChanged={onPlaceChanged}
                >
                  <input
                    type="text"
                    placeholder="Search for a location..."
                    className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[1000] w-80 px-4 py-2 text-sm border border-gray-300 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    style={{ maxWidth: 'calc(100% - 2rem)' }}
                  />
                </Autocomplete>
              )}
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={defaultCenter}
                zoom={13}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onClick={handleMapClick}
                options={{
                  mapTypeControl: true,
                  streetViewControl: true,
                  fullscreenControl: true,
                }}
              >
              {zones.map((zone) => (
                <Marker
                  key={zone.id}
                  position={{ lat: zone.lat, lng: zone.lng }}
                  onClick={() => setSelectedZone(zone)}
                  label={{
                    text: zone.content.title?.substring(0, 1) || 'Z',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
              ))}

              {selectedZone && (
                <InfoWindow
                  position={{ lat: selectedZone.lat, lng: selectedZone.lng }}
                  onCloseClick={() => setSelectedZone(null)}
                >
                  <div className="p-2">
                    <h3 className="font-bold text-sm mb-1">{selectedZone.content.title}</h3>
                    {selectedZone.content.description && (
                      <p className="text-xs text-gray-600 mb-2">{selectedZone.content.description}</p>
                    )}
                    {selectedZone.content.category && (
                      <span className="inline-block text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-2">
                        {selectedZone.content.category}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteZone(selectedZone.id)}
                      className="w-full mt-2"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
            </div>

            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Tips:</strong> Use the search box in the map to find locations.
                Click on the map to place zones manually, or use "Import from CSV" button to bulk import.
                Added zones: <strong>{zones.length}</strong>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Zones ({zones.length})</CardTitle>
            <CardDescription>Click map to add zones</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setShowCsvImportDialog(true)}
              className="w-full mb-4"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import from CSV
            </Button>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {zones.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No zones yet. Click on the map to add your first zone!
                </p>
              ) : (
                zones.map((zone) => (
                  <div key={zone.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{zone.content.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                        </span>
                        {zone.content.category && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                            {zone.content.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          map?.panTo({ lat: zone.lat, lng: zone.lng });
                          map?.setZoom(15);
                          setSelectedZone(zone);
                        }}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteZone(zone.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSaveMap}
          className="w-full"
          size="lg"
          disabled={zones.length === 0}
        >
          Save Map with {zones.length} Zone{zones.length !== 1 ? 's' : ''}
        </Button>
      </div>

      {/* Content Dialog */}
      <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zone Content</DialogTitle>
            <DialogDescription>Add rich media and information about this location</DialogDescription>
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
                placeholder="Describe this location..."
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
                placeholder="e.g., Restaurant, Park, Shop"
              />
              <datalist id="category-options">
                {availableCategories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                {availableCategories.length > 0
                  ? `Select from existing categories or type a new one. ${availableCategories.length} categories available.`
                  : 'Categories allow users to filter zones on the map.'}
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
                  <Input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                    multiple
                    onChange={handleVideoUpload}
                    className="cursor-pointer"
                  />
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
              Add Zone
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={showCsvImportDialog}
        onClose={() => setShowCsvImportDialog(false)}
        onImport={handleCsvImport}
        canvasWidth={1000}
        canvasHeight={600}
        geoBounds={null}
      />
    </div>
  );
}
