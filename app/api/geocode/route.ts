import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // Server-side geocoding request (no CORS issues)
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'MapConfigurator/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      console.error('Geocoding failed:', response.statusText);
      return NextResponse.json({ error: 'Geocoding failed' }, { status: response.status });
    }

    const data = await response.json();

    if (data.length > 0) {
      return NextResponse.json({
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name,
      });
    }

    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json({ error: 'Failed to geocode address' }, { status: 500 });
  }
}