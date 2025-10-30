import { GeographicBounds, PointCoordinates, RectangleCoordinates, CircleCoordinates } from './types';

/**
 * Convert latitude to Web Mercator Y coordinate (0-1 range)
 */
function latToMercatorY(lat: number): number {
  const latRad = (lat * Math.PI) / 180;
  const mercatorY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return mercatorY;
}

/**
 * Convert Web Mercator Y coordinate back to latitude
 */
function mercatorYToLat(mercatorY: number): number {
  const latRad = 2 * Math.atan(Math.exp(mercatorY)) - Math.PI / 2;
  const lat = (latRad * 180) / Math.PI;
  return lat;
}

/**
 * Converts pixel coordinates to geographic coordinates (lat/lng) using Web Mercator projection
 * @param x Pixel x coordinate
 * @param y Pixel y coordinate
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @param bounds Geographic bounds of the canvas area
 * @returns Object with lat and lng
 */
export function pixelToGeo(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  bounds: GeographicBounds
): { lat: number; lng: number } {
  // Calculate longitude (x-axis) - longitude is linear in Web Mercator
  const lng = bounds.minLng + (x / canvasWidth) * (bounds.maxLng - bounds.minLng);

  // Calculate latitude (y-axis) using Web Mercator projection
  // y=0 is top, but lat increases going north (up)
  const relativeY = y / canvasHeight; // 0 at top, 1 at bottom

  // Convert bounds to Mercator Y coordinates
  const minMercatorY = latToMercatorY(bounds.minLat);
  const maxMercatorY = latToMercatorY(bounds.maxLat);

  // Interpolate in Mercator space (note: maxLat is at y=0, minLat is at y=canvasHeight)
  const mercatorY = maxMercatorY - relativeY * (maxMercatorY - minMercatorY);

  // Convert back to latitude
  const lat = mercatorYToLat(mercatorY);

  return { lat, lng };
}

/**
 * Converts geographic coordinates (lat/lng) to pixel coordinates using Web Mercator projection
 * @param lat Latitude
 * @param lng Longitude
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @param bounds Geographic bounds of the canvas area
 * @returns Object with x and y pixel coordinates
 */
export function geoToPixel(
  lat: number,
  lng: number,
  canvasWidth: number,
  canvasHeight: number,
  bounds: GeographicBounds
): { x: number; y: number } {
  // Calculate x from longitude - longitude is linear in Web Mercator
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * canvasWidth;

  // Calculate y from latitude using Web Mercator projection
  // Convert bounds to Mercator Y coordinates
  const minMercatorY = latToMercatorY(bounds.minLat);
  const maxMercatorY = latToMercatorY(bounds.maxLat);

  // Convert lat to Mercator Y
  const mercatorY = latToMercatorY(lat);

  // Calculate relative position in Mercator space (0 at top/maxLat, 1 at bottom/minLat)
  const relativeY = (maxMercatorY - mercatorY) / (maxMercatorY - minMercatorY);

  // Convert to pixel coordinates
  const y = relativeY * canvasHeight;

  return { x, y };
}

/**
 * Converts point coordinates to geographic coordinates
 */
export function pointToGeo(
  coords: PointCoordinates,
  canvasWidth: number,
  canvasHeight: number,
  bounds: GeographicBounds
): { lat: number; lng: number } {
  return pixelToGeo(coords.x, coords.y, canvasWidth, canvasHeight, bounds);
}

/**
 * Converts rectangle coordinates to geographic coordinates (center point)
 */
export function rectangleToGeo(
  coords: RectangleCoordinates,
  canvasWidth: number,
  canvasHeight: number,
  bounds: GeographicBounds
): { lat: number; lng: number } {
  // Calculate center point of rectangle
  const centerX = coords.x + coords.width / 2;
  const centerY = coords.y + coords.height / 2;

  return pixelToGeo(centerX, centerY, canvasWidth, canvasHeight, bounds);
}

/**
 * Converts circle coordinates to geographic coordinates (center point)
 */
export function circleToGeo(
  coords: CircleCoordinates,
  canvasWidth: number,
  canvasHeight: number,
  bounds: GeographicBounds
): { lat: number; lng: number } {
  return pixelToGeo(coords.x, coords.y, canvasWidth, canvasHeight, bounds);
}

/**
 * Converts any zone coordinates to geographic coordinates
 */
export function zoneToGeo(
  coordinates: PointCoordinates | RectangleCoordinates | CircleCoordinates,
  zoneType: string,
  canvasWidth: number,
  canvasHeight: number,
  bounds: GeographicBounds
): { lat: number; lng: number } {
  switch (zoneType) {
    case 'point':
      return pointToGeo(coordinates as PointCoordinates, canvasWidth, canvasHeight, bounds);
    case 'rectangle':
      return rectangleToGeo(coordinates as RectangleCoordinates, canvasWidth, canvasHeight, bounds);
    case 'circle':
      return circleToGeo(coordinates as CircleCoordinates, canvasWidth, canvasHeight, bounds);
    default:
      // Default to point conversion
      return pixelToGeo(
        (coordinates as PointCoordinates).x,
        (coordinates as PointCoordinates).y,
        canvasWidth,
        canvasHeight,
        bounds
      );
  }
}
