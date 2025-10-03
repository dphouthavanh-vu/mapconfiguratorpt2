/**
 * T027: Enhanced CesiumGlobe Component
 * Integrates visual enhancement system with existing CesiumGlobe
 */

import React, { useRef, useState, useEffect } from 'react';
import CesiumGlobe from './CesiumGlobe';
import { VisualSettingsProvider } from '@/context/VisualSettingsContext';
import { VisualSettingsModal } from '@/components/VisualSettings';
import { useVisualEffectsIntegration } from '@/hooks/useVisualEffectsIntegration';
import type { Landmark } from './data/types';
import './CesiumGlobeEnhanced.scss';

interface CesiumGlobeEnhancedProps {
  landmarks?: Landmark[];
  enableVisualEnhancements?: boolean;
  showDebugButton?: boolean;
}

/**
 * Inner component that has access to visual settings context
 */
const CesiumGlobeWithEffects: React.FC<CesiumGlobeEnhancedProps> = ({
  landmarks = [],
  enableVisualEnhancements = true,
  showDebugButton = true
}) => {
  const viewerRef = useRef<any>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);

  // Visual effects integration
  const visualEffects = useVisualEffectsIntegration({
    viewer: viewerRef.current,
    landmarks,
    enabled: enableVisualEnhancements && isViewerReady
  });

  // Get viewer from CesiumGlobe once it's ready
  const handleViewerReady = (viewer: any) => {
    viewerRef.current = viewer;
    setIsViewerReady(true);
    console.log('🎨 Viewer ready for visual enhancements');
  };

  // Status display for debugging
  useEffect(() => {
    if (visualEffects.isReady) {
      const status = visualEffects.getStatus();
      console.log('🎨 Visual Effects Status:', {
        activeEffects: status.activeEffects,
        performance: status.performance?.current?.fps,
        health: status.performance?.health
      });
    }
  }, [visualEffects.isReady, visualEffects]);

  return (
    <>
      {/* Original CesiumGlobe with viewer callback */}
      <CesiumGlobe 
        onViewerReady={handleViewerReady}
        landmarks={landmarks}
      />

      {/* Visual Settings Modal (hidden by default, opened with Q key) */}
      <VisualSettingsModal cesiumViewer={viewerRef.current} />

      {/* Debug Button (optional) */}
      {showDebugButton && isViewerReady && (
        <button 
          className="visual-settings-debug-button"
          onClick={() => {
            // Trigger the modal via keyboard event
            const event = new KeyboardEvent('keydown', { key: 'q' });
            window.dispatchEvent(event);
          }}
          title="Visual Settings (Q)"
        >
          ⚙️
        </button>
      )}

      {/* Performance Overlay (optional) */}
      {visualEffects.performanceMetrics && (
        <div className="performance-overlay">
          <span className={`fps-indicator fps-${
            visualEffects.performanceMetrics.fps >= 60 ? 'good' : 
            visualEffects.performanceMetrics.fps >= 30 ? 'ok' : 'poor'
          }`}>
            {visualEffects.performanceMetrics.fps} FPS
          </span>
        </div>
      )}
    </>
  );
};

/**
 * Main enhanced component with provider wrapper
 */
const CesiumGlobeEnhanced: React.FC<CesiumGlobeEnhancedProps> = (props) => {
  return (
    <VisualSettingsProvider>
      <CesiumGlobeWithEffects {...props} />
    </VisualSettingsProvider>
  );
};

export default CesiumGlobeEnhanced;