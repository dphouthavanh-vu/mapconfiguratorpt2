// markerUtils.ts

// Category color mapping for vibrant markers
function getCategoryColor(category?: string): { bg: string; accent: string } {
  if (!category) {
    return { bg: '#34A853', accent: '#2E7D32' }; // Green default
  }

  const lowerCategory = category.toLowerCase();

  // Education & Schools
  if (lowerCategory.includes('school') || lowerCategory.includes('education') ||
      lowerCategory.includes('k-12') || lowerCategory.includes('usf') ||
      lowerCategory.includes('higher education')) {
    return { bg: '#4285F4', accent: '#1967D2' }; // Google Blue
  }

  // Healthcare & Hospitals
  if (lowerCategory.includes('health') || lowerCategory.includes('hospital') ||
      lowerCategory.includes('medical') || lowerCategory.includes('physician')) {
    return { bg: '#EA4335', accent: '#C5221F' }; // Red
  }

  // Hotels & Hospitality
  if (lowerCategory.includes('hotel') || lowerCategory.includes('resort')) {
    return { bg: '#FBBC04', accent: '#F9AB00' }; // Amber
  }

  // Entertainment & Museums
  if (lowerCategory.includes('entertainment') || lowerCategory.includes('museum')) {
    return { bg: '#9C27B0', accent: '#7B1FA2' }; // Purple
  }

  // BioPharma & Science
  if (lowerCategory.includes('bio') || lowerCategory.includes('pharma')) {
    return { bg: '#00BFA5', accent: '#00897B' }; // Teal
  }

  // Default bright green
  return { bg: '#34A853', accent: '#2E7D32' };
}

// Helper function to escape HTML entities in text
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper function to measure text width with local font
function measureTextWidth(text: string, fontSize: number, fontFamily: string = 'Roboto Condensed, sans-serif'): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true })!;
  
  // Set the font - local fonts should be immediately available
  // Use bold font weight to match the SVG text rendering
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  
  return ctx.measureText(text).width;
}

// Helper function to calculate marker width based on text
export function calculateMarkerWidth(text: string, fontSize: number = 20): number {
  const logoWidth = 70;
  const leftPadding = 18;
  const textLeftPadding = 12;
  const textRightPadding = 6;
  const playButtonWidth = 43.2;
  const rightPadding = 12;
  const strokeWidth = 3;
  
  const textWidth = measureTextWidth(text, fontSize);
  const dynamicWidth = leftPadding + logoWidth + textLeftPadding + textWidth + textRightPadding + (playButtonWidth + rightPadding) * 2;
  
  return dynamicWidth + strokeWidth;
}

// Font preloading function to ensure fonts are loaded
function preloadFonts(): Promise<void> {
  return new Promise((resolve) => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        console.log('✅ Fonts loaded successfully');
        resolve();
      });
    } else {
      // Fallback for browsers that don't support document.fonts
      console.log('⚠️ Font loading API not available, proceeding anyway');
      resolve();
    }
  });
}


export async function createMarkerImage({
  logoUrl,
  text = '',
  color = '#03563F',
  borderColor = '#FCF060',
  fontSize = 22, // Optimized for readability on LED walls and tablets
  category,
}: {
  logoUrl?: string;
  text?: string;
  color?: string;
  borderColor?: string;
  fontSize?: number;
  category?: string;
}): Promise<string> {
  // Ensure fonts are loaded before measuring text
  await preloadFonts();
  // 1. Load logo content if provided
  let logoDataUrl = '';
  if (logoUrl) {
    try {
      const response = await fetch(logoUrl)
      const blob = await response.blob();
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      console.log('🎨 Loaded image as data URL');

    } catch (error) {
      console.warn('Failed to load logo image:', error);
    }
  }

  // Truncate text if too long to prevent texture atlas overflow
  const maxTextLength = 25; // Maximum characters to prevent huge textures
  const truncatedText = text.length > maxTextLength ? text.substring(0, maxTextLength) + '...' : text;

  // Use the helper function to measure text width with font loading check
  const textWidth = measureTextWidth(truncatedText, fontSize);

  // Create canvas for later use
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true })!;

  // Get vibrant colors based on category
  const colors = getCategoryColor(category);

  // 2. VIBRANT PILL DESIGN - Calculate dynamic width and layout
  // Optimized for accessibility on LED walls and touchscreens (300+ markers)
  const iconSize = 28; // Larger for better visibility
  const leftPadding = 16;
  const iconTextGap = 12;
  const rightPadding = 18;
  const dynamicWidth = leftPadding + iconSize + iconTextGap + textWidth + rightPadding;

  // Perfect pill capsule - height must equal border radius for perfect pill shape
  const pillHeight = 52; // Taller for readability at distance
  const shadowPadding = 10; // Enhanced shadow for depth
  const borderRadius = pillHeight / 2; // Perfect pill = height / 2

  // 3. Generate SVG string with modern, high-quality design
  const adjustedWidth = dynamicWidth + (shadowPadding * 2);
  const adjustedHeight = pillHeight + (shadowPadding * 2);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${adjustedWidth}" height="${adjustedHeight}" viewBox="0 0 ${adjustedWidth} ${adjustedHeight}" fill="none" preserveAspectRatio="xMidYMid meet">
      <defs>
        <!-- Enhanced multi-layer shadow for depth and visibility -->
        <filter id="modernShadow" x="-50%" y="-50%" width="200%" height="200%">
          <!-- Large soft shadow for depth -->
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur1"/>
          <feOffset in="blur1" dx="0" dy="3" result="offset1"/>
          <feComponentTransfer in="offset1" result="shadow1">
            <feFuncA type="linear" slope="0.18"/>
          </feComponentTransfer>

          <!-- Medium shadow for structure -->
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur2"/>
          <feOffset in="blur2" dx="0" dy="2" result="offset2"/>
          <feComponentTransfer in="offset2" result="shadow2">
            <feFuncA type="linear" slope="0.25"/>
          </feComponentTransfer>

          <!-- Tight shadow for crisp definition -->
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur3"/>
          <feOffset in="blur3" dx="0" dy="1" result="offset3"/>
          <feComponentTransfer in="offset3" result="shadow3">
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>

          <feMerge>
            <feMergeNode in="shadow1"/>
            <feMergeNode in="shadow2"/>
            <feMergeNode in="shadow3"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <!-- Subtle gradient for pill background -->
        <linearGradient id="pillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgb(255,255,255);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgb(250,250,252);stop-opacity:1" />
        </linearGradient>

        <!-- Icon gradient -->
        <radialGradient id="iconGradient-${colors.bg.replace('#', '')}">
          <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.accent};stop-opacity:1" />
        </radialGradient>
      </defs>

      <g transform="translate(${shadowPadding}, ${shadowPadding})">
        <!-- Pill background with gradient and shadow -->
        <rect
          x="0"
          y="0"
          width="${dynamicWidth}"
          height="${pillHeight}"
          rx="${borderRadius}"
          ry="${borderRadius}"
          fill="url(#pillGradient)"
          filter="url(#modernShadow)"
          shape-rendering="geometricPrecision"
        />

        <!-- Subtle inner highlight for depth -->
        <rect
          x="0.5"
          y="0.5"
          width="${dynamicWidth - 1}"
          height="${pillHeight - 1}"
          rx="${borderRadius - 0.5}"
          ry="${borderRadius - 0.5}"
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          stroke-width="1"
          shape-rendering="geometricPrecision"
        />

        <!-- Colored accent border -->
        <rect
          x="1"
          y="1"
          width="${dynamicWidth - 2}"
          height="${pillHeight - 2}"
          rx="${borderRadius - 1}"
          ry="${borderRadius - 1}"
          fill="none"
          stroke="${colors.accent}"
          stroke-width="2"
          shape-rendering="geometricPrecision"
        />

        <!-- Icon circle with gradient -->
        <circle
          cx="${leftPadding + iconSize / 2}"
          cy="${pillHeight / 2}"
          r="${iconSize / 2}"
          fill="url(#iconGradient-${colors.bg.replace('#', '')})"
          shape-rendering="geometricPrecision"
        />

        <!-- Inner circle highlight -->
        <circle
          cx="${leftPadding + iconSize / 2}"
          cy="${pillHeight / 2}"
          r="${iconSize / 2 - 1.5}"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          stroke-width="1"
          shape-rendering="geometricPrecision"
        />

        <!-- Icon logo if provided -->
        <image
          x="${leftPadding + (iconSize - 18) / 2}"
          y="${(pillHeight - 18) / 2}"
          width="18"
          height="18"
          href="${logoDataUrl}"
          opacity="1.0"
          image-rendering="optimizeQuality"
        />

        <!-- High-quality text rendering - optimized for LED walls -->
        <text
          x="${leftPadding + iconSize + iconTextGap}"
          y="${pillHeight / 2}"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif"
          font-weight="650"
          font-size="${fontSize}"
          fill="rgba(0,0,0,0.98)"
          text-anchor="start"
          dominant-baseline="middle"
          letter-spacing="-0.2"
          text-rendering="geometricPrecision"
        >${escapeHtml(truncatedText)}</text>
      </g>
    </svg>
  `

  // Debug: Log the SVG string to help diagnose image load errors
  console.debug('Generated SVG string for marker:', svg);

  // Clean up any escaped quotes in the SVG string (should not be necessary, but ensures valid SVG)
  const cleanSvg = svg.trim();
  console.log('🎨 cleanSvg for', logoUrl || 'no logo', ':', cleanSvg.substring(0, 200));
  
  // 2. Convert SVG string to data URL
  const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);
  console.log('🎨 Created blob URL for', logoUrl || 'no logo', ':', url.substring(0, 50));

  // 3. Draw SVG onto canvas at conservative resolution
  // Use 1x for large datasets (300+ markers) to prevent texture atlas overflow
  const maxDimension = Math.max(adjustedWidth, adjustedHeight);
  const maxScale = Math.min(1.0, 3000 / maxDimension); // Ultra conservative for 300+ marker sets
  const scale = maxScale;

  canvas.width = adjustedWidth * scale;
  canvas.height = adjustedHeight * scale;
  ctx.scale(scale, scale);

  await new Promise<void>((resolve, reject) => {
    const img = new window.Image();
    let settled = false;
    const cleanup = () => {
      if (!settled) {
        URL.revokeObjectURL(url);
        settled = true;
      }
    };

    console.log('🎨 Starting Apple Maps style marker load for', logoUrl || 'no logo');

    img.onload = () => {
      console.log('✅ Apple Maps style marker loaded successfully for', logoUrl || 'no logo');
      // Clear canvas and draw the SVG at natural size
      ctx.clearRect(0, 0, adjustedWidth, adjustedHeight);
      ctx.drawImage(img, 0, 0, adjustedWidth, adjustedHeight);
      cleanup();
      resolve();
    };
    img.onerror = (e) => {
      cleanup();
      console.error('❌ SVG image failed to load for', logoUrl || 'no logo', 'Error:', e);
      reject(new Error('SVG image failed to load'));
    };

    img.src = url;

    setTimeout(() => {
      if (!settled) {
        cleanup();
        console.error('⏰ SVG image load timed out for', logoUrl || 'no logo');
        reject(new Error('SVG image load timed out'));
      }
    }, 10000); // 10 seconds
  });

  // 4. Return as data URL
  return canvas.toDataURL();
}

export async function createClusterMarkerImage({
  text,
  color = '#03563F',
  borderColor = '#FCF060',
  width = 300,
  fontSize = 20,
}: {
  text: string;
  color?: string;
  borderColor?: string;
  width?: number;
  fontSize?: number;
}): Promise<string> {
  console.log('🎨 Creating Apple Maps cluster marker with color:', color);
  // Ensure fonts are loaded before measuring text
  await preloadFonts();

  // 2. APPLE MAPS STYLE CLUSTER - Calculate dynamic width
  let dynamicWidth = width;
  let calculatedFontSize = fontSize;

  // Calculate dynamic width and font size based on text length
  if (text) {
    const leftPadding = 32;
    const rightPadding = 32;
    const availableTextWidth = 256 - leftPadding - rightPadding;

    // Use the helper function to measure text width with font loading check
    const actualTextWidth = measureTextWidth(text, fontSize, 'Inter, -apple-system, system-ui, sans-serif');

    // Calculate optimal font size to fit text in available space
    if (actualTextWidth > availableTextWidth) {
      const scaleFactor = availableTextWidth / actualTextWidth;
      calculatedFontSize = Math.max(fontSize * 0.7, fontSize * scaleFactor);

      // Recalculate with adjusted font size
      const adjustedTextWidth = measureTextWidth(text, calculatedFontSize, 'Inter, -apple-system, system-ui, sans-serif');
      const totalWidth = leftPadding + adjustedTextWidth + rightPadding;
      const minWidth = 160;
      dynamicWidth = Math.max(minWidth, totalWidth);
    } else {
      const totalWidth = leftPadding + actualTextWidth + rightPadding;
      const minWidth = 160;
      dynamicWidth = Math.max(minWidth, totalWidth);
    }
  }

  // Perfect pill for clusters - slightly larger
  const pillHeight = 50; // Slightly taller for clusters
  const shadowPadding = 12; // Extra space for enhanced shadow
  const borderRadius = pillHeight / 2; // Perfect pill

  // 3. Generate SVG string with pill design
  const adjustedWidth = dynamicWidth + (shadowPadding * 2);
  const adjustedHeight = pillHeight + (shadowPadding * 2);
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${adjustedWidth}" height="${adjustedHeight}" fill="none" preserveAspectRatio="xMidYMid meet">
      <defs>
        <!-- Enhanced modern cluster shadow -->
        <filter id="clusterModernShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="7"/>
          <feOffset dx="0" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.35"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g transform="translate(${shadowPadding}, ${shadowPadding})">
        <!-- Dark glassmorphic pill shape for cluster -->
        <rect
          x="0"
          y="0"
          width="${dynamicWidth}"
          height="${pillHeight}"
          rx="${borderRadius}"
          ry="${borderRadius}"
          fill="rgba(0,0,0,0.75)"
          filter="url(#clusterModernShadow)"
        />

        <!-- Subtle white border -->
        <rect
          x="0"
          y="0"
          width="${dynamicWidth}"
          height="${pillHeight}"
          rx="${borderRadius}"
          ry="${borderRadius}"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          stroke-width="1"
        />

        <!-- Count badge (left side) - accent color for clusters -->
        <circle
          cx="18"
          cy="${pillHeight / 2}"
          r="12"
          fill="rgba(239,68,68,0.9)"
        />

        <!-- Badge number in white -->
        <text
          x="18"
          y="${pillHeight / 2}"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif"
          font-weight="700"
          font-size="13"
          fill="#fff"
          text-anchor="middle"
          dominant-baseline="middle"
        >${escapeHtml(text.split(' ')[0])}</text>

        <!-- Cluster text in white -->
        <text
          x="${dynamicWidth / 2}"
          y="${pillHeight / 2}"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif"
          font-weight="600"
          font-size="${calculatedFontSize}"
          fill="rgba(255,255,255,0.9)"
          text-anchor="middle"
          dominant-baseline="middle"
          letter-spacing="-0.2"
        >${escapeHtml(text)}</text>
      </g>
    </svg>
  `;

  // Debug: Log the SVG string to help diagnose image load errors
  console.debug('Generated SVG string for marker:', svg);

  // Clean up any escaped quotes in the SVG string (should not be necessary, but ensures valid SVG)
  const cleanSvg = svg.trim();
  
  // 2. Convert SVG string to data URL
  const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);
  // 4. Draw SVG onto canvas with timeout and error handling
  const canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d', { alpha: true })!;

  canvas.width = adjustedWidth;
  canvas.height = adjustedHeight;

  await new Promise<void>((resolve, reject) => {
    const img = new window.Image();
    let settled = false;
    const cleanup = () => {
      if (!settled) {
        URL.revokeObjectURL(url);
        settled = true;
      }
    };
    
    
    img.onload = () => {
      // Draw the SVG at its natural size
      ctx.drawImage(img, 0, 0, adjustedWidth, adjustedHeight);
      cleanup();
      resolve();
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('SVG image failed to load'));
    };
    
    img.src = url;
    
    setTimeout(() => {
      if (!settled) {
        cleanup();
        reject(new Error('SVG image load timed out'));
      }
    }, 10000); // 10 seconds
  });

  // 4. Return as data URL
  return canvas.toDataURL();
}

/**
 * Converts YouTube watch URLs to embed URLs to avoid X-Frame-Options issues
 * @param url The URL to process
 * @returns The processed URL (YouTube watch URLs converted to embed format)
 */
export function processContentUrl(url: string): string {
  if (!url) return url;
  
  // Check if it's a YouTube watch URL (various formats)
  const youtubeWatchRegex = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/;
  const youtubeShortRegex = /^https?:\/\/(www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/;
  const youtubeEmbedRegex = /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/;
  
  let match = url.match(youtubeWatchRegex);
  if (match) {
    const videoId = match[2];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  match = url.match(youtubeShortRegex);
  if (match) {
    const videoId = match[2];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // If it's already an embed URL, return as is
  if (youtubeEmbedRegex.test(url)) {
    return url;
  }
  
  // Return the original URL if it's not a YouTube URL
  return url;
}