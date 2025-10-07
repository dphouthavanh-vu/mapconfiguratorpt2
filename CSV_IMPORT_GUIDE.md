# CSV Import Guide for Map Zones

## Overview

The Map Configurator now supports bulk importing zones from CSV files. This feature allows you to quickly add multiple locations to your map from existing datasets.

## Features

- 📁 **CSV File Upload** - Drag & drop or browse to upload CSV files
- 🗺️ **Smart Column Mapping** - Automatically detects common column names
- 📍 **Geocoding Support** - Converts addresses to map coordinates
- 🔍 **Preview Before Import** - Review zones before adding to map
- 🎯 **Coordinate Support** - Direct import if latitude/longitude provided

## CSV File Format

Your CSV file should include the following columns (column names are flexible):

### Required Columns
- **Name/Title** - The name of the location or zone

### Optional Columns
- **Address** - Street address for geocoding
- **Description** - Additional information about the zone
- **Latitude** - Decimal latitude coordinate
- **Longitude** - Decimal longitude coordinate
- **Type** - Zone type (point, rectangle, circle)

## Sample CSV Files

Two sample CSV files are provided in the `public` folder:

1. **sample-zones.csv** - Includes coordinates (no geocoding needed)
2. **sample-zones-addresses-only.csv** - Address-only (requires geocoding)

### Example Format (with coordinates):
```csv
Name,Address,Description,Latitude,Longitude,Type
"Central Park","Central Park, New York, NY","Large public park",40.7829,-73.9654,point
"Times Square","Times Square, Manhattan, NY","Commercial intersection",40.7580,-73.9855,point
```

### Example Format (address only):
```csv
Name,Address,Description
"Apple Store","767 5th Ave, New York, NY 10153","Iconic glass cube store"
"Yankee Stadium","1 E 161st St, The Bronx, NY","Home of the Yankees"
```

## How to Use

1. **Navigate to Map Creation**
   - Go to `/create` and proceed to the zone editing step

2. **Open CSV Import**
   - Click the "Import from CSV" button in the Add Zone panel

3. **Upload Your File**
   - Drag & drop or click to browse for your CSV file

4. **Map Columns**
   - The system will auto-detect common column names
   - Review and adjust column mappings if needed
   - Select which CSV columns map to zone properties

5. **Preview Import**
   - Review the zones that will be imported
   - Check if addresses need geocoding

6. **Import Zones**
   - Click "Import X Zones" to add them to your map
   - Zones with addresses will be geocoded automatically
   - Progress indicator shows geocoding status

## Column Name Detection

The system automatically recognizes common column name patterns:

### Name Columns
- name, title, place, location, site, venue, business

### Address Columns
- address, location, street, addr, full_address

### Description Columns
- description, desc, details, info, summary, about, notes

### Coordinate Columns
- lat, latitude, y, lat_coord, geo_lat
- lon, long, longitude, lng, x, lng_coord, geo_lng

### Type Columns
- type, category, kind, class, zone_type

## Geocoding

When addresses are provided without coordinates:

1. **Automatic Geocoding** - Uses OpenStreetMap Nominatim API
2. **Rate Limiting** - 1 request per second to respect API limits
3. **Geographic Bounds** - Coordinates are mapped to canvas area
4. **Fallback Placement** - Grid pattern if geocoding fails

### Geocoding Requirements
- Valid street address format
- Geographic bounds must be defined for the map
- Internet connection for API calls

## Placement Options

### With Coordinates
- Zones are placed at exact latitude/longitude positions
- Coordinates are converted to canvas pixels

### With Addresses (No Coordinates)
- Addresses are geocoded to get coordinates
- Then placed on canvas based on geographic bounds

### No Location Data
- Zones are arranged in a grid pattern
- Useful for placeholder data or manual positioning later

## Tips for Best Results

1. **Clean Data** - Ensure CSV is properly formatted with headers
2. **Complete Addresses** - Include city, state, ZIP for better geocoding
3. **Coordinate Format** - Use decimal degrees (e.g., 40.7128, -74.0060)
4. **UTF-8 Encoding** - Save CSV files with UTF-8 encoding for special characters
5. **Reasonable Size** - Limit to ~100 zones for best performance

## Troubleshooting

### Common Issues

**No data appears after upload**
- Check that your CSV has a header row
- Ensure file is saved as .csv format

**Geocoding fails**
- Verify addresses are complete and valid
- Check internet connection
- Try including coordinates directly

**Zones appear in wrong location**
- Ensure geographic bounds are set correctly
- Check coordinate format (decimal degrees)
- Verify latitude/longitude columns are mapped correctly

**Import is slow**
- Geocoding takes ~1 second per address
- Large files may take several minutes
- Consider adding coordinates to CSV directly

## API Limits

The geocoding service (OpenStreetMap Nominatim) has usage limits:
- 1 request per second
- No bulk/batch requests
- User-Agent header required

For production use with large datasets, consider:
- Pre-geocoding addresses
- Using a commercial geocoding service
- Caching geocoded results

## Advanced Usage

### Custom Column Mapping
You can manually select any column for mapping, even if not auto-detected.

### Additional Data
Unmapped columns are preserved in zone descriptions as additional information.

### Zone Types
If your CSV includes a type column, zones can be:
- `point` - Single location marker
- `rectangle` - Area zone (requires width/height)
- `circle` - Radius zone (requires radius value)

## Example Workflow

1. Export location data from existing system to CSV
2. Ensure columns include name and address/coordinates
3. Upload via CSV Import dialog
4. Review auto-detected mappings
5. Preview zones before import
6. Import and continue editing as needed
7. Save completed map

---

For more information, see the main [README.md](./README.md)