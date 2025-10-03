/**
 * T026: Effect Toggle Component
 * Reusable toggle switch for enabling/disabling visual effects
 */

import React from 'react';
import './EffectToggle.scss';

interface EffectToggleProps {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  description?: string;
  performanceImpact?: 'low' | 'medium' | 'high';
  disabled?: boolean;
}

export const EffectToggle: React.FC<EffectToggleProps> = ({
  label,
  enabled,
  onToggle,
  description,
  performanceImpact,
  disabled = false
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onToggle(!enabled);
    }
  };

  const getImpactIcon = () => {
    switch (performanceImpact) {
      case 'low':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'high':
        return '🔴';
      default:
        return null;
    }
  };

  return (
    <div className={`effect-toggle ${disabled ? 'disabled' : ''}`}>
      <div className="toggle-header">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            disabled={disabled}
            className="toggle-checkbox"
          />
          <span className="toggle-switch">
            <span className="toggle-slider" />
          </span>
          <span className="toggle-text">{label}</span>
        </label>
        {performanceImpact && (
          <span 
            className={`performance-impact impact-${performanceImpact}`}
            title={`Performance impact: ${performanceImpact}`}
          >
            {getImpactIcon()}
          </span>
        )}
      </div>
      {description && (
        <p className="toggle-description">{description}</p>
      )}
    </div>
  );
};