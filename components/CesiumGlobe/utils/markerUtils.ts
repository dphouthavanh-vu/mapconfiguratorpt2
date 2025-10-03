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

  // 2. Calculate dynamic width and text layout
  const logoWidth = 70;
  const leftPadding = 18;
  const textLeftPadding = 12;
  const textRightPadding = 6;
  const playButtonWidth = 43.2;
  const rightPadding = 12;
  const contentWidth = leftPadding + logoWidth + textLeftPadding + textWidth + textRightPadding + playButtonWidth + rightPadding;
  const dynamicWidth = contentWidth;

  // Add padding for stroke width to prevent clipping
  const strokeWidth = 3;
  const padding = strokeWidth / 2; // 1.5px padding on each side
  const verticalPadding = strokeWidth; // Extra padding for top/bottom to prevent clipping on curved edges
  
  // 3. Generate SVG string with dynamic width and static height
  const staticHeight = 110; // Increased height to accommodate the pointer tip at 107.497px
  const adjustedWidth = dynamicWidth + strokeWidth;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${adjustedWidth}" height="${staticHeight}" fill="none" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="blurBackground" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0" result="blurred"/>
        </filter>
        <filter id="markerShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0" result="glow"/>
        </filter>
      </defs>
      <g transform="translate(${padding}, ${padding + verticalPadding / 2})">
        <!-- Background fill to prevent border bleeding -->
        <path
          d="M${dynamicWidth - 39} 0C${dynamicWidth - 17.237} 0 ${dynamicWidth} 17.237 ${dynamicWidth} 39C${dynamicWidth} 60.763 ${dynamicWidth - 17.237} 78 ${dynamicWidth - 39} 78H62.5527L43.3643 107.497L21.6553 74.127C8.83464 67.8785 0 54.7218 0 39C0 17.237 17.237 0 39 0H${dynamicWidth - 39}Z"
          fill="${color}"
          fill-opacity="1.0"
        />
        <!-- Border layer with pointer -->
        <path
          d="M${dynamicWidth - 39} 0C${dynamicWidth - 17.237} 0 ${dynamicWidth} 17.237 ${dynamicWidth} 39C${dynamicWidth} 60.763 ${dynamicWidth - 17.237} 78 ${dynamicWidth - 39} 78H62.5527L43.3643 107.497L21.6553 74.127C8.83464 67.8785 0 54.7218 0 39C0 17.237 17.237 0 39 0H${dynamicWidth - 39}Z"
          fill="none"
          stroke="${borderColor}"
          stroke-width="${strokeWidth}"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <image x="${leftPadding + 5}" y="25%" width="70" height="32" href="${logoDataUrl}"/>
        <text x="${leftPadding + 5 + logoWidth + textLeftPadding}" y="38%" font-family="Roboto Condensed, sans-serif" font-weight="bold" font-size="${fontSize}" fill="#fff" text-anchor="start" dominant-baseline="middle">${escapeHtml(text)}</text>
        <g >
          <path transform="translate(${leftPadding + 5 + logoWidth + textLeftPadding + textWidth + 12}, 24)" d="M16.0004 0.400024C7.0718 0.400024 0.400391 7.0714 0.400391 16C0.400391 24.9286 7.0718 31.6 16.0004 31.6C24.929 31.6 31.6004 24.9286 31.6004 16C31.6004 7.0714 24.929 0.400024 16.0004 0.400024ZM22.5476 16.7236L12.8532 22.6292C12.1638 23.027 11.6004 22.7012 11.6004 21.9056V10.0926C11.6004 9.297 12.1638 8.9712 12.8532 9.369L22.5476 15.2746C23.237 15.6742 23.237 16.3258 22.5476 16.7236Z" fill="white"/>
        </g>
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
  canvas.width = adjustedWidth; // Set canvas width to match the dynamic marker width
  canvas.height = 110; // Full height to accommodate the pointer tip at 107.497px

  await new Promise<void>((resolve, reject) => {
    const img = new window.Image();
    let settled = false;
    const cleanup = () => {
      if (!settled) {
        URL.revokeObjectURL(url);
        settled = true;
      }
    };
    
    console.log('🎨 Starting image load for', logoUrl || 'no logo', 'with URL:', url.substring(0, 50));
    
    img.onload = () => {
      console.log('🎨 Image loaded successfully for', logoUrl || 'no logo');
      // Clear canvas and draw the SVG at natural size
      ctx.clearRect(0, 0, adjustedWidth, 110);
      ctx.drawImage(img, 0, 0, adjustedWidth, 110);
      cleanup();
      resolve();
    };
    img.onerror = (e) => {
      cleanup();
      console.error('❌ SVG image failed to load for', logoUrl || 'no logo', 'Error:', e);
      reject(new Error('SVG image failed to load'));
    };
    
    img.src = url;
    console.log('🎨 Set img.src for', logoUrl || 'no logo');
    
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
  console.log('🎨 Creating cluster marker with color:', color, 'borderColor:', borderColor);
  // Ensure fonts are loaded before measuring text
  await preloadFonts();

  
  // Add padding for stroke width to prevent clipping
  const strokeWidth = 3;
  const padding = strokeWidth / 2; // 1.5px padding on each side
  const verticalPadding = strokeWidth; // Extra padding for top/bottom to prevent clipping on curved edges

  // 2. Calculate dynamic width and text layout
  let dynamicWidth = width;
  let calculatedFontSize = fontSize;
  
  // Calculate dynamic width and font size based on text length
  if (text) {
    const leftPadding = 28;
    const rightPadding = 28;
    const availableTextWidth = 256 - leftPadding - rightPadding;
    
    // Use the helper function to measure text width with font loading check
    const actualTextWidth = measureTextWidth(text, fontSize, 'Arial, sans-serif');
    
    // Calculate optimal font size to fit text in available space
    if (actualTextWidth > availableTextWidth) {
      const scaleFactor = availableTextWidth / actualTextWidth;
      calculatedFontSize = Math.max(fontSize * 0.7, fontSize * scaleFactor);
      
      // Recalculate with adjusted font size
      const adjustedTextWidth = measureTextWidth(text, calculatedFontSize, 'Arial, sans-serif');
      const totalWidth = leftPadding + adjustedTextWidth + rightPadding;
      const minWidth = 200;
      dynamicWidth = Math.max(minWidth, totalWidth);
    } else {
      const totalWidth = leftPadding + actualTextWidth + rightPadding;
      const minWidth = 200;
      dynamicWidth = Math.max(minWidth, totalWidth);
    }
  }
  
  // 3. Generate SVG string with dynamic width and static height
  const staticHeight = 110; // Height from top to bottom pointer (increased to match individual markers)
  const adjustedWidth = dynamicWidth + strokeWidth;
  const adjustedHeight = staticHeight; // No extra padding to keep exact height
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${adjustedWidth}" height="${adjustedHeight}"  fill="none">
      <defs>
        <filter id="clusterBlurBackground" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0" result="blurred"/>
        </filter>
        <filter id="clusterMarkerShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0" result="glow"/>
        </filter>
      </defs>
      <g transform="translate(${padding}, ${padding + verticalPadding / 2})">
        <!-- Glow effect (behind everything) -->
        <path
          d="M${dynamicWidth - 39} 0C${dynamicWidth - 17.237} 0 ${dynamicWidth} 17.237 ${dynamicWidth} 39C${dynamicWidth} 60.763 ${dynamicWidth - 17.237} 78 ${dynamicWidth - 39} 78H62.5527L43.3643 107.497L21.6553 74.127C8.83464 67.8785 0 54.7218 0 39C0 17.237 17.237 0 39 0H${dynamicWidth - 39}Z"
          fill="#FCF060"
          fill-opacity="0.5"
          filter="url(#clusterMarkerShadow)"
        />
        <!-- Background fill to prevent border bleeding -->
        <path
          d="M${dynamicWidth - 39} 0C${dynamicWidth - 17.237} 0 ${dynamicWidth} 17.237 ${dynamicWidth} 39C${dynamicWidth} 60.763 ${dynamicWidth - 17.237} 78 ${dynamicWidth - 39} 78H62.5527L43.3643 107.497L21.6553 74.127C8.83464 67.8785 0 54.7218 0 39C0 17.237 17.237 0 39 0H${dynamicWidth - 39}Z"
          fill="${color}"
          fill-opacity="1.0"
        />
        <!-- Border layer -->
        <path
          d="M${dynamicWidth - 39} 0C${dynamicWidth - 17.237} 0 ${dynamicWidth} 17.237 ${dynamicWidth} 39C${dynamicWidth} 60.763 ${dynamicWidth - 17.237} 78 ${dynamicWidth - 39} 78H62.5527L43.3643 107.497L21.6553 74.127C8.83464 67.8785 0 54.7218 0 39C0 17.237 17.237 0 39 0H${dynamicWidth - 39}Z"
          fill="none"
          stroke="${borderColor}"
          stroke-width="${strokeWidth}"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <text 
          x="${dynamicWidth / 2}" 
          y="39" 
          font-family="Arial, sans-serif" 
          font-weight="bold" 
          font-size="${calculatedFontSize}" 
          fill="#fff" 
          text-anchor="middle" 
          dominant-baseline="middle"
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
  // 3. Draw SVG onto canvas with timeout and error handling
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