# Map Quality Upgrade Guide

This guide explains how to upgrade to higher quality map providers for better visuals on large format displays.

## Current Setup: OpenStreetMap (Leaflet)

The application currently uses **OpenStreetMap** via Leaflet, which is:
- ✅ Free and open-source
- ✅ No API key required
- ✅ Good for general mapping needs
- ❌ Limited satellite imagery
- ❌ No 3D buildings
- ❌ Less polished for large displays

## Upgrade Option 1: Mapbox (Recommended for 2D)

**Mapbox** provides beautiful, high-resolution maps perfect for large format displays.

### Benefits:
- ✅ High-quality satellite imagery
- ✅ Beautiful custom styling
- ✅ 3D building extrusions
- ✅ Vector tiles (smooth zooming)
- ✅ Custom color schemes
- ✅ Better performance
- ✅ Free tier: 50,000 map loads/month

### Cost:
- **Free tier**: Up to 50,000 map loads per month
- **Pay-as-you-go**: $0.50 per 1,000 loads after free tier
- [Pricing details](https://www.mapbox.com/pricing)

### Setup Instructions:

1. **Get API Key**
   - Sign up at [mapbox.com](https://www.mapbox.com)
   - Create a new access token
   - Copy your public access token

2. **Install Dependencies**
   ```bash
   npm install mapbox-gl react-map-gl
   ```

3. **Add Environment Variable**
   Create `.env.local`:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
   ```

4. **Update map-selector.tsx**
   Replace Leaflet components with Mapbox GL:
   ```tsx
   import Map from 'react-map-gl';
   import 'mapbox-gl/dist/mapbox-gl.css';

   <Map
     mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
     initialViewState={{
       longitude: -74.0060,
       latitude: 40.7128,
       zoom: 13
     }}
     style={{width: '100%', height: '500px'}}
     mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
   />
   ```

### Recommended Map Styles:
- `mapbox://styles/mapbox/satellite-streets-v12` - Satellite with labels (great for large displays)
- `mapbox://styles/mapbox/dark-v11` - Dark theme (matches immersive viewer)
- `mapbox://styles/mapbox/streets-v12` - Clean streets map
- `mapbox://styles/mapbox/navigation-day-v1` - Navigation focused

## Upgrade Option 2: Google Maps

**Google Maps** is the industry standard with the most comprehensive data.

### Benefits:
- ✅ Most accurate and up-to-date
- ✅ Street View integration
- ✅ Excellent satellite imagery
- ✅ 3D buildings in major cities
- ✅ Familiar interface

### Cost:
- **Free tier**: $200 credit/month (~28,000 map loads)
- **After free tier**: $7 per 1,000 loads
- [Pricing calculator](https://mapsplatform.google.com/pricing/)

### Setup Instructions:

1. **Get API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Enable Maps JavaScript API
   - Create API key with restrictions

2. **Install Dependencies**
   ```bash
   npm install @googlemaps/react-wrapper @googlemaps/js-api-loader
   ```

3. **Add Environment Variable**
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key_here
   ```

## Upgrade Option 3: Cesium (For 3D Visualizations)

**Cesium** is perfect if you need true 3D globe visualizations and terrain.

### Benefits:
- ✅ True 3D globe
- ✅ High-resolution terrain
- ✅ Time-dynamic visualizations
- ✅ Advanced geospatial features
- ❌ Overkill for 2D floor plans
- ❌ Steeper learning curve

### When to Use:
- Geographic visualizations (terrain, elevation)
- Campus maps with topography
- Large outdoor facilities
- Multi-building complexes

### Cost:
- **Free tier**: Available for testing
- **Commercial**: Custom pricing
- [More info](https://cesium.com/pricing/)

## Recommendation for Your Use Case

For an **interactive wall configurator on large format displays**, we recommend:

### 🏆 **Mapbox** (Best Overall)
- Perfect balance of quality and cost
- Beautiful satellite imagery
- Excellent for large displays
- Easy to customize for branding
- Generous free tier

### Use Cases by Map Provider:

| Scenario | Best Provider | Why |
|----------|---------------|-----|
| Floor plans with location context | Mapbox | Beautiful satellite, easy to use |
| Indoor blueprints only | Current (OpenStreetMap) | Free, sufficient for indoor use |
| Need Street View | Google Maps | Only provider with Street View |
| 3D terrain/outdoor campus | Cesium | True 3D capabilities |
| Tight budget | Current (OpenStreetMap) | Completely free |

## Implementation Priority

For large format displays, prioritize in this order:

1. **Upgrade viewer UI** ✅ (Already done - dark theme, immersive)
2. **Add media support** ✅ (Already done - images, videos)
3. **Upgrade to Mapbox** ⬅️ (Recommended next step)
4. **Custom styling** (Match your brand colors)
5. **Optimize for performance** (Lazy loading, caching)

## Quick Start: Mapbox Upgrade

To quickly upgrade to Mapbox:

```bash
# 1. Install Mapbox
npm install mapbox-gl react-map-gl

# 2. Get your token from mapbox.com
# 3. Add to .env.local
echo "NEXT_PUBLIC_MAPBOX_TOKEN=your_token" >> .env.local

# 4. Update map-selector.tsx (see code example above)
```

## Support

- **Mapbox Support**: https://docs.mapbox.com/help/
- **Google Maps Support**: https://developers.google.com/maps/documentation
- **Cesium Support**: https://cesium.com/docs/
- **Leaflet (current)**: https://leafletjs.com/

---

**Need help upgrading?** The current implementation is production-ready with OpenStreetMap. Upgrade to Mapbox when you need higher quality visuals for your large format displays.
