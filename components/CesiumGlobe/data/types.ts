export interface Landmark {
  name: string;
  lon: number;
  lat: number;
  icon: string;
  color?: string;   // New: marker background color
  contentUrl?: string; // Optional: web page URL for fullscreen modal (replaces videoUrl)
  height?: number;  // Optional: height above ground level in meters
} 