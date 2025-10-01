import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single map by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const map = await prisma.map.findUnique({
      where: { id },
      include: {
        zones: true,
      },
    });

    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    return NextResponse.json(map);
  } catch (error) {
    console.error('Error fetching map:', error);
    return NextResponse.json({ error: 'Failed to fetch map' }, { status: 500 });
  }
}

// PUT update map
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, published, zones } = body;

    // Update map
    const map = await prisma.map.update({
      where: { id },
      data: {
        title,
        description,
        published,
      },
    });

    // If zones are provided, update them
    if (zones) {
      // Delete existing zones
      await prisma.zone.deleteMany({
        where: { mapId: id },
      });

      // Create new zones
      await prisma.zone.createMany({
        data: zones.map((zone: any) => ({
          mapId: id,
          type: zone.type,
          coordinates: JSON.stringify(zone.coordinates),
          content: JSON.stringify(zone.content),
          style: zone.style ? JSON.stringify(zone.style) : null,
        })),
      });
    }

    // Fetch updated map with zones
    const updatedMap = await prisma.map.findUnique({
      where: { id },
      include: {
        zones: true,
      },
    });

    return NextResponse.json(updatedMap);
  } catch (error) {
    console.error('Error updating map:', error);
    return NextResponse.json({ error: 'Failed to update map' }, { status: 500 });
  }
}

// DELETE map
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.map.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting map:', error);
    return NextResponse.json({ error: 'Failed to delete map' }, { status: 500 });
  }
}
