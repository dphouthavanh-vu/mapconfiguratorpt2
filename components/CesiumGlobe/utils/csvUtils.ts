import { Landmark } from '../data/types';

/**
 * Parses CSV text into an array of Landmark objects
 * @param csvText The raw CSV text content
 * @returns Array of Landmark objects
 */
export function parseLandmarksCSV(csvText: string): Landmark[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row');
  }

  // Parse header to get column indices
  const header = parseCSVLine(lines[0]);
  const nameIdx = header.indexOf('name');
  const lonIdx = header.indexOf('lon');
  const latIdx = header.indexOf('lat');
  const iconIdx = header.indexOf('icon');
  const colorIdx = header.indexOf('color');
  const contentUrlIdx = header.indexOf('contentUrl');

  // Validate required columns
  if (nameIdx === -1 || lonIdx === -1 || latIdx === -1 || iconIdx === -1) {
    throw new Error('CSV must contain required columns: name, lon, lat, icon');
  }

  // Parse data rows
  const landmarks: Landmark[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length === 0) continue; // Skip empty rows

    const landmark: Landmark = {
      name: row[nameIdx] || '',
      lon: parseFloat(row[lonIdx]) || 0,
      lat: parseFloat(row[latIdx]) || 0,
      icon: row[iconIdx] || '',
    };

    // Add optional fields if they exist and have values
    if (colorIdx !== -1 && row[colorIdx]) {
      landmark.color = row[colorIdx];
    }
    if (contentUrlIdx !== -1 && row[contentUrlIdx]) {
      landmark.contentUrl = row[contentUrlIdx];
    }

    landmarks.push(landmark);
  }

  return landmarks;
}

/**
 * Parses a single CSV line, handling quoted fields
 * @param line The CSV line to parse
 * @returns Array of field values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i += 2;
      } else {
        // Start or end of quoted field
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
    } else {
      // Regular character
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current.trim());

  return result;
}

/**
 * Loads landmarks from a CSV file
 * @param csvUrl The URL/path to the CSV file
 * @returns Promise that resolves to an array of Landmark objects
 */
export async function loadLandmarksFromCSV(csvUrl: string): Promise<Landmark[]> {
  try {
    console.log('📄 Fetching CSV from:', csvUrl);
    const response = await fetch(csvUrl);
    console.log('📄 Fetch response:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log('📄 CSV text loaded, length:', csvText.length);
    console.log('📄 CSV content preview:', csvText.substring(0, 200));
    
    const landmarks = parseLandmarksCSV(csvText);
    console.log('📄 Parsed landmarks:', landmarks.length, 'items');
    console.log('📄 Landmarks details:', landmarks);
    
    return landmarks;
  } catch (error) {
    console.error('❌ Error loading landmarks from CSV:', error);
    throw error;
  }
}