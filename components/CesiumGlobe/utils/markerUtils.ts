// markerUtils.ts

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
  fontSize = 20,
}: {
  logoUrl?: string;
  text?: string;
  color?: string;
  borderColor?: string;
  fontSize?: number;
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

  // Use the helper function to measure text width with font loading check
  const textWidth = measureTextWidth(text, fontSize);

  // Create canvas for later use
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true })!;

  // 2. APPLE MAPS STYLE PILL - Calculate dynamic width and layout
  const iconSize = 20; // Small compact icon
  const leftPadding = 14;
  const iconTextGap = 8;
  const rightPadding = 14;
  const dynamicWidth = leftPadding + iconSize + iconTextGap + textWidth + rightPadding;

  // Perfect pill capsule - height must equal border radius for perfect pill shape
  const pillHeight = 44;
  const shadowPadding = 10; // Extra space for soft shadow
  const borderRadius = pillHeight / 2; // Perfect pill = height / 2

  // 3. Generate SVG string with Apple Maps style design
  const adjustedWidth = dynamicWidth + (shadowPadding * 2);
  const adjustedHeight = pillHeight + (shadowPadding * 2);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${adjustedWidth}" height="${adjustedHeight}" fill="none" preserveAspectRatio="xMidYMid meet">
      <defs>
        <!-- Modern glassmorphic shadow -->
        <filter id="modernShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
          <feOffset dx="0" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g transform="translate(${shadowPadding}, ${shadowPadding})">
        <!-- Dark glassmorphic pill background -->
        <rect
          x="0"
          y="0"
          width="${dynamicWidth}"
          height="${pillHeight}"
          rx="${borderRadius}"
          ry="${borderRadius}"
          fill="rgba(0,0,0,0.7)"
          filter="url(#modernShadow)"
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
          stroke="rgba(255,255,255,0.15)"
          stroke-width="1"
        />

        <!-- Icon circle with subtle glow -->
        <circle
          cx="${leftPadding + iconSize / 2}"
          cy="${pillHeight / 2}"
          r="${iconSize / 2}"
          fill="rgba(255,255,255,0.2)"
        />

        <!-- Icon logo if provided -->
        <image
          x="${leftPadding + (iconSize - 16) / 2}"
          y="${(pillHeight - 16) / 2}"
          width="16"
          height="16"
          href="${logoDataUrl}"
          opacity="0.9"
        />

        <!-- White text with subtle opacity -->
        <text
          x="${leftPadding + iconSize + iconTextGap}"
          y="${pillHeight / 2}"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif"
          font-weight="600"
          font-size="${fontSize - 3}"
          fill="rgba(255,255,255,0.9)"
          text-anchor="start"
          dominant-baseline="middle"
          letter-spacing="-0.2"
        >${escapeHtml(text)}</text>
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

  // 3. Draw SVG onto canvas with timeout and error handling
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