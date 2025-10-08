import { ZoneContent, ZoneCoordinates, ZoneType } from './types';

export interface CSVRow {
  [key: string]: string;
}

export interface CSVImportOptions {
  nameColumn?: string;
  addressColumn?: string;
  descriptionColumn?: string;
  categoryColumn?: string;
  latitudeColumn?: string;
  longitudeColumn?: string;
  typeColumn?: string;
  additionalColumns?: string[];
}

export interface ImportedZone {
  name: string;
  address?: string;
  description?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  type?: ZoneType;
  additionalData?: Record<string, string>;
}

export interface GeocodedZone {
  id: string;
  type: ZoneType;
  coordinates: ZoneCoordinates;
  content: ZoneContent;
  address?: string;
  needsGeocoding?: boolean;
  geoCoords?: { lat: number; lng: number }; // Preserve original geographic coordinates
}

/**
 * Parse CSV text into array of objects
 */
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.trim());

  // Parse data rows
  const data: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: CSVRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    data.push(row);
  }

  return data;
}

/**
 * Parse a single CSV line handling quotes and commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Analyze CSV data to suggest column mappings
 */
export function analyzeCsvColumns(data: CSVRow[]): CSVImportOptions {
  if (data.length === 0) return {};

  const headers = Object.keys(data[0]);
  const suggestions: CSVImportOptions = {};

  // Common patterns for name columns
  const namePatterns = /^(name|title|place|location|site|venue|business)$/i;
  // Common patterns for address columns
  const addressPatterns = /^(address|location|street|addr|full_address|complete_address)$/i;
  // Common patterns for description columns
  const descPatterns = /^(description|desc|details|info|information|summary|about|notes)$/i;
  // Common patterns for category columns
  const categoryPatterns = /^(category|cat|group|classification|tag|type_name)$/i;
  // Common patterns for latitude columns
  const latPatterns = /^(lat|latitude|y|lat_coord|geo_lat)$/i;
  // Common patterns for longitude columns
  const lngPatterns = /^(lon|long|longitude|lng|x|lng_coord|lon_coord|geo_lng|geo_lon)$/i;
  // Common patterns for type columns
  const typePatterns = /^(type|zone_type|kind|class|shape)$/i;

  headers.forEach(header => {
    if (!suggestions.nameColumn && namePatterns.test(header)) {
      suggestions.nameColumn = header;
    }
    if (!suggestions.addressColumn && addressPatterns.test(header)) {
      suggestions.addressColumn = header;
    }
    if (!suggestions.descriptionColumn && descPatterns.test(header)) {
      suggestions.descriptionColumn = header;
    }
    if (!suggestions.categoryColumn && categoryPatterns.test(header)) {
      suggestions.categoryColumn = header;
    }
    if (!suggestions.latitudeColumn && latPatterns.test(header)) {
      suggestions.latitudeColumn = header;
    }
    if (!suggestions.longitudeColumn && lngPatterns.test(header)) {
      suggestions.longitudeColumn = header;
    }
    if (!suggestions.typeColumn && typePatterns.test(header)) {
      suggestions.typeColumn = header;
    }
  });

  // If no name column found, use the first column
  if (!suggestions.nameColumn && headers.length > 0) {
    suggestions.nameColumn = headers[0];
  }

  return suggestions;
}

/**
 * Convert CSV data to ImportedZone objects using column mappings
 */
export function csvToZones(data: CSVRow[], mappings: CSVImportOptions): ImportedZone[] {
  return data.map(row => {
    const zone: ImportedZone = {
      name: mappings.nameColumn ? row[mappings.nameColumn] : 'Unnamed Zone',
      address: mappings.addressColumn ? row[mappings.addressColumn] : undefined,
      description: mappings.descriptionColumn ? row[mappings.descriptionColumn] : undefined,
      category: mappings.categoryColumn ? row[mappings.categoryColumn] : undefined,
    };

    if (mappings.latitudeColumn && mappings.longitudeColumn) {
      const lat = parseFloat(row[mappings.latitudeColumn]);
      const lng = parseFloat(row[mappings.longitudeColumn]);

      if (!isNaN(lat) && !isNaN(lng)) {
        zone.latitude = lat;
        zone.longitude = lng;
      }
    }

    if (mappings.typeColumn) {
      const type = row[mappings.typeColumn].toLowerCase();
      if (type === 'point' || type === 'rectangle' || type === 'circle') {
        zone.type = type as ZoneType;
      }
    }

    // Collect additional columns
    if (mappings.additionalColumns && mappings.additionalColumns.length > 0) {
      zone.additionalData = {};
      mappings.additionalColumns.forEach(col => {
        if (row[col]) {
          zone.additionalData![col] = row[col];
        }
      });
    }

    return zone;
  }).filter(zone => zone.name); // Filter out zones without names
}

/**
 * Convert geographic coordinates to canvas coordinates
 */
export function geoToCanvasCoordinates(
  lat: number,
  lng: number,
  geoBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const latRange = geoBounds.maxLat - geoBounds.minLat;
  const lngRange = geoBounds.maxLng - geoBounds.minLng;

  // Normalize to 0-1 range
  const normalizedLng = (lng - geoBounds.minLng) / lngRange;
  const normalizedLat = 1 - (lat - geoBounds.minLat) / latRange; // Invert Y axis

  // Convert to canvas coordinates
  const x = normalizedLng * canvasWidth;
  const y = normalizedLat * canvasHeight;

  return { x, y };
}

/**
 * Convert imported zones to GeocodedZone format for the zone editor
 */
export function prepareZonesForCanvas(
  zones: ImportedZone[],
  geoBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null,
  canvasWidth: number,
  canvasHeight: number
): GeocodedZone[] {
  return zones.map((zone, index) => {
    const geocodedZone: GeocodedZone = {
      id: Math.random().toString(36).substr(2, 9),
      type: zone.type || 'point',
      coordinates: { x: 0, y: 0 }, // Will be updated
      content: {
        title: zone.name,
        description: zone.description || '',
        category: zone.category,
        images: [],
        videos: [],
        links: [],
      },
      address: zone.address,
    };

    // If we have coordinates, convert them to canvas coordinates
    if (zone.latitude && zone.longitude) {
      // Preserve geographic coordinates
      geocodedZone.geoCoords = { lat: zone.latitude, lng: zone.longitude };

      if (geoBounds) {
        // Convert geographic coordinates to canvas coordinates
        const canvasCoords = geoToCanvasCoordinates(
          zone.latitude,
          zone.longitude,
          geoBounds,
          canvasWidth,
          canvasHeight
        );
        geocodedZone.coordinates = canvasCoords;
      } else {
        // If no geoBounds, distribute zones across canvas based on relative positions
        // This is a fallback for when coords are provided but no geographic bounds set
        const normalizedLng = (zone.longitude + 180) / 360; // Normalize to 0-1
        const normalizedLat = (90 - zone.latitude) / 180; // Normalize and flip

        geocodedZone.coordinates = {
          x: normalizedLng * canvasWidth * 0.8 + canvasWidth * 0.1, // Add 10% margin
          y: normalizedLat * canvasHeight * 0.8 + canvasHeight * 0.1,
        };
      }
    } else if (zone.address) {
      // Mark for geocoding if we only have an address
      geocodedZone.needsGeocoding = true;
      // Place temporarily in a grid pattern
      const cols = Math.ceil(Math.sqrt(zones.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      const spacing = 50;
      geocodedZone.coordinates = {
        x: 50 + col * spacing,
        y: 50 + row * spacing,
      };
    } else {
      // No address or coordinates, place in a grid pattern
      const cols = Math.ceil(Math.sqrt(zones.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      const spacing = 50;
      geocodedZone.coordinates = {
        x: 50 + col * spacing,
        y: 50 + row * spacing,
      };
    }

    // Add additional data to description if available
    if (zone.additionalData) {
      const additionalInfo = Object.entries(zone.additionalData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      if (additionalInfo) {
        geocodedZone.content.description = geocodedZone.content.description
          ? `${geocodedZone.content.description}\n\n${additionalInfo}`
          : additionalInfo;
      }
    }

    return geocodedZone;
  });
}

/**
 * Geocode an address using our server-side API to avoid CORS issues
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    const data = await response.json();

    if (response.status === 404) {
      // Address not found is not an error, just log it as info
      console.log(`Address not found: "${address}"`);
      return null;
    }

    if (!response.ok) {
      console.error('Geocoding service error:', response.statusText, data.error);
      return null;
    }

    if (data.error) {
      console.error('Geocoding error:', data.error);
      return null;
    }

    console.log(`✓ Geocoded successfully: "${address}" → [${data.lat}, ${data.lng}]`);
    return {
      lat: data.lat,
      lng: data.lng,
    };
  } catch (error) {
    console.error('Geocoding request failed:', error);
    return null;
  }
}

/**
 * Batch geocode multiple zones with addresses
 * Includes rate limiting to respect Nominatim's usage policy
 */
export async function batchGeocodeZones(
  zones: GeocodedZone[],
  geoBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null,
  canvasWidth: number,
  canvasHeight: number,
  onProgress?: (current: number, total: number, currentAddress?: string) => void
): Promise<GeocodedZone[]> {
  const geocodedZones = [...zones];
  const zonesToGeocode = geocodedZones.filter(z => z.needsGeocoding && z.address);

  if (zonesToGeocode.length === 0) {
    console.log('No addresses need geocoding');
    return geocodedZones;
  }

  console.log(`Starting geocoding for ${zonesToGeocode.length} addresses...`);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < zonesToGeocode.length; i++) {
    const zone = zonesToGeocode[i];

    if (zone.address) {
      // Report progress before starting
      if (onProgress) {
        onProgress(i + 1, zonesToGeocode.length, zone.address);
      }

      // Add delay to respect rate limits (1 request per second)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const coords = await geocodeAddress(zone.address);

      if (coords && geoBounds) {
        const canvasCoords = geoToCanvasCoordinates(
          coords.lat,
          coords.lng,
          geoBounds,
          canvasWidth,
          canvasHeight
        );

        zone.coordinates = canvasCoords;
        zone.geoCoords = { lat: coords.lat, lng: coords.lng }; // Preserve geographic coordinates
        zone.needsGeocoding = false;
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  console.log(`\nGeocoding complete: ✅ ${successCount} successful, ❌ ${failCount} failed (out of ${zonesToGeocode.length} total)`);

  return geocodedZones;
}