/**
 * T031: Visual Effects Demo Component
 * Test component to verify visual enhancement integration
 */

import React, { useState, useEffect } from 'react';
import CesiumGlobeEnhanced from './CesiumGlobeEnhanced';
import { VisualSettingsProvider, useVisualSettings } from '../../context/VisualSettingsContext';
import type { Landmark } from './data/types';

// Sample landmarks for testing
const sampleLandmarks: Landmark[] = [
  {
    name: 'Mount Everest',
    lon: 86.9250,
    lat: 27.9881,
    icon: '⛰️',
    height: 8848
  },
  {
    name: 'Grand Canyon',
    lon: -112.1130,
    lat: 36.1069,
    icon: '🏜️',
    height: 2000
  },
  {
    name: 'Tokyo Tower',
    lon: 139.7454,
    lat: 35.6586,
    icon: '🗼',
    height: 333
  },
  {
    name: 'Eiffel Tower',
    lon: 2.2945,
    lat: 48.8584,
    icon: '🗼',
    height: 324
  },
  {
    name: 'Sydney Opera House',
    lon: 151.2153,
    lat: -33.8568,
    icon: '🎭',
    height: 65
  }
];

/**
 * Demo controls component
 */
const DemoControls: React.FC = () => {
  const { config, loadPreset, performanceMetrics } = useVisualSettings();
  const [showStats, setShowStats] = useState(true);

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: 20,
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '300px',
      zIndex: 1000
    }}>
      <h3 style={{ margin: '0 0 16px' }}>Visual Effects Demo</h3>
      
      {/* Quick Presets */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '8px 0' }}>Quality Presets</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => loadPreset('low' as any)}>Low</button>
          <button onClick={() => loadPreset('medium' as any)}>Medium</button>
          <button onClick={() => loadPreset('high' as any)}>High</button>
        </div>
      </div>

      {/* Current Status */}
      {showStats && (
        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          <p>Quality: {config.quality}</p>
          {performanceMetrics && (
            <>
              <p>FPS: {performanceMetrics.fps}</p>
              <p>Memory: {performanceMetrics.memoryUsage.toFixed(0)} MB</p>
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{ marginTop: '16px', fontSize: '11px', opacity: 0.7 }}>
        <p><strong>Keyboard Shortcuts:</strong></p>
        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
          <li>Q - Open Visual Settings</li>
          <li>Shift + 1-6 - Weather Presets</li>
          <li>Shift + R - Reset All Effects</li>
          <li>Esc - Close Modal</li>
        </ul>
      </div>

      <button 
        onClick={() => setShowStats(!showStats)}
        style={{ marginTop: '12px', fontSize: '11px' }}
      >
        {showStats ? 'Hide' : 'Show'} Stats
      </button>
    </div>
  );
};

/**
 * Main demo component
 */
export const VisualEffectsDemo: React.FC = () => {
  const [enableEnhancements, setEnableEnhancements] = useState(true);
  const [showDemo, setShowDemo] = useState(true);

  useEffect(() => {
    console.log('🎨 Visual Effects Demo loaded');
    console.log('📍 Sample landmarks:', sampleLandmarks.length);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <VisualSettingsProvider>
        {/* Enhanced Cesium Globe */}
        <CesiumGlobeEnhanced
          landmarks={sampleLandmarks}
          enableVisualEnhancements={enableEnhancements}
          showDebugButton={true}
        />

        {/* Demo Controls */}
        {showDemo && <DemoControls />}

        {/* Toggle Controls */}
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 1000
        }}>
          <label style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={enableEnhancements}
              onChange={(e) => setEnableEnhancements(e.target.checked)}
            />
            Enable Visual Enhancements
          </label>
          
          <button
            onClick={() => setShowDemo(!showDemo)}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showDemo ? 'Hide' : 'Show'} Demo Controls
          </button>
        </div>
      </VisualSettingsProvider>
    </div>
  );
};

export default VisualEffectsDemo;