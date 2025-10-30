/**
 * Custom 3D marker element for Google Maps 3D
 * Creates modern, minimalistic pin markers with clean design
 */

export interface CustomMarkerOptions {
  label: string;
  color: string;          // Background color
  accentColor: string;    // Border/accent color (darker shade)
  textColor?: string;
  showLabel: boolean;
}

/**
 * Helper to escape HTML entities in text
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Measure text width for dynamic sizing
 */
function measureTextWidth(text: string, fontSize: number): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true })!;
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;
  return ctx.measureText(text).width;
}

/**
 * Creates a modern, minimalistic pin marker
 * Features:
 * - Clean pin shape with circular top
 * - Flat design with subtle shadow
 * - Text label positioned below pin
 * - Smooth transitions and hover effects
 */
export function createCustomMarkerElement(options: CustomMarkerOptions): SVGSVGElement {
  const { label, color, showLabel } = options;

  // Truncate text if too long
  const maxTextLength = 22;
  const truncatedText = label.length > maxTextLength ? label.substring(0, maxTextLength) + '...' : label;

  // Pin dimensions - clean and minimal
  const pinWidth = 28;
  const pinHeight = 40;
  const circleRadius = pinWidth / 2;
  const tipHeight = 12; // Height of the pointed tip

  // Text settings
  const fontSize = 12;
  const textPadding = 6;
  const textWidth = showLabel && label ? measureTextWidth(truncatedText, fontSize) : 0;
  const textBoxWidth = showLabel && label ? textWidth + (textPadding * 2) : 0;
  const textBoxHeight = showLabel && label ? 22 : 0;
  const textGap = showLabel && label ? 4 : 0;

  // Total SVG dimensions
  const shadowPadding = 8;
  const svgWidth = Math.max(pinWidth, textBoxWidth) + (shadowPadding * 2);
  const svgHeight = pinHeight + textGap + textBoxHeight + (shadowPadding * 2);

  // Center pin horizontally
  const pinX = (svgWidth - pinWidth) / 2;
  const pinY = shadowPadding;

  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', svgWidth.toString());
  svg.setAttribute('height', svgHeight.toString());
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  svg.setAttribute('fill', 'none');
  svg.style.cssText = 'cursor: pointer; transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: auto;';

  // Create defs for filters and gradients
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

  // Shadow filter - subtle and modern
  const shadowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  const filterId = `shadow-${Math.random().toString(36).substr(2, 9)}`;
  shadowFilter.setAttribute('id', filterId);
  shadowFilter.setAttribute('x', '-50%');
  shadowFilter.setAttribute('y', '-50%');
  shadowFilter.setAttribute('width', '200%');
  shadowFilter.setAttribute('height', '200%');

  const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
  blur.setAttribute('in', 'SourceAlpha');
  blur.setAttribute('stdDeviation', '3');

  const offset = document.createElementNS('http://www.w3.org/2000/svg', 'feOffset');
  offset.setAttribute('dy', '2');

  const transfer = document.createElementNS('http://www.w3.org/2000/svg', 'feComponentTransfer');
  const funcA = document.createElementNS('http://www.w3.org/2000/svg', 'feFuncA');
  funcA.setAttribute('type', 'linear');
  funcA.setAttribute('slope', '0.2');
  transfer.appendChild(funcA);

  const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
  const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  mergeNode2.setAttribute('in', 'SourceGraphic');
  merge.appendChild(mergeNode1);
  merge.appendChild(mergeNode2);

  shadowFilter.appendChild(blur);
  shadowFilter.appendChild(offset);
  shadowFilter.appendChild(transfer);
  shadowFilter.appendChild(merge);
  defs.appendChild(shadowFilter);

  svg.appendChild(defs);

  // Create pin shape using a path - circle top with pointed bottom
  const circleCenterY = pinY + circleRadius;
  const tipY = pinY + pinHeight;
  const pinCenterX = pinX + circleRadius;

  // Path: circle top + pointed bottom
  const pinPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  // Create the pin outline path
  const pathData = `
    M ${pinCenterX} ${tipY}
    L ${pinX + pinWidth * 0.25} ${circleCenterY + circleRadius * 0.5}
    A ${circleRadius} ${circleRadius} 0 1 1 ${pinX + pinWidth * 0.75} ${circleCenterY + circleRadius * 0.5}
    Z
  `.trim().replace(/\s+/g, ' ');

  pinPath.setAttribute('d', pathData);
  pinPath.setAttribute('fill', color);
  pinPath.setAttribute('filter', `url(#${filterId})`);
  svg.appendChild(pinPath);

  // Inner white dot for contrast
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('cx', pinCenterX.toString());
  dot.setAttribute('cy', circleCenterY.toString());
  dot.setAttribute('r', '4');
  dot.setAttribute('fill', 'white');
  dot.setAttribute('opacity', '0.9');
  svg.appendChild(dot);

  // Text label below pin (if shown)
  if (showLabel && label) {
    const textX = svgWidth / 2;
    const textY = pinY + pinHeight + textGap;

    // Text background box
    const textBoxX = (svgWidth - textBoxWidth) / 2;
    const textBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    textBox.setAttribute('x', textBoxX.toString());
    textBox.setAttribute('y', textY.toString());
    textBox.setAttribute('width', textBoxWidth.toString());
    textBox.setAttribute('height', textBoxHeight.toString());
    textBox.setAttribute('rx', '4');
    textBox.setAttribute('fill', 'rgba(0, 0, 0, 0.85)');
    textBox.setAttribute('filter', `url(#${filterId})`);
    svg.appendChild(textBox);

    // Text element
    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textElement.setAttribute('x', textX.toString());
    textElement.setAttribute('y', (textY + textBoxHeight / 2).toString());
    textElement.setAttribute('font-family', "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif");
    textElement.setAttribute('font-weight', '600');
    textElement.setAttribute('font-size', fontSize.toString());
    textElement.setAttribute('fill', 'white');
    textElement.setAttribute('text-anchor', 'middle');
    textElement.setAttribute('dominant-baseline', 'middle');
    textElement.setAttribute('letter-spacing', '0');
    textElement.textContent = escapeHtml(truncatedText);
    svg.appendChild(textElement);
  }

  // Add hover effects
  svg.addEventListener('mouseenter', () => {
    svg.style.transform = 'scale(1.1) translateY(-2px)';
  });
  svg.addEventListener('mouseleave', () => {
    svg.style.transform = 'scale(1) translateY(0)';
  });

  return svg;
}
