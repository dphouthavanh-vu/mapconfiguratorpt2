/**
 * Color utilities for zone markers
 * Generates category-based colors and determines appropriate text colors
 */

// Apple Maps-style category color palette with accent colors
interface CategoryColor {
  bg: string;      // Background/main color
  accent: string;  // Accent/border color (darker shade)
}

const CATEGORY_COLORS: Record<string, CategoryColor> = {
  // Education & Schools - Google Blue
  school: { bg: '#4285F4', accent: '#1967D2' },
  education: { bg: '#4285F4', accent: '#1967D2' },
  library: { bg: '#4285F4', accent: '#1967D2' },

  // Healthcare & Hospitals - Red
  hospital: { bg: '#EA4335', accent: '#C5221F' },
  healthcare: { bg: '#EA4335', accent: '#C5221F' },
  medical: { bg: '#EA4335', accent: '#C5221F' },

  // Hotels & Hospitality - Amber
  hotel: { bg: '#FBBC04', accent: '#F9AB00' },
  resort: { bg: '#FBBC04', accent: '#F9AB00' },

  // Entertainment & Museums - Purple
  entertainment: { bg: '#9C27B0', accent: '#7B1FA2' },
  museum: { bg: '#9C27B0', accent: '#7B1FA2' },
  theater: { bg: '#9C27B0', accent: '#7B1FA2' },
  gallery: { bg: '#9C27B0', accent: '#7B1FA2' },

  // BioPharma & Science - Teal
  bio: { bg: '#00BFA5', accent: '#00897B' },
  pharma: { bg: '#00BFA5', accent: '#00897B' },
  science: { bg: '#00BFA5', accent: '#00897B' },

  // Restaurants & Food - Orange (using similar to hotel for now)
  restaurant: { bg: '#FBBC04', accent: '#F9AB00' },
  cafe: { bg: '#FBBC04', accent: '#F9AB00' },

  // Parks & Recreation - Green
  park: { bg: '#34A853', accent: '#2E7D32' },
  beach: { bg: '#34A853', accent: '#2E7D32' },

  // Shopping - Green default
  shop: { bg: '#34A853', accent: '#2E7D32' },

  // Default - Green
  default: { bg: '#34A853', accent: '#2E7D32' },
};

/**
 * Get color for a category (case-insensitive)
 * Returns both background and accent color
 */
export function getCategoryColor(category?: string): CategoryColor {
  if (!category) return CATEGORY_COLORS.default;

  const normalized = category.toLowerCase().trim();

  // Check if exact match exists
  if (CATEGORY_COLORS[normalized]) {
    return CATEGORY_COLORS[normalized];
  }

  // Check if any key contains the category string
  const matchedKey = Object.keys(CATEGORY_COLORS).find(key =>
    normalized.includes(key) || key.includes(normalized)
  );

  return matchedKey ? CATEGORY_COLORS[matchedKey] : CATEGORY_COLORS.default;
}

/**
 * Generate a color based on category name using HSL
 * For categories not in the predefined palette
 * Returns both background and accent colors
 */
export function generateColorFromString(str: string): CategoryColor {
  // Simple hash function to generate consistent hue from string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  const hue = Math.abs(hash % 360);
  const bg = `hsl(${hue}, 70%, 55%)`; // Vibrant, saturated colors
  const accent = `hsl(${hue}, 70%, 40%)`; // Darker shade for accent

  return { bg, accent };
}

/**
 * Determine if a color is light or dark
 * Returns true if the color is light (needs dark text)
 */
export function isLightColor(hexColor: string): boolean {
  // Handle HSL colors
  if (hexColor.startsWith('hsl')) {
    const match = hexColor.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
    if (match) {
      const lightness = parseInt(match[3]);
      return lightness > 60;
    }
  }

  // Handle hex colors
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

/**
 * Get appropriate text color (white or dark) based on background color
 */
export function getContrastTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#1f2937' : '#ffffff';
}

/**
 * Get marker colors with fallback logic:
 * 1. Use zone's style.color if available (converts to CategoryColor)
 * 2. Use category-based color
 * 3. Use default color
 * Returns both background and accent colors
 */
export function getMarkerColor(styleColor?: string, category?: string): CategoryColor {
  // If custom style color provided, generate accent
  if (styleColor) {
    const accentColor = isLightColor(styleColor)
      ? adjustBrightness(styleColor, -20) // Darker for light colors
      : adjustBrightness(styleColor, -15); // Slightly darker for dark colors
    return { bg: styleColor, accent: accentColor };
  }

  if (category) {
    const categoryColor = getCategoryColor(category);
    // If it's not the default, return it
    if (categoryColor !== CATEGORY_COLORS.default) {
      return categoryColor;
    }
    // Generate unique color for unknown categories
    return generateColorFromString(category);
  }

  return CATEGORY_COLORS.default;
}

/**
 * Adjust color brightness
 */
function adjustBrightness(hexColor: string, percent: number): string {
  const hex = hexColor.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + (percent * 255 / 100)));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + (percent * 255 / 100)));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + (percent * 255 / 100)));

  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

/**
 * Add alpha transparency to a hex color
 */
export function addAlpha(hexColor: string, alpha: number): string {
  // Handle HSL colors
  if (hexColor.startsWith('hsl')) {
    return hexColor.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
  }

  // Handle hex colors
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
