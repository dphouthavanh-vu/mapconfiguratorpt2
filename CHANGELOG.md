# Changelog

All notable changes to the Interactive Map Configurator project.

## [1.2.0] - 2025-10-01 - Cesium 3D Upgrade

### 🌍 Major Mapping Engine Upgrade

#### Cesium Integration
- **BREAKING**: Replaced Leaflet with Cesium for 3D geospatial visualization
- ✅ True 3D globe with accurate Earth projections
- ✅ High-resolution satellite imagery (Bing Maps Aerial via Cesium Ion)
- ✅ World terrain with global elevation data
- ✅ Professional-grade geospatial capabilities
- ✅ Optimized for large format displays

#### Enhanced Map Selector
- **3D Navigation Controls**:
  - Pan: Left-click and drag
  - Rotate: Right-click and drag
  - Zoom: Scroll wheel
  - Tilt: Middle-click and drag
  - Home button to reset view

- **Improved Features**:
  - Smooth camera animations when searching locations
  - Base layer picker for imagery switching
  - Scene mode picker (3D, 2D, Columbus View)
  - Real-time coordinate display

- **Drawing Mode**:
  - Toggle button to enable/disable drawing
  - Draw rectangular selection areas on 3D globe
  - Live preview while drawing
  - Automatic bounds calculation

#### Technical Implementation
- Installed `cesium` and `resium` packages
- Removed `leaflet` and `react-leaflet` dependencies
- Configured Cesium Ion access token
- Copied Cesium static assets to `public/cesium/`
- Simplified Next.js config for Turbopack compatibility
- Dynamic component loading to prevent SSR issues

#### Visual Quality Improvements
- **4K-Ready**: High-resolution imagery perfect for large screens
- **Realistic Rendering**: True globe projection with terrain
- **Smooth Performance**: Optimized for interactive walls
- **Cinematic Transitions**: Fluid camera movements

### 📚 Documentation
- Created `CESIUM_UPGRADE.md` - Complete Cesium integration guide
- Updated `README.md` with Cesium features
- Added navigation controls documentation
- Included customization examples

### 🔧 Configuration
- Cesium Ion token configured
- Static assets management
- Turbopack-compatible setup
- Deployment-ready configuration

## [1.1.0] - 2025-10-01 - Immersive Experience Update

### 🎨 Major UI Overhaul for Large Format Displays

#### Viewer Experience
- **Complete redesign** of the map viewer with dark, immersive theme
- Black background with gradient overlays for a premium feel
- Centered canvas presentation with subtle gradient border
- Animated "Click to explore" hint text
- Large (5xl) heading with gradient text effect
- Optimized for wall displays and large screens

#### Rich Media Support
- ✅ **Multiple image uploads** per zone
  - Drag and drop or file select
  - Preview thumbnails in grid layout
  - Individual image removal
  - Base64 encoding for easy storage

- ✅ **Video embeds**
  - Support for YouTube, Vimeo, and other platforms
  - Automatic URL conversion for YouTube embeds
  - Full-width video players in modal
  - Multiple videos per zone

- ✅ **Enhanced link management**
  - Custom labels for external links
  - Styled link buttons with hover effects
  - Arrow animations on hover
  - Easy add/remove interface

#### Immersive Modal Design
- Large format (5xl) modal for rich content
- Gradient background (slate-900 to slate-800)
- Blue/purple gradient accents
- Sections for Gallery, Videos, and Resources
- Smooth scrolling with custom scrollbar
- Hover effects on images (scale + overlay)
- Animated link buttons
- Color-coded section headers (blue, purple, green)

### 🗺️ Map Interaction Improvements

#### Canvas Area Selection
- **NEW: Drawing mode toggle button**
  - Clear "Draw Selection Area" / "Cancel Drawing" button
  - Visual feedback (red when active)
  - Users can now pan/zoom the map when not in drawing mode
  - Only captures mouse events when drawing mode is active

- **Improved rectangle drawing**
  - Real-time preview while drawing
  - Fill opacity for better visibility
  - Persistent rectangle after selection
  - Automatic bounds calculation

- **Better user flow**
  - Search functionality remains accessible
  - Map navigation no longer blocked
  - Clear visual states

### 🐛 Bug Fixes

#### React Key Errors
- Fixed "key prop spread into JSX" errors in zone rendering
- Properly extracted key from commonProps in both viewer and editor
- Applied to Circle, Rect, and all zone shape components

#### Zone Display Issues
- Zones now properly render in both editor and viewer
- Fixed coordinate parsing and display
- Improved zone visibility with proper stroke widths
- Hover effects working correctly

### 📝 Content Editor Enhancements

#### Zone Content Dialog
- Larger modal (max-w-2xl) with scrolling support
- Organized sections for different content types
- Image upload with visual grid preview
- Video URL input with live preview list
- Link builder with label and URL fields
- Remove buttons for all media types
- Better spacing and typography
- Press Enter to add videos/links

### 📚 Documentation

#### New Files
- `MAPS_UPGRADE_GUIDE.md` - Comprehensive guide for upgrading to better map providers
  - Mapbox setup and configuration
  - Google Maps integration
  - Cesium 3D visualization
  - Cost comparisons
  - Use case recommendations

- `CHANGELOG.md` - This file, tracking all changes

#### Updated Files
- `README.md` - Added immersive experience features, recent updates section, upgrade guide reference

### 🔧 Technical Improvements

#### Type System
- Added `videos?: string[]` to ZoneContent interface
- Improved media type definitions
- Better TypeScript coverage

#### Component Architecture
- Separated drawing control logic in map-selector
- Improved state management for zone editing
- Better form reset after zone save
- Consistent media array initialization

### 🎯 Optimizations for Large Displays

1. **Visual Hierarchy**
   - Larger fonts (text-4xl to text-5xl)
   - More prominent gradients
   - Better contrast ratios

2. **Touch-Friendly (Future)**
   - Larger clickable areas prepared
   - Hover states that work on touch
   - Clear active states

3. **Performance**
   - Efficient zone rendering
   - Optimized image loading
   - Smooth animations

## [1.0.0] - 2025-10-01 - Initial Release

### Features
- ✅ Canvas definition with search or manual coordinates
- ✅ Blueprint upload support
- ✅ Interactive zone creation (point, rectangle, circle)
- ✅ Visual and manual coordinate placement
- ✅ Map management dashboard
- ✅ Unique URLs for each map
- ✅ SQLite database with Prisma
- ✅ No authentication required
- ✅ Fully responsive design

### Tech Stack
- Next.js 14 with TypeScript
- React Konva for canvas
- Leaflet for maps
- Tailwind CSS + shadcn/ui
- SQLite + Prisma ORM

---

## Upgrade Path

To upgrade from v1.0 to v1.1:

1. Pull latest code
2. Run `npm install` (no new dependencies required for core features)
3. Database schema is compatible (no migration needed)
4. Existing maps will work with new viewer automatically

### Optional: Add Mapbox for Better Maps
See `MAPS_UPGRADE_GUIDE.md` for instructions.

## Future Roadmap

### v1.2 - Collaboration Features
- [ ] User authentication
- [ ] Map ownership and permissions
- [ ] Real-time collaboration
- [ ] Comments on zones

### v1.3 - Advanced Features
- [ ] Polygon zones
- [ ] Custom shape drawing
- [ ] Undo/redo
- [ ] Grid overlay and snap

### v1.4 - Analytics & Insights
- [ ] Zone click tracking
- [ ] Heatmaps
- [ ] View duration analytics
- [ ] Popular zones report

### v2.0 - Enterprise Features
- [ ] Multi-language support
- [ ] Custom branding/themes
- [ ] API for integrations
- [ ] Advanced permissions
- [ ] Subdomain routing

---

For questions or suggestions, please open an issue on GitHub.
