// Geographic bounds for canvas definition
export interface GeographicBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Canvas configuration
export interface CanvasConfig {
  width: number;
  height: number;
  coordinateSystem: 'geographic' | 'pixel';
  scale?: number;
}

// Zone coordinates for different shape types
export interface PointCoordinates {
  x: number;
  y: number;
}

export interface RectangleCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleCoordinates {
  x: number;
  y: number;
  radius: number;
}

export interface PolygonCoordinates {
  points: PointCoordinates[];
}

export type ZoneCoordinates =
  | PointCoordinates
  | RectangleCoordinates
  | CircleCoordinates
  | PolygonCoordinates;

// Zone content
export interface ZoneContent {
  title: string;
  description?: string;
  images?: string[]; // Array of image URLs or base64 data
  videos?: string[]; // Array of video URLs
  links?: { label: string; url: string }[];
}

// Zone style
export interface ZoneStyle {
  color?: string;
  borderColor?: string;
  opacity?: number;
  icon?: string;
}

// Zone types
export type ZoneType = 'point' | 'rectangle' | 'circle' | 'polygon';

// Full zone object (client-side)
export interface Zone {
  id: string;
  mapId: string;
  type: ZoneType;
  coordinates: ZoneCoordinates;
  content: ZoneContent;
  style?: ZoneStyle;
  createdAt: Date;
  updatedAt: Date;
}

// Full map object (client-side)
export interface InteractiveMap {
  id: string;
  title: string;
  description?: string;
  geographicBounds?: GeographicBounds;
  canvasConfig: CanvasConfig;
  imageUrl?: string;
  useBaseMap: boolean;
  published: boolean;
  zones: Zone[];
  createdAt: Date;
  updatedAt: Date;
}
