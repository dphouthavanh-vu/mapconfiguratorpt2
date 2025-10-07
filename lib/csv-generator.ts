import { GeographicBounds, CanvasConfig } from './types';
import { zoneToGeo } from './coordinate-converter';

interface Zone {
  id: string;
  type: string;
  coordinates: string; // JSON string
  content: string; // JSON string
  style: string | null; // JSON string
}

interface LandmarkCSV {
  name: string;
  lon: number;
  lat: number;
  icon: string;
  color?: string;
  contentUrl?: string;
  description?: string;
  images?: string[];
  links?: Array<{url: string; label?: string}>;
  videos?: string[];
}

/**
 * Converts zones to CSV format for globe visualization
 */
export function zonesToCSV(
  zones: Zone[],
  canvasConfig: CanvasConfig,
  geoBounds: GeographicBounds | null,
  defaultIcon: string = '',
  defaultColor: string = '#0066CC'
): string {
  if (!geoBounds) {
    throw new Error('Geographic bounds are required to generate CSV for globe');
  }

  // Convert zones to landmark objects
  const landmarks: LandmarkCSV[] = zones.map((zone) => {
    const coordinates = JSON.parse(zone.coordinates);
    const content = JSON.parse(zone.content);
    const style = zone.style ? JSON.parse(zone.style) : {};

    // Convert pixel coordinates to lat/lng
    const { lat, lng } = zoneToGeo(
      coordinates,
      zone.type,
      canvasConfig.width,
      canvasConfig.height,
      geoBounds
    );

    // Build landmark object
    const landmark: LandmarkCSV = {
      name: content.title || 'Unnamed Zone',
      lon: lng,
      lat: lat,
      icon: style.icon || defaultIcon,
    };

    // Add optional fields
    if (style.color) {
      landmark.color = style.color;
    } else if (defaultColor) {
      landmark.color = defaultColor;
    }

    // Use first video URL as contentUrl, or generate a link to the zone
    if (content.videos && content.videos.length > 0) {
      landmark.contentUrl = content.videos[0];
    } else if (content.links && content.links.length > 0) {
      landmark.contentUrl = content.links[0].url;
    }

    return landmark;
  });

  // Generate CSV string
  return landmarksToCSVString(landmarks);
}

/**
 * Converts landmark objects to CSV string
 */
function landmarksToCSVString(landmarks: LandmarkCSV[]): string {
  // CSV header
  const header = 'name,lon,lat,icon,color,contentUrl';

  // CSV rows
  const rows = landmarks.map((landmark) => {
    const fields = [
      escapeCSVField(landmark.name),
      landmark.lon.toFixed(7), // 7 decimal places for GPS precision
      landmark.lat.toFixed(7),
      escapeCSVField(landmark.icon),
      landmark.color || '',
      landmark.contentUrl || '',
    ];

    return fields.join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Escapes a CSV field (handles quotes and commas)
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    // Escape quotes by doubling them
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return field;
}

/**
 * Converts zones to landmark objects (for in-memory use without CSV)
 */
export function zonesToLandmarks(
  zones: Zone[],
  canvasConfig: CanvasConfig,
  geoBounds: GeographicBounds | null,
  defaultIcon: string = '',
  defaultColor: string = '#0066CC'
): LandmarkCSV[] {
  if (!geoBounds) {
    console.warn('[zonesToLandmarks] No geographic bounds provided');
    return [];
  }

  console.log('[zonesToLandmarks] Converting zones to landmarks:', {
    zonesCount: zones.length,
    canvasConfig,
    geoBounds
  });

  return zones.map((zone, index) => {
    const coordinates = JSON.parse(zone.coordinates);
    const content = JSON.parse(zone.content);
    const style = zone.style ? JSON.parse(zone.style) : {};

    console.log(`[zonesToLandmarks] Zone ${index}:`, {
      type: zone.type,
      coordinates,
      content: content.title
    });

    const { lat, lng } = zoneToGeo(
      coordinates,
      zone.type,
      canvasConfig.width,
      canvasConfig.height,
      geoBounds
    );

    console.log(`[zonesToLandmarks] Converted to geographic coords:`, { lat, lng });

    const landmark: LandmarkCSV = {
      name: content.title || 'Unnamed Zone',
      lon: lng,
      lat: lat,
      icon: style.icon || defaultIcon,
    };

    if (style.color || defaultColor) {
      landmark.color = style.color || defaultColor;
    }

    if (content.videos && content.videos.length > 0) {
      landmark.contentUrl = content.videos[0];
    } else if (content.links && content.links.length > 0) {
      landmark.contentUrl = content.links[0].url;
    }

    // Add full content data for modal display
    if (content.description) {
      landmark.description = content.description;
    }
    if (content.images && content.images.length > 0) {
      landmark.images = content.images;
    }
    if (content.links && content.links.length > 0) {
      landmark.links = content.links;
    }
    if (content.videos && content.videos.length > 0) {
      landmark.videos = content.videos;
    }

    return landmark;
  });
}
