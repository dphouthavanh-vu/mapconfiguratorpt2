import * as Cesium from 'cesium';
import { createClusterMarkerImage } from '../utils/markerUtils';

export function setupClusterBillboards(
  dataSource: Cesium.CustomDataSource, 
  _viewer: Cesium.Viewer
) {
  // Validate inputs
  if (!dataSource) {
    console.error('❌ setupClusterBillboards: dataSource is null or undefined');
    return { cleanup: () => {}, forceRegeneration: () => {} };
  }
  
  if (!_viewer) {
    console.error('❌ setupClusterBillboards: viewer is null or undefined');
    return { cleanup: () => {}, forceRegeneration: () => {} };
  }
  const clusterImageCache: { [count: number]: string } = {};

  // Track last cluster event time to prevent rapid re-clustering
  let lastClusterEventTime = 0;
  const CLUSTER_EVENT_DEBOUNCE = 50; // Minimum 50ms between cluster events

  const clusterEventHandler = (clusteredEntities: any[], cluster: any) => {
    const now = Date.now();
    if (now - lastClusterEventTime < CLUSTER_EVENT_DEBOUNCE) {
      return;
    }
    lastClusterEventTime = now;
    try {
      
      // Add debugging to track when this event is triggered during "go back to map"
      const currentTime = Date.now();
      
      // Check if this cluster contains Healthpark entities
      const healthparkEntities = clusteredEntities.filter(entity => 
        entity.name && (
          entity.name.includes('Healthpark') || 
          entity.name.includes('Family Care Center Healthpark') ||
          entity.name.includes('USF Internal Medicine Healthpark')
        )
      );
      
      if (healthparkEntities.length > 0) {
      }
      
      // Log all entities in this cluster for debugging
      
      if (!cluster || !cluster.billboard) {
        console.warn('⚠️ Invalid cluster or missing billboard:', cluster);
        return;
      }
      
      cluster.label.show = false;
      // Initial show state will be managed based on image availability
      const count = clusteredEntities.length;
      
      const setClusterProps = (img: string) => {
        try {
          cluster.billboard.image = img;
          
          // Use fixed dimensions for clusters
          const baseWidth = 300;
          const baseHeight = 108;
          const scale = 0.6;
          
          
          const scaledWidth = baseWidth * scale;
          const scaledHeight = baseHeight * scale;
          
          
          // Set the dimensions directly as numbers, not as ConstantProperty objects
          try {
            cluster.billboard.width = scaledWidth;
            cluster.billboard.height = scaledHeight;
          } catch (error) {
            console.error('❌ Failed to set cluster billboard dimensions:', error);
            // Fallback to fixed size
            const fallbackWidth = 300;
            const fallbackHeight = 108;
            cluster.billboard.width = fallbackWidth;
            cluster.billboard.height = fallbackHeight;
          }
          
          
          // Position the cluster marker so the pointer tip (bottom-left) points to the geographic coordinate
          // The pointer tip is at the bottom-left of the SVG, so no offset is needed
          const scaledPixelOffsetY = 0; // No vertical offset needed when positioning at bottom-left
          const scaledPixelOffsetX = 0; // No horizontal offset needed when positioning at bottom-left
          cluster.billboard.pixelOffset = new Cesium.Cartesian2(scaledPixelOffsetX, scaledPixelOffsetY);
          // Position relative to bottom-left for consistent pointer tip positioning
          cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
          cluster.billboard.horizontalOrigin = Cesium.HorizontalOrigin.LEFT;
          // Removed scaleByDistance to prevent automatic scaling during camera movements
          cluster.billboard.translucencyByDistance = new Cesium.NearFarScalar(1.0e6, 1.0, 2.0e6, 0.0);
          // Enable depth testing to prevent border bleeding through overlapping markers
          cluster.billboard.disableDepthTestDistance = 0.0;
          // Set height reference to ensure proper depth ordering
          // Only set height reference if scene is available to avoid errors
          if (_viewer && _viewer.scene) {
            cluster.billboard.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
          }
          cluster.billboard.show = true;
          cluster.label.show = false;
        } catch (error) {
          console.error('❌ Error setting cluster billboard properties:', error);
        }
      };
      
      if (clusterImageCache[count]) {
        setClusterProps(clusterImageCache[count]);
        // Force billboard to be visible
        cluster.billboard.show = true;
        // Force Cesium to update
        if (_viewer && _viewer.scene) {
          _viewer.scene.requestRender();
        }
      } else {
        // Don't show the billboard until the image is ready
        cluster.billboard.show = false;


        createClusterMarkerImage({
          text: `${count} Locations`, // This text is safe, no special characters
          color: '#00529C', // Use blue color for clusters
          fontSize: 36, // Reduce font size for larger clusters
        }).then(clusterImage => {
          clusterImageCache[count] = clusterImage;
          setClusterProps(clusterImage);
          // Show the billboard now that the image is ready
          cluster.billboard.show = true;
          // Force Cesium to update
          if (_viewer && _viewer.scene) {
            _viewer.scene.requestRender();
          }
        }).catch(error => {
          console.error('❌ Failed to create cluster image for', count, 'entities:', error);
          console.error('Error stack:', error.stack);
          // Create a fallback simple cluster image
          const fallbackSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="300" height="107" viewBox="0 0 256 107" fill="none">
              <rect x="0" y="0" width="256" height="107" fill="rgba(0, 134, 255, 0.50)" stroke="#FCF060" stroke-width="3" rx="20"/>
              <text x="128" y="60" font-family="Arial, sans-serif" font-weight="bold" font-size="36" fill="#fff" text-anchor="middle">${count} Locations</text>
            </svg>
          `;
          const fallbackBlob = new Blob([fallbackSvg], { type: 'image/svg+xml' });
          const fallbackUrl = URL.createObjectURL(fallbackBlob);
          setClusterProps(fallbackUrl);
          // Show the billboard even with fallback image
          cluster.billboard.show = true;
        });
      }
      
      // Attach clusteredEntities to multiple locations for reliable picking
      cluster.billboard.clusteredEntities = clusteredEntities;
      cluster.clusteredEntities = clusteredEntities;
      if (cluster.id) {
        cluster.id.clusteredEntities = clusteredEntities;
      }
      
      // Debug: Check if individual entity billboards are being hidden
      for (const entity of clusteredEntities) {
        if (entity.billboard) {
          const show = entity.billboard.show?.getValue(Cesium.JulianDate.now());
        }
      }
      
      // Debug: Check cluster billboard visibility
      // Note: Cluster billboard visibility will be false until the async image creation completes
      
      // Debug: Log the cluster structure to see what's available
      
      // Also try attaching to the primitive if it exists
      if (cluster.primitive) {
        cluster.primitive.clusteredEntities = clusteredEntities;
      }
    } catch (error) {
      console.error('❌ Error in cluster event handler:', error);
    }
  };
  try {
    dataSource.clustering.clusterEvent.addEventListener(clusterEventHandler);
  } catch (error) {
    console.error('❌ Error adding cluster event handler:', error);
  }

  // Cluster click handler removed; now handled in CesiumGlobe.tsx

  // Function to force cluster regeneration (for scaling updates)
  const forceClusterRegeneration = () => {
    try {
      if (dataSource && dataSource.clustering && dataSource.clustering.enabled) {
        dataSource.clustering.enabled = false;
        dataSource.clustering.enabled = true;
      }
    } catch (error) {
      console.error('❌ Error during cluster regeneration:', error);
    }
  };



  // Return cleanup function and regeneration function
  return {
    cleanup: () => {
      try {
        if (dataSource && dataSource.clustering) {
          dataSource.clustering.clusterEvent.removeEventListener(clusterEventHandler);
        }
      } catch (error) {
        console.error('❌ Error removing cluster event handler:', error);
      }
    },
    forceRegeneration: forceClusterRegeneration
  };
}