import { GeographicBounds, PointCoordinates, RectangleCoordinates, CircleCoordinates } from './types';

/**
 * Converts pixel coordinates to geographic coordinates (lat/lng)
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
  // Calculate longitude (x-axis)
  const lng = bounds.minLng + (x / canvasWidth) * (bounds.maxLng - bounds.minLng);

  // Calculate latitude (y-axis) - note: y=0 is top, but lat increases going north (up)
  const lat = bounds.maxLat - (y / canvasHeight) * (bounds.maxLat - bounds.minLat);

  return { lat, lng };
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
