/**
 * T025: Quality Preset Selector Component
 * Dropdown selector for quality presets with visual indicators
 */

import React from 'react';
import { useVisualSettings } from '../../context/VisualSettingsContext';
import type { QualityLevel } from '../../types/visualSettings';
import './QualityPresetSelector.scss';

export const QualityPresetSelector: React.FC = () => {
  const { config, loadPreset } = useVisualSettings();

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as QualityLevel;
    loadPreset(preset);
  };

  const getQualityDescription = (level: QualityLevel): string => {
    switch (level) {
      case 'low':
        return 'Best performance, reduced visuals';
      case 'medium':
        return 'Balanced performance and quality';
      case 'high':
        return 'Best visuals, higher resource usage';
      case 'custom':
        return 'User-defined settings';
      default:
        return '';
    }
  };

  const getQualityIcon = (level: QualityLevel): string => {
    switch (level) {
      case 'low':
        return '⚡';
      case 'medium':
        return '⚖️';
      case 'high':
        return '✨';
      case 'custom':
        return '⚙️';
      default:
        return '';
    }
  };

  return (
    <div className="quality-preset-selector">
      <label htmlFor="quality-preset">Quality:</label>
      <div className="preset-container">
        <span className="preset-icon">{getQualityIcon(config.quality)}</span>
        <select
          id="quality-preset"
          value={config.quality}
          onChange={handlePresetChange}
          className={`preset-select quality-${config.quality}`}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <span className="preset-description">
        {getQualityDescription(config.quality)}
      </span>
    </div>
  );
};