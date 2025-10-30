import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

    // Try Google Maps Geocoding API first (more accurate)
    if (googleApiKey && googleApiKey !== 'YOUR_API_KEY_HERE') {
      try {
        const encodedAddress = encodeURIComponent(address);
        const googleResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleApiKey}`
        );

        if (googleResponse.ok) {
          const googleData = await googleResponse.json();

          if (googleData.status === 'OK' && googleData.results.length > 0) {
            const result = googleData.results[0];
            return NextResponse.json({
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng,
              display_name: result.formatted_address,
              source: 'google',
            });
          }

          // Handle specific Google API errors
          if (googleData.status === 'OVER_QUERY_LIMIT') {
            console.warn(`Google API quota exceeded for "${address}". Trying OpenStreetMap fallback...`);
          } else if (googleData.status === 'ZERO_RESULTS') {
            console.log(`Google geocoding found no results for "${address}"`);
          } else {
            console.log(`Google geocoding failed for "${address}": ${googleData.status}`);
          }
        }
      } catch (googleError) {
        console.error('Google geocoding error:', googleError);
        // Fall through to OpenStreetMap
      }
    }

    // Fallback to OpenStreetMap Nominatim (free, but less accurate)
    const encodedAddress = encodeURIComponent(address);
    const osmResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'MapConfigurator/1.0', // Required by Nominatim
        },
      }
    );

    if (!osmResponse.ok) {
      console.error('OSM geocoding failed:', osmResponse.statusText);
      return NextResponse.json({ error: 'Geocoding failed' }, { status: osmResponse.status });
    }

    const osmData = await osmResponse.json();

    if (osmData.length > 0) {
      return NextResponse.json({
        lat: parseFloat(osmData[0].lat),
        lng: parseFloat(osmData[0].lon),
        display_name: osmData[0].display_name,
        source: 'openstreetmap',
      });
    }

    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json({ error: 'Failed to geocode address' }, { status: 500 });
  }
}