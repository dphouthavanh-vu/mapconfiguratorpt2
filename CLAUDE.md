# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev        # Start development server with Turbopack on http://localhost:3000
npm run build      # Production build with Turbopack
npm run start      # Start production server
npm run lint       # Run ESLint
```

### Database Operations
```bash
npx prisma generate          # Generate Prisma client after schema changes
npx prisma migrate dev       # Create and apply migrations
npx prisma studio            # Open database GUI browser
npx prisma db push           # Push schema changes without migration (development only)
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.5.4 with App Router, React 19.1.0, TypeScript
- **3D Maps**: Cesium 1.133.1 (replaced Leaflet) with Resium React wrapper
- **2D Canvas**: Konva.js with react-konva for zone editing
- **Database**: SQLite (dev) with Prisma ORM 6.16.3
- **Styling**: Tailwind CSS v4, shadcn/ui components (new-york style)

### Key Architectural Decisions

1. **Cesium Integration**: The project recently migrated from Leaflet to Cesium (v1.2) for superior 3D visualization on large displays. Cesium components use dynamic imports to prevent SSR issues and require specific CSP headers configured in `next.config.ts`.

2. **Data Storage Pattern**: All complex data (coordinates, content, styles) is stored as JSON strings in SQLite. Zone images are base64-encoded and stored directly in the database (not recommended for production).

3. **Coordinate Systems**: Dual system supporting both Geographic (lat/lng) and Pixel (x/y) coordinates with conversion utilities in `lib/coordinate-converter.ts`.

4. **Multi-Step Wizard Pattern**: Map creation follows a 4-step wizard pattern with state passed through URL params and props between steps.

### Project Structure

```
app/
├── api/maps/          # REST endpoints: GET/POST for collection, GET/PUT/DELETE for individual
├── create/            # 4-step wizard: info → canvas → blueprint → zones
├── map/[id]/         # Public 3D viewer with Cesium
│   └── 2d/           # Alternative 2D canvas viewer
└── maps/             # Dashboard for map management

components/
├── CesiumGlobe/      # Main 3D globe component (2070 lines, complex)
├── ui/               # shadcn/ui components
└── [feature].tsx     # Feature components (canvas-definition, zone-editor, etc.)

lib/
├── types.ts          # Central type definitions (GeographicBounds, Zone types, etc.)
├── prisma.ts         # Singleton pattern for Prisma client
└── generated/prisma/ # Custom output path for generated client
```

### Critical Implementation Details

1. **Cesium Token**: Currently hardcoded in `components/map-selector-cesium.tsx`. Should be moved to `NEXT_PUBLIC_CESIUM_TOKEN` environment variable.

2. **Client Components**: Components using browser APIs, Cesium, or Konva must have `'use client'` directive.

3. **Database Schema**:
   - Maps have zones (1-to-many, cascade delete)
   - JSON fields: geographicBounds, canvasConfig, coordinates, content, style
   - Published flag controls public visibility

4. **API Response Format**: All API routes return JSON with error handling:
   ```typescript
   // Success
   return NextResponse.json(data)
   // Error
   return NextResponse.json({ error: 'Message' }, { status: 500 })
   ```

5. **Zone Types**: Support for 'point', 'rectangle', 'circle', 'polygon' (polygon not yet implemented in UI).

6. **Visual Settings Context**: Global theming and visual effects managed through React Context in `context/VisualSettingsContext.tsx`.

### Environment Setup

Required environment variable (create `.env.local`):
```bash
DATABASE_URL="file:./dev.db"  # SQLite for development
```

For production deployment to Vercel:
- Configure PostgreSQL database
- Move images to Vercel Blob storage
- Set up proper environment variables

### Common Development Tasks

#### Adding a New Zone Type
1. Update TypeScript types in `lib/types.ts`
2. Modify zone editor in `components/zone-editor.tsx`
3. Update canvas rendering logic
4. Adjust API validation if needed

#### Modifying the Creation Wizard
1. Steps are in `app/create/page.tsx`
2. Each step is a separate component in `components/`
3. State flows through URL params and props
4. Final submission happens in zone-editor.tsx

#### Working with Cesium
1. Always use dynamic imports: `const CesiumGlobe = dynamic(() => import('@/components/CesiumGlobe'), { ssr: false })`
2. Check CSP headers in `next.config.ts` if loading issues occur
3. Cesium assets (~50MB) are in `public/cesium/`

### Known Limitations

1. **No Test Infrastructure**: Project has no tests. Consider adding Jest + React Testing Library.
2. **No Authentication**: All maps are publicly accessible if ID is known.
3. **SQLite Limitations**: Not suitable for production. Database already 33MB.
4. **Base64 Images**: Stored directly in database causing bloat.
5. **Missing Error Boundaries**: React errors can crash the app.
6. **No Loading States**: Poor UX during API calls.

### Recent Changes (v1.2)

- Migrated from Leaflet to Cesium for 3D visualization
- Added high-resolution satellite imagery (Bing Maps Aerial)
- Implemented smooth camera animations
- Enhanced for large format displays (4K ready)
- Full documentation in `CESIUM_UPGRADE.md`

### Future Roadmap (from README)

- User authentication and map ownership
- Polygon zones with custom shapes
- Real-time collaboration
- Export/import map configurations
- Analytics and heatmaps