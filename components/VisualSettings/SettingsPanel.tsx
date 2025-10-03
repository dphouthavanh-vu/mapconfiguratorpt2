/**
 * T023: Settings Panel Component
 * Individual settings panel for each effect category
 */

import React, { useMemo } from 'react';
import { EffectToggle } from './EffectToggle';
import type { 
  VisualConfiguration, 
  EffectCategory,
  AtmosphereConfig,
  TerrainConfig,
  WaterConfig,
  WeatherConfig,
  PostProcessConfig,
  CameraConfig
} from '../../types/visualSettings';
import './SettingsPanel.scss';

interface SettingsPanelProps {
  category: EffectCategory;
  config: VisualConfiguration;
  onUpdate: (updates: Partial<VisualConfiguration>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  category,
  config,
  onUpdate
}) => {
  // Get category-specific configuration
  const categoryConfig = useMemo(() => {
    switch (category) {
      case 'atmosphere':
        return config.atmosphere;
      case 'terrain':
        return config.terrain;
      case 'water':
        return config.water;
      case 'weather':
        return config.weather;
      case 'postProcessing':
        return config.postProcessing;
      case 'camera':
        return config.camera;
      default:
        return null;
    }
  }, [category, config]);

  // Update category-specific configuration
  const handleCategoryUpdate = (updates: any) => {
    onUpdate({ [category]: { ...categoryConfig, ...updates } });
  };

  // Render atmosphere settings
  const renderAtmosphereSettings = () => {
    const atmosphere = config.atmosphere;
    
    return (
      <div className="settings-group">
        <EffectToggle
          label="Enable Atmosphere"
          enabled={atmosphere.enabled}
          onToggle={(enabled) => handleCategoryUpdate({ enabled })}
        />
        
        {atmosphere.enabled && (
          <>
            <div className="setting-row">
              <label>Brightness Shift</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={atmosphere.brightnessShift}
                onChange={(e) => handleCategoryUpdate({ 
                  brightnessShift: parseFloat(e.target.value) 
                })}
              />
              <span className="value">{atmosphere.brightnessShift.toFixed(1)}</span>
            </div>

            <div className="setting-row">
              <label>Hue Shift</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={atmosphere.hueShift}
                onChange={(e) => handleCategoryUpdate({ 
                  hueShift: parseFloat(e.target.value) 
                })}
              />
              <span className="value">{atmosphere.hueShift.toFixed(1)}</span>
            </div>

            <div className="setting-row">
              <label>Saturation Shift</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={atmosphere.saturationShift}
                onChange={(e) => handleCategoryUpdate({ 
                  saturationShift: parseFloat(e.target.value) 
                })}
              />
              <span className="value">{atmosphere.saturationShift.toFixed(1)}</span>
            </div>

            <div className="setting-row">
              <label>Light Intensity</label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={atmosphere.lightIntensity}
                onChange={(e) => handleCategoryUpdate({ 
                  lightIntensity: parseFloat(e.target.value) 
                })}
              />
              <span className="value">{atmosphere.lightIntensity.toFixed(1)}</span>
            </div>

            <EffectToggle
              label="Dynamic Lighting"
              enabled={atmosphere.enableDynamicLighting}
              onToggle={(enabled) => handleCategoryUpdate({ 
                enableDynamicLighting: enabled 
              })}
            />

            <EffectToggle
              label="Sky Box"
              enabled={atmosphere.enableSkyBox}
              onToggle={(enabled) => handleCategoryUpdate({ 
                enableSkyBox: enabled 
              })}
            />
          </>
        )}
      </div>
    );
  };

  // Render terrain settings
  const renderTerrainSettings = () => {
    const terrain = config.terrain;
    
    return (
      <div className="settings-group">
        <EffectToggle
          label="Enable Terrain"
          enabled={terrain.enabled}
          onToggle={(enabled) => handleCategoryUpdate({ enabled })}
        />
        
        {terrain.enabled && (
          <>
            <div className="setting-row">
              <label>Terrain Provider</label>
              <select
                value={terrain.provider}
                onChange={(e) => handleCategoryUpdate({ provider: e.target.value })}
              >
                <option value="ellipsoid">Flat (Best Performance)</option>
                <option value="cesium-small">Low Resolution</option>
                <option value="cesium-world">High Resolution</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="setting-row">
              <label>Vertical Exaggeration</label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={terrain.exaggeration}
                onChange={(e) => handleCategoryUpdate({ 
                  exaggeration: parseFloat(e.target.value) 
                })}
              />
              <span className="value">{terrain.exaggeration.toFixed(1)}x</span>
            </div>

            <div className="setting-row">
              <label>Detail Level</label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={terrain.detailLevel}
                onChange={(e) => handleCategoryUpdate({ 
                  detailLevel: parseInt(e.target.value) 
                })}
              />
              <span className="value">{terrain.detailLevel}</span>
            </div>

            <EffectToggle
              label="Enable Lighting"
              enabled={terrain.enableLighting}
              onToggle={(enabled) => handleCategoryUpdate({ 
                enableLighting: enabled 
              })}
            />

            <EffectToggle
              label="Depth Test Against Terrain"
              enabled={terrain.depthTestAgainstTerrain}
              onToggle={(enabled) => handleCategoryUpdate({ 
                depthTestAgainstTerrain: enabled 
              })}
            />

            <EffectToggle
              label="Show Water Mask"
              enabled={terrain.showWaterMask}
              onToggle={(enabled) => handleCategoryUpdate({ 
                showWaterMask: enabled 
              })}
            />
          </>
        )}
      </div>
    );
  };

  // Render water settings
  const renderWaterSettings = () => {
    const water = config.water;
    
    return (
      <div className="settings-group">
        <EffectToggle
          label="Enable Water"
          enabled={water.enabled}
          onToggle={(enabled) => handleCategoryUpdate({ enabled })}
        />
        
        {water.enabled && (
          <>
            <div className="setting-row">
              <label>Water Color</label>
              <input
                type="color"
                value={water.color}
                onChange={(e) => handleCategoryUpdate({ color: e.target.value })}
              />
              <span className="value">{water.color}</span>
            </div>

            <div className="setting-row">
              <label>Transparency</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={water.transparency}
                onChange={(e) => handleCategoryUpdate({ 
                  transparency: parseFloat(e.target.value) 
                })}
              />
              <span className="value">{(water.transparency * 100).toFixed(0)}%</span>
            </div>

            <div className="setting-row">
              <label>Wave Speed</label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={water.waveSpeed}
                onChange={(e) => handleCategoryUpdate({ 
                  waveSpeed: parseFloat(e.target.value) 
                })}
              />
              <span className="value">{water.waveSpeed.toFixed(1)}</span>
            </div>

            <div className="setting-row">
              <label>Wave Amplitude</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={water.waveAmplitude}
                onChange={(e) => handleCategoryUpdate({ 
                  waveAmplitude: parseFloat(e.target.value) 
                })}
              />
              <span className="value">{water.waveAmplitude.toFixed(1)}</span>
            </div>

            <EffectToggle
              label="Wave Animation"
              enabled={water.waveAnimation}
              onToggle={(enabled) => handleCategoryUpdate({ 
                waveAnimation: enabled 
              })}
            />

            <div className="setting-row">
              <label>Reflection Intensity</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={water.reflectionIntensity}
                onChange={(e) => handleCategoryUpdate({ 
                  reflectionIntensity: parseFloat(e.target.value) 
                })}
              />
              <span className="value">{(water.reflectionIntensity * 100).toFixed(0)}%</span>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render weather settings
  const renderWeatherSettings = () => {
    const weather = config.weather;
    
    return (
      <div className="settings-group">
        {/* Clouds */}
        <h4>Clouds</h4>
        <EffectToggle
          label="Enable Clouds"
          enabled={weather.clouds.enabled}
          onToggle={(enabled) => handleCategoryUpdate({ 
            clouds: { ...weather.clouds, enabled }
          })}
        />
        
        {weather.clouds.enabled && (
          <>
            <div className="setting-row">
              <label>Coverage</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={weather.clouds.coverage}
                onChange={(e) => handleCategoryUpdate({ 
                  clouds: { ...weather.clouds, coverage: parseFloat(e.target.value) }
                })}
              />
              <span className="value">{(weather.clouds.coverage * 100).toFixed(0)}%</span>
            </div>

            <div className="setting-row">
              <label>Altitude</label>
              <input
                type="range"
                min="1000"
                max="10000"
                step="500"
                value={weather.clouds.altitude}
                onChange={(e) => handleCategoryUpdate({ 
                  clouds: { ...weather.clouds, altitude: parseInt(e.target.value) }
                })}
              />
              <span className="value">{weather.clouds.altitude}m</span>
            </div>

            <div className="setting-row">
              <label>Speed</label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={weather.clouds.speed}
                onChange={(e) => handleCategoryUpdate({ 
                  clouds: { ...weather.clouds, speed: parseFloat(e.target.value) }
                })}
              />
              <span className="value">{weather.clouds.speed.toFixed(1)}</span>
            </div>
          </>
        )}

        {/* Fog */}
        <h4>Fog</h4>
        <EffectToggle
          label="Enable Fog"
          enabled={weather.fog.enabled}
          onToggle={(enabled) => handleCategoryUpdate({ 
            fog: { ...weather.fog, enabled }
          })}
        />
        
        {weather.fog.enabled && (
          <>
            <div className="setting-row">
              <label>Density</label>
              <input
                type="range"
                min="0"
                max="0.01"
                step="0.001"
                value={weather.fog.density}
                onChange={(e) => handleCategoryUpdate({ 
                  fog: { ...weather.fog, density: parseFloat(e.target.value) }
                })}
              />
              <span className="value">{weather.fog.density.toFixed(3)}</span>
            </div>

            <div className="setting-row">
              <label>Minimum Brightness</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={weather.fog.minimumBrightness}
                onChange={(e) => handleCategoryUpdate({ 
                  fog: { ...weather.fog, minimumBrightness: parseFloat(e.target.value) }
                })}
              />
              <span className="value">{weather.fog.minimumBrightness.toFixed(1)}</span>
            </div>
          </>
        )}

        {/* Precipitation */}
        <h4>Precipitation</h4>
        <EffectToggle
          label="Enable Precipitation"
          enabled={weather.precipitation.enabled}
          onToggle={(enabled) => handleCategoryUpdate({ 
            precipitation: { ...weather.precipitation, enabled }
          })}
        />
        
        {weather.precipitation.enabled && (
          <>
            <div className="setting-row">
              <label>Type</label>
              <select
                value={weather.precipitation.type}
                onChange={(e) => handleCategoryUpdate({ 
                  precipitation: { ...weather.precipitation, type: e.target.value as any }
                })}
              >
                <option value="rain">Rain</option>
                <option value="snow">Snow</option>
                <option value="storm">Storm</option>
              </select>
            </div>

            <div className="setting-row">
              <label>Intensity</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={weather.precipitation.intensity}
                onChange={(e) => handleCategoryUpdate({ 
                  precipitation: { ...weather.precipitation, intensity: parseFloat(e.target.value) }
                })}
              />
              <span className="value">{(weather.precipitation.intensity * 100).toFixed(0)}%</span>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render post-processing settings
  const renderPostProcessingSettings = () => {
    const pp = config.postProcessing;
    
    return (
      <div className="settings-group">
        {/* FXAA */}
        <h4>Anti-Aliasing (FXAA)</h4>
        <EffectToggle
          label="Enable FXAA"
          enabled={pp.fxaa.enabled}
          onToggle={(enabled) => handleCategoryUpdate({ 
            fxaa: { ...pp.fxaa, enabled }
          })}
        />

        {/* Bloom */}
        <h4>Bloom</h4>
        <EffectToggle
          label="Enable Bloom"
          enabled={pp.bloom.enabled}
          onToggle={(enabled) => handleCategoryUpdate({ 
            bloom: { ...pp.bloom, enabled }
          })}
        />
        
        {pp.bloom.enabled && (
          <>
            <div className="setting-row">
              <label>Brightness</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={pp.bloom.brightness}
                onChange={(e) => handleCategoryUpdate({ 
                  bloom: { ...pp.bloom, brightness: parseFloat(e.target.value) }
                })}
              />
              <span className="value">{pp.bloom.brightness.toFixed(1)}</span>
            </div>

            <div className="setting-row">
              <label>Contrast</label>
              <input
                type="range"
                min="0"
                max="255"
                step="1"
                value={pp.bloom.contrast}
                onChange={(e) => handleCategoryUpdate({ 
                  bloom: { ...pp.bloom, contrast: parseInt(e.target.value) }
                })}
              />
              <span className="value">{pp.bloom.contrast}</span>
            </div>
          </>
        )}

        {/* Ambient Occlusion */}
        <h4>Ambient Occlusion</h4>
        <EffectToggle
          label="Enable AO"
          enabled={pp.ambientOcclusion.enabled}
          onToggle={(enabled) => handleCategoryUpdate({ 
            ambientOcclusion: { ...pp.ambientOcclusion, enabled }
          })}
        />
        
        {pp.ambientOcclusion.enabled && (
          <div className="setting-row">
            <label>Intensity</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={pp.ambientOcclusion.intensity}
              onChange={(e) => handleCategoryUpdate({ 
                ambientOcclusion: { ...pp.ambientOcclusion, intensity: parseFloat(e.target.value) }
              })}
            />
            <span className="value">{pp.ambientOcclusion.intensity.toFixed(1)}</span>
          </div>
        )}

        {/* Color Correction */}
        <h4>Color Correction</h4>
        <EffectToggle
          label="Enable Color Correction"
          enabled={pp.colorCorrection.enabled}
          onToggle={(enabled) => handleCategoryUpdate({ 
            colorCorrection: { ...pp.colorCorrection, enabled }
          })}
        />
        
        {pp.colorCorrection.enabled && (
          <>
            <div className="setting-row">
              <label>Brightness</label>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.05"
                value={pp.colorCorrection.brightness}
                onChange={(e) => handleCategoryUpdate({ 
                  colorCorrection: { ...pp.colorCorrection, brightness: parseFloat(e.target.value) }
                })}
              />
              <span className="value">{pp.colorCorrection.brightness.toFixed(2)}</span>
            </div>

            <div className="setting-row">
              <label>Contrast</label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={pp.colorCorrection.contrast}
                onChange={(e) => handleCategoryUpdate({ 
                  colorCorrection: { ...pp.colorCorrection, contrast: parseFloat(e.target.value) }
                })}
              />
              <span className="value">{pp.colorCorrection.contrast.toFixed(2)}</span>
            </div>

            <div className="setting-row">
              <label>Saturation</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={pp.colorCorrection.saturation}
                onChange={(e) => handleCategoryUpdate({ 
                  colorCorrection: { ...pp.colorCorrection, saturation: parseFloat(e.target.value) }
                })}
              />
              <span className="value">{pp.colorCorrection.saturation.toFixed(1)}</span>
            </div>

            <div className="setting-row">
              <label>Gamma</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={pp.colorCorrection.gamma}
                onChange={(e) => handleCategoryUpdate({ 
                  colorCorrection: { ...pp.colorCorrection, gamma: parseFloat(e.target.value) }
                })}
              />
              <span className="value">{pp.colorCorrection.gamma.toFixed(1)}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render camera settings
  const renderCameraSettings = () => {
    const camera = config.camera;
    
    return (
      <div className="settings-group">
        <EffectToggle
          label="Enable User Control"
          enabled={camera.enableUserControl}
          onToggle={(enabled) => handleCategoryUpdate({ 
            enableUserControl: enabled 
          })}
        />

        <EffectToggle
          label="Smooth Transitions"
          enabled={camera.smoothTransitions}
          onToggle={(enabled) => handleCategoryUpdate({ 
            smoothTransitions: enabled 
          })}
        />

        <EffectToggle
          label="Inertia"
          enabled={camera.inertiaEnabled}
          onToggle={(enabled) => handleCategoryUpdate({ 
            inertiaEnabled: enabled 
          })}
        />

        <EffectToggle
          label="Collision Detection"
          enabled={camera.collisionDetection}
          onToggle={(enabled) => handleCategoryUpdate({ 
            collisionDetection: enabled 
          })}
        />

        <div className="setting-row">
          <label>Min Zoom Distance</label>
          <input
            type="range"
            min="1"
            max="1000"
            step="10"
            value={camera.minZoomDistance}
            onChange={(e) => handleCategoryUpdate({ 
              minZoomDistance: parseInt(e.target.value) 
            })}
          />
          <span className="value">{camera.minZoomDistance}m</span>
        </div>

        <div className="setting-row">
          <label>Max Zoom Distance</label>
          <input
            type="range"
            min="10000"
            max="50000000"
            step="100000"
            value={camera.maxZoomDistance}
            onChange={(e) => handleCategoryUpdate({ 
              maxZoomDistance: parseInt(e.target.value) 
            })}
          />
          <span className="value">{(camera.maxZoomDistance / 1000000).toFixed(1)}Mm</span>
        </div>

        <h4>Auto-Rotation</h4>
        <EffectToggle
          label="Enable Auto-Rotate"
          enabled={camera.autoRotate.enabled}
          onToggle={(enabled) => handleCategoryUpdate({ 
            autoRotate: { ...camera.autoRotate, enabled }
          })}
        />
        
        {camera.autoRotate.enabled && (
          <div className="setting-row">
            <label>Speed</label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={camera.autoRotate.speed}
              onChange={(e) => handleCategoryUpdate({ 
                autoRotate: { ...camera.autoRotate, speed: parseFloat(e.target.value) }
              })}
            />
            <span className="value">{camera.autoRotate.speed.toFixed(1)}</span>
          </div>
        )}
      </div>
    );
  };

  // Render based on category
  const renderContent = () => {
    switch (category) {
      case 'atmosphere':
        return renderAtmosphereSettings();
      case 'terrain':
        return renderTerrainSettings();
      case 'water':
        return renderWaterSettings();
      case 'weather':
        return renderWeatherSettings();
      case 'postProcessing':
        return renderPostProcessingSettings();
      case 'camera':
        return renderCameraSettings();
      default:
        return <div>Select a category</div>;
    }
  };

  return (
    <div className="settings-panel" role="tabpanel" id={`panel-${category}`}>
      <h3 className="panel-title">
        {category.charAt(0).toUpperCase() + category.slice(1)} Settings
      </h3>
      {renderContent()}
    </div>
  );
};