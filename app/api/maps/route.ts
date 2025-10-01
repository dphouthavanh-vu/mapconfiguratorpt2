import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all maps
export async function GET() {
  try {
    const maps = await prisma.map.findMany({
      include: {
        zones: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(maps);
  } catch (error) {
    console.error('Error fetching maps:', error);
    return NextResponse.json({ error: 'Failed to fetch maps' }, { status: 500 });
  }
}

// POST create new map
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, geographicBounds, canvasConfig, imageUrl, useBaseMap, zones } = body;

    // Create map with zones
    const map = await prisma.map.create({
      data: {
        title,
        description,
        geographicBounds: geographicBounds ? JSON.stringify(geographicBounds) : null,
        canvasConfig: JSON.stringify(canvasConfig),
        imageUrl,
        useBaseMap,
        published: false,
        zones: {
          create: zones.map((zone: any) => ({
            type: zone.type,
            coordinates: JSON.stringify(zone.coordinates),
            content: JSON.stringify(zone.content),
            style: zone.style ? JSON.stringify(zone.style) : null,
          })),
        },
      },
      include: {
        zones: true,
      },
    });

    return NextResponse.json(map, { status: 201 });
  } catch (error) {
    console.error('Error creating map:', error);
    return NextResponse.json({ error: 'Failed to create map' }, { status: 500 });
  }
}
