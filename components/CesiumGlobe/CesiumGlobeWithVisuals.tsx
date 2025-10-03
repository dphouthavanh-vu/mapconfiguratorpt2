/**
 * T029/T030: CesiumGlobe with Visual Enhancement Integration
 * Wrapper component that adds visual settings to existing CesiumGlobe
 */

import React, { useRef, useEffect, useState } from 'react';
import { useVisualSettings } from '../../context/VisualSettingsContext';
import { useVisualEffectsIntegration } from '../../hooks/useVisualEffectsIntegration';

interface CesiumGlobeWithVisualsProps {
  viewer: any; // Cesium.Viewer instance
  landmarks?: any[];
  children?: React.ReactNode;
}

/**
 * Component that adds visual enhancements to an existing Cesium viewer
 */
export const CesiumGlobeWithVisuals: React.FC<CesiumGlobeWithVisualsProps> = ({
  viewer,
  landmarks = [],
  children
}) => {
  const { 
    isDebugPanelOpen, 
    toggleDebugPanel,
    performanceMetrics,
    config 
  } = useVisualSettings();
  
  const [isReady, setIsReady] = useState(false);

  // Integrate visual effects
  const visualEffects = useVisualEffectsIntegration({
    viewer,
    landmarks,
    enabled: true
  });

  // Set ready state when integration is complete
  useEffect(() => {
    if (visualEffects.isReady && viewer) {
      setIsReady(true);
      console.log('✨ Visual enhancements integrated with Cesium viewer');
    }
  }, [visualEffects.isReady, viewer]);

  // Apply initial quality based on device
  useEffect(() => {
    if (!isReady) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isLowEnd = navigator.hardwareConcurrency <= 4;

    if (isMobile || isLowEnd) {
      console.log('📱 Detected mobile/low-end device, adjusting quality...');
      // Quality will be auto-adjusted by the context
    }
  }, [isReady]);

  // Weather shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isReady) return;

      // Weather presets (Shift + number keys)
      if (e.shiftKey) {
        switch (e.key) {
          case '1':
            visualEffects.setWeatherPreset('clear');
            break;
          case '2':
            visualEffects.setWeatherPreset('cloudy');
            break;
          case '3':
            visualEffects.setWeatherPreset('foggy');
            break;
          case '4':
            visualEffects.setWeatherPreset('rainy');
            break;
          case '5':
            visualEffects.setWeatherPreset('snowy');
            break;
          case '6':
            visualEffects.setWeatherPreset('stormy');
            break;
        }
      }

      // Reset all effects (Shift + R)
      if (e.shiftKey && e.key === 'R') {
        visualEffects.resetAllEffects();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isReady, visualEffects]);

  // Performance monitoring overlay
  const renderPerformanceOverlay = () => {
    if (!performanceMetrics || !config.performance.showOverlay) return null;

    const getFpsClass = (fps: number) => {
      if (fps >= 60) return 'fps-excellent';
      if (fps >= 45) return 'fps-good';
      if (fps >= 30) return 'fps-ok';
      return 'fps-poor';
    };

    return (
      <div className="cesium-performance-overlay">
        <div className={`fps-display ${getFpsClass(performanceMetrics.fps)}`}>
          <span className="fps-value">{performanceMetrics.fps}</span>
          <span className="fps-label">FPS</span>
        </div>
        {performanceMetrics.memoryUsage > 0 && (
          <div className="memory-display">
            <span className="memory-value">{Math.round(performanceMetrics.memoryUsage)}</span>
            <span className="memory-label">MB</span>
          </div>
        )}
      </div>
    );
  };

  // Status bar
  const renderStatusBar = () => {
    if (!isReady) return null;

    const status = visualEffects.getStatus();
    
    return (
      <div className="cesium-status-bar">
        <span className="quality-indicator">
          Quality: <strong>{config.quality}</strong>
        </span>
        <span className="effects-indicator">
          Effects: <strong>{status.activeEffects.length}</strong>
        </span>
        {status.effects.terrain?.isLoading && (
          <span className="loading-indicator">Loading terrain...</span>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Render children (original Cesium content) */}
      {children}
      
      {/* Performance overlay */}
      {renderPerformanceOverlay()}
      
      {/* Status bar */}
      {renderStatusBar()}
      
      {/* Visual Settings Button */}
      {isReady && (
        <button
          className="cesium-visual-settings-trigger"
          onClick={toggleDebugPanel}
          title="Visual Settings (Q)"
          aria-label="Open Visual Settings"
        >
          <span className="icon">⚙️</span>
          <span className="label">Visual Settings</span>
        </button>
      )}

      {/* Keyboard shortcuts help */}
      {isDebugPanelOpen && (
        <div className="cesium-shortcuts-help">
          <h4>Keyboard Shortcuts</h4>
          <dl>
            <dt>Q</dt><dd>Toggle settings</dd>
            <dt>Shift+1-6</dt><dd>Weather presets</dd>
            <dt>Shift+R</dt><dd>Reset all</dd>
            <dt>Ctrl+S</dt><dd>Export config</dd>
          </dl>
        </div>
      )}
    </>
  );
};