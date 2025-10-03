/**
 * T035: Optimized Settings Panel
 * Performance-optimized version with memoization and lazy loading
 */

import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react';
import { EffectToggle } from './EffectToggle';
import type { VisualConfiguration, EffectCategory } from '../../types/visualSettings';

// Lazy load heavy setting groups
const AtmosphereSettings = lazy(() => import('./settings/AtmosphereSettings'));
const TerrainSettings = lazy(() => import('./settings/TerrainSettings'));
const WaterSettings = lazy(() => import('./settings/WaterSettings'));
const WeatherSettings = lazy(() => import('./settings/WeatherSettings'));
const PostProcessingSettings = lazy(() => import('./settings/PostProcessingSettings'));
const CameraSettings = lazy(() => import('./settings/CameraSettings'));

interface OptimizedSettingsPanelProps {
  category: EffectCategory;
  config: VisualConfiguration;
  onUpdate: (updates: Partial<VisualConfiguration>) => void;
}

/**
 * Memoized settings panel to prevent unnecessary re-renders
 */
export const OptimizedSettingsPanel = memo<OptimizedSettingsPanelProps>(({
  category,
  config,
  onUpdate
}) => {
  // Memoize category config to prevent re-renders
  const categoryConfig = useMemo(() => {
    return config[category as keyof VisualConfiguration];
  }, [config, category]);

  // Memoized update handler
  const handleCategoryUpdate = useCallback((updates: any) => {
    onUpdate({ [category]: { ...categoryConfig, ...updates } });
  }, [category, categoryConfig, onUpdate]);

  // Loading fallback
  const LoadingFallback = () => (
    <div className="settings-loading">
      <div className="spinner" />
      <p>Loading settings...</p>
    </div>
  );

  // Render appropriate settings based on category
  const renderSettings = () => {
    return (
      <Suspense fallback={<LoadingFallback />}>
        {(() => {
          switch (category) {
            case 'atmosphere':
              return (
                <AtmosphereSettings
                  config={config.atmosphere}
                  onUpdate={handleCategoryUpdate}
                />
              );
            
            case 'terrain':
              return (
                <TerrainSettings
                  config={config.terrain}
                  onUpdate={handleCategoryUpdate}
                />
              );
            
            case 'water':
              return (
                <WaterSettings
                  config={config.water}
                  onUpdate={handleCategoryUpdate}
                />
              );
            
            case 'weather':
              return (
                <WeatherSettings
                  config={config.weather}
                  onUpdate={handleCategoryUpdate}
                />
              );
            
            case 'postProcessing':
              return (
                <PostProcessingSettings
                  config={config.postProcessing}
                  onUpdate={handleCategoryUpdate}
                />
              );
            
            case 'camera':
              return (
                <CameraSettings
                  config={config.camera}
                  onUpdate={handleCategoryUpdate}
                />
              );
            
            default:
              return <div>Select a category</div>;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div className="settings-panel optimized" role="tabpanel" id={`panel-${category}`}>
      <h3 className="panel-title">
        {category.charAt(0).toUpperCase() + category.slice(1)} Settings
      </h3>
      {renderSettings()}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.category === nextProps.category &&
    JSON.stringify(prevProps.config[prevProps.category as keyof VisualConfiguration]) ===
    JSON.stringify(nextProps.config[nextProps.category as keyof VisualConfiguration])
  );
});

OptimizedSettingsPanel.displayName = 'OptimizedSettingsPanel';