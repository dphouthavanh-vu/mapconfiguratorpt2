import React, { useState } from 'react';
import * as Cesium from 'cesium';
import styles from './AtmosphereDebugPanel.module.scss';
import { AtmosphereConfig, presets } from '../hooks/useAtmosphereConfig';
import { useFPS } from '../hooks/useFPS';
import { usePerformanceMetrics, formatCameraHeight } from '../hooks/usePerformanceMetrics';

interface AtmosphereDebugPanelProps {
  config: AtmosphereConfig;
  updateConfig: (updates: Partial<AtmosphereConfig>) => void;
  resetToDefaults: () => void;
  loadPreset: (presetName: string) => void;
  exportConfig: () => void;
  isOpen: boolean;
  onToggle: () => void;
  viewerRef?: React.MutableRefObject<Cesium.Viewer | null>;
}

const AtmosphereDebugPanel: React.FC<AtmosphereDebugPanelProps> = ({
  config,
  updateConfig,
  resetToDefaults,
  loadPreset,
  exportConfig,
  isOpen,
  onToggle,
  viewerRef,
}) => {
  // Monitor FPS when panel is open
  const fps = useFPS(isOpen);
  const metrics = usePerformanceMetrics(viewerRef || { current: null }, isOpen);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    atmosphere: true,
    skyAtmosphere: false,
    scattering: false,
    animation: false,
    lighting: false,
    sunPosition: false,
    depthLayers: false,
    logo: true,
    bloom: false,
    performance: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderSlider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void
  ) => (
    <div className={styles.control}>
      <div className={styles.sliderLabel}>
        <span>{label}</span>
        <span>{value.toFixed(step < 0.01 ? 4 : 2)}</span>
      </div>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );

  const renderScientificInput = (
    label: string,
    value: number,
    onChange: (value: number) => void
  ) => (
    <div className={styles.control}>
      <div className={styles.inputLabel}>
        <span>{label}</span>
      </div>
      <input
        type="text"
        className={styles.scientificInput}
        value={value.toExponential(2)}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) {
            onChange(parsed);
          }
        }}
      />
    </div>
  );

  const renderToggle = (
    label: string,
    value: boolean,
    onChange: (value: boolean) => void
  ) => (
    <div className={styles.control}>
      <label className={styles.toggleLabel}>
        <span>{label}</span>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.toggleSwitch}></span>
      </label>
    </div>
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.debugPanel}>
      <div className={styles.header}>
        <h2>Atmosphere Debug Controls</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className={styles.fpsCounter}>FPS: {fps}</span>
          <button className={styles.closeButton} onClick={onToggle}>✕</button>
        </div>
      </div>

      <div className={styles.presetControls}>
        <select
          className={styles.presetSelect}
          onChange={(e) => loadPreset(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Load Preset...</option>
          {Object.keys(presets).map(name => (
            <option key={name} value={name}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </option>
          ))}
        </select>
        <button className={styles.actionButton} onClick={resetToDefaults}>
          Reset
        </button>
        <button className={styles.actionButton} onClick={exportConfig}>
          Copy JSON
        </button>
      </div>

      <div className={styles.sections}>
        <div className={styles.section}>
          <h3
            className={styles.sectionHeader}
            onClick={() => toggleSection('logo')}
          >
            <span className={expandedSections.logo ? styles.expanded : ''}>▶</span>
            Logo
          </h3>
          {expandedSections.logo && (
            <div className={styles.sectionContent}>
              {renderSlider('Logo Scale', config.logo.scale, 0.5, 3.0, 0.1,
                (value) => updateConfig({ logo: { ...config.logo, scale: value } })
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3
            className={styles.sectionHeader}
            onClick={() => toggleSection('bloom')}
          >
            <span className={expandedSections.bloom ? styles.expanded : ''}>▶</span>
            Bloom Effect
          </h3>
          {expandedSections.bloom && (
            <div className={styles.sectionContent}>
              {renderToggle('Enable Bloom', config.bloom.enabled,
                (value) => updateConfig({ bloom: { ...config.bloom, enabled: value } })
              )}
              {config.bloom.enabled && (
                <>
                  {renderSlider('Contrast', config.bloom.contrast, -255, 255, 1,
                    (value) => updateConfig({ bloom: { ...config.bloom, contrast: value } })
                  )}
                  {renderSlider('Brightness', config.bloom.brightness, -1, 1, 0.01,
                    (value) => updateConfig({ bloom: { ...config.bloom, brightness: value } })
                  )}
                  {renderToggle('Glow Only', config.bloom.glowOnly,
                    (value) => updateConfig({ bloom: { ...config.bloom, glowOnly: value } })
                  )}
                  {renderSlider('Delta (Blur Spread)', config.bloom.delta, 0.1, 5.0, 0.1,
                    (value) => updateConfig({ bloom: { ...config.bloom, delta: value } })
                  )}
                  {renderSlider('Sigma (Blur Strength)', config.bloom.sigma, 0.5, 10.0, 0.1,
                    (value) => updateConfig({ bloom: { ...config.bloom, sigma: value } })
                  )}
                  {renderSlider('Step Size', config.bloom.stepSize, 0.1, 5.0, 0.1,
                    (value) => updateConfig({ bloom: { ...config.bloom, stepSize: value } })
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3
            className={styles.sectionHeader}
            onClick={() => toggleSection('atmosphere')}
          >
            <span className={expandedSections.atmosphere ? styles.expanded : ''}>▶</span>
            Atmosphere
          </h3>
          {expandedSections.atmosphere && (
            <div className={styles.sectionContent}>
              {renderSlider('Brightness', config.atmosphere.brightnessShift, -1, 1, 0.01,
                (value) => updateConfig({ atmosphere: { ...config.atmosphere, brightnessShift: value } })
              )}
              {renderSlider('Hue', config.atmosphere.hueShift, -1, 1, 0.01,
                (value) => updateConfig({ atmosphere: { ...config.atmosphere, hueShift: value } })
              )}
              {renderSlider('Saturation', config.atmosphere.saturationShift, -1, 1, 0.01,
                (value) => updateConfig({ atmosphere: { ...config.atmosphere, saturationShift: value } })
              )}
              {renderSlider('Light Intensity', config.atmosphere.lightIntensity, 0, 10, 0.1,
                (value) => updateConfig({ atmosphere: { ...config.atmosphere, lightIntensity: value } })
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3
            className={styles.sectionHeader}
            onClick={() => toggleSection('skyAtmosphere')}
          >
            <span className={expandedSections.skyAtmosphere ? styles.expanded : ''}>▶</span>
            Sky Atmosphere
          </h3>
          {expandedSections.skyAtmosphere && (
            <div className={styles.sectionContent}>
              {renderSlider('Sky Brightness', config.skyAtmosphere.brightnessShift, -1, 1, 0.01,
                (value) => updateConfig({ skyAtmosphere: { ...config.skyAtmosphere, brightnessShift: value } })
              )}
              {renderSlider('Sky Hue', config.skyAtmosphere.hueShift, -1, 1, 0.01,
                (value) => updateConfig({ skyAtmosphere: { ...config.skyAtmosphere, hueShift: value } })
              )}
              {renderSlider('Sky Saturation', config.skyAtmosphere.saturationShift, -1, 1, 0.01,
                (value) => updateConfig({ skyAtmosphere: { ...config.skyAtmosphere, saturationShift: value } })
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3
            className={styles.sectionHeader}
            onClick={() => toggleSection('scattering')}
          >
            <span className={expandedSections.scattering ? styles.expanded : ''}>▶</span>
            Scattering
          </h3>
          {expandedSections.scattering && (
            <div className={styles.sectionContent}>
              {renderScientificInput('Rayleigh R', config.scattering.rayleighR,
                (value) => updateConfig({ scattering: { ...config.scattering, rayleighR: value } })
              )}
              {renderScientificInput('Rayleigh G', config.scattering.rayleighG,
                (value) => updateConfig({ scattering: { ...config.scattering, rayleighG: value } })
              )}
              {renderScientificInput('Rayleigh B', config.scattering.rayleighB,
                (value) => updateConfig({ scattering: { ...config.scattering, rayleighB: value } })
              )}
              {renderScientificInput('Mie Scattering', config.scattering.mieScattering,
                (value) => updateConfig({ scattering: { ...config.scattering, mieScattering: value } })
              )}
              {renderSlider('Mie Anisotropy', config.scattering.mieAnisotropy, -1, 1, 0.01,
                (value) => updateConfig({ scattering: { ...config.scattering, mieAnisotropy: value } })
              )}

              <div className={styles.separator} />
              <div className={styles.sectionLabel}>Atmosphere Thickness</div>

              {renderSlider('Rayleigh Scale Height (m)', config.scattering.rayleighScaleHeight, 1000, 20000, 100,
                (value) => updateConfig({ scattering: { ...config.scattering, rayleighScaleHeight: value } })
              )}
              {renderSlider('Mie Scale Height (m)', config.scattering.mieScaleHeight, 500, 5000, 50,
                (value) => updateConfig({ scattering: { ...config.scattering, mieScaleHeight: value } })
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3
            className={styles.sectionHeader}
            onClick={() => toggleSection('animation')}
          >
            <span className={expandedSections.animation ? styles.expanded : ''}>▶</span>
            Animation
          </h3>
          {expandedSections.animation && (
            <div className={styles.sectionContent}>
              {renderToggle('Enable Pulsing', config.animation.enabled,
                (value) => updateConfig({ animation: { ...config.animation, enabled: value } })
              )}
              {renderSlider('Pulse Speed', config.animation.pulseSpeed, 0.0001, 0.01, 0.0001,
                (value) => updateConfig({ animation: { ...config.animation, pulseSpeed: value } })
              )}
              {renderSlider('Pulse Amount', config.animation.pulseAmount, 0, 0.2, 0.001,
                (value) => updateConfig({ animation: { ...config.animation, pulseAmount: value } })
              )}
              {renderSlider('Base Brightness', config.animation.baseBrightness, 0, 0.5, 0.01,
                (value) => updateConfig({ animation: { ...config.animation, baseBrightness: value } })
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3
            className={styles.sectionHeader}
            onClick={() => toggleSection('lighting')}
          >
            <span className={expandedSections.lighting ? styles.expanded : ''}>▶</span>
            Lighting Distances
          </h3>
          {expandedSections.lighting && (
            <div className={styles.sectionContent}>
              <div className={styles.control}>
                <div className={styles.inputLabel}>
                  <span>Fade Out Distance</span>
                </div>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={config.lighting.fadeOutDistance}
                  onChange={(e) => updateConfig({
                    lighting: { ...config.lighting, fadeOutDistance: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className={styles.control}>
                <div className={styles.inputLabel}>
                  <span>Fade In Distance</span>
                </div>
                <input
                  type="number"
                  className={styles.numberInput}
                  value={config.lighting.fadeInDistance}
                  onChange={(e) => updateConfig({
                    lighting: { ...config.lighting, fadeInDistance: parseInt(e.target.value) }
                  })}
                />
              </div>

              <div className={styles.separator}></div>
              <div className={styles.sectionLabel}>Dynamic Lighting</div>

              {renderToggle('Dynamic Atmosphere Lighting', config.lighting.dynamicAtmosphereLighting,
                (value) => updateConfig({ lighting: { ...config.lighting, dynamicAtmosphereLighting: value } })
              )}

              {config.lighting.dynamicAtmosphereLighting && (
                <>
                  {renderToggle('Use Real Sun Position', config.lighting.dynamicAtmosphereLightingFromSun,
                    (value) => updateConfig({ lighting: { ...config.lighting, dynamicAtmosphereLightingFromSun: value } })
                  )}

                  {renderSlider('Minimum Brightness', config.lighting.minimumBrightness, 0, 1, 0.05,
                    (value) => updateConfig({ lighting: { ...config.lighting, minimumBrightness: value } })
                  )}

                  {renderSlider('Night Intensity', config.lighting.nightIntensity, 0, 1, 0.05,
                    (value) => updateConfig({ lighting: { ...config.lighting, nightIntensity: value } })
                  )}

                  {renderSlider('Twilight Angle (°)', config.lighting.twilightAngle, 0, 30, 1,
                    (value) => updateConfig({ lighting: { ...config.lighting, twilightAngle: value } })
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3
            className={styles.sectionHeader}
            onClick={() => toggleSection('sunPosition')}
          >
            <span className={expandedSections.sunPosition ? styles.expanded : ''}>▶</span>
            Sun Position
          </h3>
          {expandedSections.sunPosition && (
            <div className={styles.sectionContent}>
              {renderToggle('Custom Sun Position', config.sunPosition.enabled,
                (value) => updateConfig({ sunPosition: { ...config.sunPosition, enabled: value } })
              )}
              {config.sunPosition.enabled && (
                <>
                  {renderSlider('Azimuth (°)', config.sunPosition.azimuth, 0, 360, 1,
                    (value) => updateConfig({ sunPosition: { ...config.sunPosition, azimuth: value } })
                  )}
                  <div className={styles.compassHint}>
                    {getCompassDirection(config.sunPosition.azimuth)}
                  </div>
                  {renderSlider('Elevation (°)', config.sunPosition.elevation, -90, 90, 1,
                    (value) => updateConfig({ sunPosition: { ...config.sunPosition, elevation: value } })
                  )}
                  {renderSlider('Light Intensity', config.sunPosition.intensity, 0, 5, 0.1,
                    (value) => updateConfig({ sunPosition: { ...config.sunPosition, intensity: value } })
                  )}
                </>
              )}

              <div className={styles.separator}></div>
              <div className={styles.sectionLabel}>Sun Visuals</div>
              {renderToggle('Show Sun', config.sunVisuals.showSun,
                (value) => updateConfig({ sunVisuals: { ...config.sunVisuals, showSun: value } })
              )}
              {renderSlider('Glow Size', config.sunVisuals.glowSize, 0.1, 3, 0.1,
                (value) => updateConfig({ sunVisuals: { ...config.sunVisuals, glowSize: value } })
              )}
              {renderSlider('Color Temperature', config.sunVisuals.colorTemperature, 0, 1, 0.01,
                (value) => updateConfig({ sunVisuals: { ...config.sunVisuals, colorTemperature: value } })
              )}
              <div className={styles.compassHint}>
                {config.sunVisuals.colorTemperature < 0.3 ? 'Cool' :
                 config.sunVisuals.colorTemperature > 0.7 ? 'Warm' : 'Neutral'}
              </div>

              <div className={styles.separator}></div>
              <div className={styles.sectionLabel}>Time of Day</div>
              {renderToggle('Use Time of Day', config.timeOfDay.enabled,
                (value) => updateConfig({ timeOfDay: { ...config.timeOfDay, enabled: value } })
              )}
              {config.timeOfDay.enabled && (
                <>
                  {renderSlider('Hour', config.timeOfDay.hour, 0, 24, 0.5,
                    (value) => updateConfig({ timeOfDay: { ...config.timeOfDay, hour: value } })
                  )}
                  <div className={styles.compassHint}>
                    {Math.floor(config.timeOfDay.hour)}:{String(Math.floor((config.timeOfDay.hour % 1) * 60)).padStart(2, '0')}
                  </div>
                  {renderSlider('Animation Speed', config.timeOfDay.animationSpeed, 0, 10, 0.1,
                    (value) => updateConfig({ timeOfDay: { ...config.timeOfDay, animationSpeed: value } })
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3
            className={styles.sectionHeader}
            onClick={() => toggleSection('camera')}
          >
            <span className={expandedSections.camera ? styles.expanded : ''}>▶</span>
            Camera
          </h3>
          {expandedSections.camera && (
            <div className={styles.sectionContent}>
              {renderSlider('Distance (km)', config.camera.distance / 1000, 0.1, config.camera.maxDistance / 1000, 10,
                (value) => updateConfig({ camera: { ...config.camera, distance: value * 1000 } })
              )}
              <div className={styles.compassHint}>
                {config.camera.distance < 1000 ? `${config.camera.distance.toFixed(0)}m` :
                 config.camera.distance < 10000000 ? 'Close View' :
                 config.camera.distance > 30000000 ? 'Far View' : 'Normal View'}
              </div>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3
            className={styles.sectionHeader}
            onClick={() => toggleSection('depthLayers')}
          >
            <span className={expandedSections.depthLayers ? styles.expanded : ''}>▶</span>
            Depth Layers
          </h3>
          {expandedSections.depthLayers && (
            <div className={styles.sectionContent}>
              <h4 className={styles.subHeader}>Particles</h4>
              {renderToggle('Enable Particles', config.depthLayers.particles.enabled,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, particles: { ...config.depthLayers.particles, enabled: value } } })
              )}
              {config.depthLayers.particles.enabled && (
                <>
                  {renderSlider('Count', config.depthLayers.particles.count, 10, 500, 10,
                    (value) => updateConfig({ depthLayers: { ...config.depthLayers, particles: { ...config.depthLayers.particles, count: value } } })
                  )}
                  {renderSlider('Speed', config.depthLayers.particles.speed, 0.00001, 0.001, 0.00001,
                    (value) => updateConfig({ depthLayers: { ...config.depthLayers, particles: { ...config.depthLayers.particles, speed: value } } })
                  )}
                  {renderSlider('Size Min', config.depthLayers.particles.sizeMin, 0.5, 5, 0.5,
                    (value) => updateConfig({ depthLayers: { ...config.depthLayers, particles: { ...config.depthLayers.particles, sizeMin: value } } })
                  )}
                  {renderSlider('Size Max', config.depthLayers.particles.sizeMax, 1, 10, 0.5,
                    (value) => updateConfig({ depthLayers: { ...config.depthLayers, particles: { ...config.depthLayers.particles, sizeMax: value } } })
                  )}
                  {renderSlider('Opacity Min', config.depthLayers.particles.opacityMin, 0, 0.5, 0.01,
                    (value) => updateConfig({ depthLayers: { ...config.depthLayers, particles: { ...config.depthLayers.particles, opacityMin: value } } })
                  )}
                  {renderSlider('Opacity Max', config.depthLayers.particles.opacityMax, 0.1, 1, 0.01,
                    (value) => updateConfig({ depthLayers: { ...config.depthLayers, particles: { ...config.depthLayers.particles, opacityMax: value } } })
                  )}
                </>
              )}

              <h4 className={styles.subHeader}>Orbital Rings</h4>
              {renderToggle('Enable Rings', config.depthLayers.orbitalRings.enabled,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, orbitalRings: { ...config.depthLayers.orbitalRings, enabled: value } } })
              )}
              {config.depthLayers.orbitalRings.enabled && (
                <>
                  {renderSlider('Ring Count', config.depthLayers.orbitalRings.count, 1, 5, 1,
                    (value) => updateConfig({ depthLayers: { ...config.depthLayers, orbitalRings: { ...config.depthLayers.orbitalRings, count: value } } })
                  )}
                  {renderSlider('Ring Opacity', config.depthLayers.orbitalRings.opacity, 0, 0.5, 0.01,
                    (value) => updateConfig({ depthLayers: { ...config.depthLayers, orbitalRings: { ...config.depthLayers.orbitalRings, opacity: value } } })
                  )}
                  {renderSlider('Rotation Speed', config.depthLayers.orbitalRings.rotationSpeed, 0, 0.001, 0.00001,
                    (value) => updateConfig({ depthLayers: { ...config.depthLayers, orbitalRings: { ...config.depthLayers.orbitalRings, rotationSpeed: value } } })
                  )}
                </>
              )}

              <h4 className={styles.subHeader}>Star Field</h4>
              {renderToggle('Enable Stars', config.depthLayers.starField.enabled,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, starField: { ...config.depthLayers.starField, enabled: value } } })
              )}
              {config.depthLayers.starField.enabled && (
                <>
                  {renderSlider('Star Count', config.depthLayers.starField.count, 100, 2000, 100,
                    (value) => updateConfig({ depthLayers: { ...config.depthLayers, starField: { ...config.depthLayers.starField, count: value } } })
                  )}
                  {renderSlider('Brightness', config.depthLayers.starField.brightness, 0, 1, 0.01,
                    (value) => updateConfig({ depthLayers: { ...config.depthLayers, starField: { ...config.depthLayers.starField, brightness: value } } })
                  )}
                </>
              )}

              <h4 className={styles.subHeader}>Cloud Layers</h4>

              {/* Opacity Controls */}
              {renderSlider('Low Cloud Opacity', config.depthLayers.clouds.lowOpacity, 0, 1, 0.01,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, lowOpacity: value } } })
              )}
              {renderSlider('Mid Cloud Opacity', config.depthLayers.clouds.midOpacity, 0, 1, 0.01,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, midOpacity: value } } })
              )}
              {renderSlider('High Cloud Opacity', config.depthLayers.clouds.highOpacity, 0, 1, 0.01,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, highOpacity: value } } })
              )}

              {/* Texture Controls */}
              <div className={styles.separator}></div>
              <div className={styles.sectionLabel}>Texture</div>
              {renderSlider('Texture Scale X', config.depthLayers.clouds.textureScaleX, 0.5, 5, 0.1,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, textureScaleX: value } } })
              )}
              {renderSlider('Texture Scale Y', config.depthLayers.clouds.textureScaleY, 0.5, 5, 0.1,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, textureScaleY: value } } })
              )}

              {/* Layer Speed Controls */}
              <div className={styles.separator}></div>
              <div className={styles.sectionLabel}>Animation Speed</div>
              {renderSlider('Low Speed', config.depthLayers.clouds.lowSpeed, 0, 0.05, 0.001,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, lowSpeed: value } } })
              )}
              {renderSlider('Mid Speed', config.depthLayers.clouds.midSpeed, 0, 0.05, 0.001,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, midSpeed: value } } })
              )}
              {renderSlider('High Speed', config.depthLayers.clouds.highSpeed, 0, 0.05, 0.001,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, highSpeed: value } } })
              )}

              {/* Layer Rotation Controls */}
              <div className={styles.separator}></div>
              <div className={styles.sectionLabel}>Initial Rotation</div>
              {renderSlider('Low Rotation', config.depthLayers.clouds.lowRotation, 0, 360, 1,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, lowRotation: value } } })
              )}
              {renderSlider('Mid Rotation', config.depthLayers.clouds.midRotation, 0, 360, 1,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, midRotation: value } } })
              )}
              {renderSlider('High Rotation', config.depthLayers.clouds.highRotation, 0, 360, 1,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, highRotation: value } } })
              )}

              {/* Shape Controls */}
              <div className={styles.separator}></div>
              <div className={styles.sectionLabel}>Shape</div>
              {renderSlider('Coverage', config.depthLayers.clouds.coverage, 0, 1, 0.01,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, coverage: value } } })
              )}
              {renderSlider('Density', config.depthLayers.clouds.density, 0, 1, 0.01,
                (value) => updateConfig({ depthLayers: { ...config.depthLayers, clouds: { ...config.depthLayers.clouds, density: value } } })
              )}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h3
            className={styles.sectionHeader}
            onClick={() => toggleSection('performance')}
          >
            <span className={expandedSections.performance ? styles.expanded : ''}>▶</span>
            Performance Metrics
          </h3>
          {expandedSections.performance && (
            <div className={styles.sectionContent}>
              <div className={styles.metricsGrid}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>FPS:</span>
                  <span className={styles.metricValue}>{metrics.fps}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Render Time:</span>
                  <span className={styles.metricValue}>{metrics.renderTime.toFixed(2)}ms</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Primitives:</span>
                  <span className={styles.metricValue}>{metrics.primitiveCount}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Camera Height:</span>
                  <span className={styles.metricValue}>{formatCameraHeight(metrics.cameraHeight)}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Tiles:</span>
                  <span className={styles.metricValue}>{metrics.tilesLoaded} / {metrics.tilesTotal}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Texture Mem:</span>
                  <span className={styles.metricValue}>~{metrics.textureMemory}MB</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Request Render:</span>
                  <span className={styles.metricValue}>{metrics.requestRenderMode ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get compass direction from azimuth
const getCompassDirection = (azimuth: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((azimuth % 360) / 22.5)) % 16;
  return directions[index];
};

export default AtmosphereDebugPanel;