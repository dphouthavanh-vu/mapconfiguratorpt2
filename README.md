# Interactive Map Configurator

A powerful web application for creating beautiful, interactive maps with custom zones and content. Perfect for floor plans, blueprints, campus maps, store layouts, and more.

## Features

### 🗺️ Level 1: Canvas Definition
- **Search Location**: Search for any location using OpenStreetMap and draw a bounding box to define your canvas area
- **Manual Coordinates**: Enter precise geographic coordinates (latitude/longitude bounds) manually
- Real-time preview of selected area

### 📐 Level 2: Blueprint Upload
- Upload floor plans, blueprints, or any image to use as your map background
- Support for all common image formats (PNG, JPG, SVG, etc.)
- Option to skip and use base map imagery instead

### 📍 Level 3: Interactive Zone Creation
- **Visual Placement**: Click directly on the canvas to place zones
- **Manual Coordinate Entry**: Enter precise X, Y coordinates for exact positioning
- **Multiple Zone Types**:
  - Points (markers)
  - Rectangles (areas)
  - Circles (radius-based zones)
- **Rich Media Content**: Add to each zone:
  - Title and description
  - **Multiple images** (with preview thumbnails)
  - **Video embeds** (YouTube, Vimeo, etc.)
  - **External links** with custom labels
- Toggle between click-to-place and manual coordinate entry
- Real-time coordinate display

### 🚀 Map Management
- Dashboard to view all created maps
- Publish/unpublish maps
- Edit or delete existing maps
- Preview maps before publishing
- Unique URL for each published map

### 🎨 Immersive Viewing Experience
- **Optimized for Large Format Displays**
- Dark theme with gradient backgrounds
- Full-screen immersive viewer
- Animated interactions and smooth transitions
- Rich media modal with image galleries
- Embedded video support
- Professional gradient designs
- Built with Tailwind CSS and shadcn/ui components
- Responsive design (mobile and desktop)

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + React
- **Canvas Library**: Konva.js (via react-konva)
- **Map Library**: **Cesium** - 3D geospatial visualization platform
- **UI Components**: Tailwind CSS + shadcn/ui
- **Database**: SQLite + Prisma ORM
- **Deployment**: Vercel-ready

### Why Cesium?

We upgraded from Leaflet to **Cesium** for superior visual quality on large format displays:
- ✅ True 3D globe visualization
- ✅ High-resolution satellite imagery (Bing Maps Aerial)
- ✅ World terrain with elevation data
- ✅ Smooth camera animations
- ✅ Professional geospatial capabilities
- ✅ Perfect for interactive walls and large screens

**See [CESIUM_UPGRADE.md](./CESIUM_UPGRADE.md)** for full details and advanced features.

## Getting Started

The application is already set up and running! The development server should be running at:

**http://localhost:3000**

If it's not running, start it with:

```bash
npm run dev
```

## Usage Guide

### Creating Your First Map

1. **Start from the Homepage**
   - Click "Create Your First Map" or "Create New Map"

2. **Step 1: Map Information**
   - Enter a title for your map
   - Optionally add a description
   - Click "Continue"

3. **Step 2: Define Canvas Area**
   - Choose between two methods:
     - **Search Location**: Search for a place and draw a bounding box on the map
     - **Manual Coordinates**: Enter lat/lng bounds directly
   - Click to select area or enter coordinates

4. **Step 3: Upload Blueprint (Optional)**
   - Upload an image file (floor plan, blueprint, diagram)
   - Or skip to use base map imagery
   - Preview your uploaded image

5. **Step 4: Add Interactive Zones**
   - Select zone type (point, rectangle, or circle)
   - Choose placement method:
     - **Click to Place**: Click on the canvas where you want the zone
     - **Manual Entry**: Enter precise X, Y coordinates
   - Fill in zone content (title, description)
   - Repeat to add multiple zones
   - Click "Save Map" when done

### Managing Maps

- Go to `/maps` to see all your created maps
- **View**: Preview the interactive map
- **Publish/Unpublish**: Toggle public availability
- **Delete**: Remove maps you no longer need

### Viewing Published Maps

- Each map gets a unique URL: `/map/{id}`
- Share this URL with anyone
- Users can click on zones to view content
- Hover effects for better interactivity

## Project Structure

```
map-configurator/
├── app/
│   ├── api/
│   │   └── maps/           # API routes for CRUD operations
│   ├── create/             # Map creation wizard
│   ├── maps/               # Map management dashboard
│   ├── map/[id]/          # Public map viewer
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── canvas-definition.tsx
│   ├── blueprint-upload.tsx
│   ├── map-selector.tsx
│   └── zone-editor.tsx
├── lib/
│   ├── prisma.ts          # Prisma client
│   ├── types.ts           # TypeScript types
│   └── utils.ts           # Utility functions
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── dev.db             # SQLite database
└── public/                # Static assets
```

## Database Schema

### Maps Table
- `id`: Unique identifier
- `title`: Map title
- `description`: Optional description
- `geographicBounds`: JSON (lat/lng bounds)
- `canvasConfig`: JSON (width, height, coordinate system)
- `imageUrl`: Uploaded blueprint URL
- `useBaseMap`: Boolean (use map imagery vs blueprint)
- `published`: Boolean (public availability)
- `createdAt`, `updatedAt`: Timestamps

### Zones Table
- `id`: Unique identifier
- `mapId`: Foreign key to Maps
- `type`: Zone type (point, rectangle, circle, polygon)
- `coordinates`: JSON (zone position/dimensions)
- `content`: JSON (title, description, images, links)
- `style`: JSON (colors, opacity, icons)
- `createdAt`, `updatedAt`: Timestamps

## API Endpoints

### Maps
- `GET /api/maps` - List all maps
- `POST /api/maps` - Create new map
- `GET /api/maps/[id]` - Get single map
- `PUT /api/maps/[id]` - Update map
- `DELETE /api/maps/[id]` - Delete map

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import repository in Vercel
3. Vercel automatically detects Next.js and configures everything
4. For production, configure a PostgreSQL database (optional - SQLite works for development)
5. Deploy!

## Cesium 3D Geospatial Platform

This application uses **Cesium** - the industry-leading 3D geospatial visualization platform! 🌍

### What You Get
- ✅ True 3D globe with accurate Earth projections
- ✅ High-resolution Bing Maps satellite imagery
- ✅ Global terrain with elevation data
- ✅ Smooth camera animations
- ✅ Professional geospatial features
- ✅ Perfect for large format displays

### Learn More
**📖 See [CESIUM_UPGRADE.md](./CESIUM_UPGRADE.md)** for:
- Advanced customization options
- Navigation controls guide
- Performance optimization tips
- Deployment instructions
- Troubleshooting help

### Alternative Map Providers
If you prefer 2D mapping or other providers, see [MAPS_UPGRADE_GUIDE.md](./MAPS_UPGRADE_GUIDE.md) for:
- Mapbox (2D beautiful maps)
- Google Maps (Street View support)
- OpenStreetMap (free, open-source)

## Recent Updates

✅ **v1.2 - Cesium 3D Upgrade** (Latest)
- **UPGRADED** from Leaflet to Cesium for 3D geospatial visualization
- True 3D globe with world terrain
- High-resolution satellite imagery (Bing Maps Aerial)
- Enhanced navigation controls (pan, rotate, tilt, zoom)
- Smooth camera animations
- Professional geospatial capabilities
- Perfect for large format displays

✅ **v1.1 - Immersive Experience Update**
- Completely redesigned viewer UI for large format displays
- Dark theme with gradient backgrounds
- Full-screen immersive experience
- Rich media support (multiple images, video embeds)
- Enhanced zone content editor
- Fixed canvas area selection with drawing mode toggle
- Improved zone visibility and interaction

## Future Enhancements

Potential features to add:

- [ ] User authentication and map ownership
- [ ] Polygon zones with custom shapes
- [ ] Real-time collaboration
- [ ] Export/import map configurations (JSON)
- [ ] Grid overlay and snap-to-grid
- [ ] Undo/redo functionality
- [ ] Keyboard shortcuts
- [ ] Analytics (zone click tracking, heatmaps)
- [ ] Custom styling themes (colors, fonts)
- [ ] Subdomain routing for maps
- [ ] Multi-language support
- [ ] Touch gestures for mobile

---

Built with Next.js, React, Konva, and **Cesium 3D** | Optimized for Large Format Displays | Professional Geospatial Platform
