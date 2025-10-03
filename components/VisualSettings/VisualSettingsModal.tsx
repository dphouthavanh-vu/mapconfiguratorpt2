/**
 * T022: Visual Settings Modal Component
 * Main modal interface for adjusting visual settings with real-time preview
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVisualSettings } from '../../context/VisualSettingsContext';
import { SettingsPanel } from './SettingsPanel';
import { PerformanceMonitor } from './PerformanceMonitor';
import { QualityPresetSelector } from './QualityPresetSelector';
import type { EffectCategory } from '../../types/visualSettings';
import './VisualSettingsModal.scss';

interface VisualSettingsModalProps {
  onClose?: () => void;
  cesiumViewer?: any;
}

export const VisualSettingsModal: React.FC<VisualSettingsModalProps> = ({ 
  onClose,
  cesiumViewer 
}) => {
  const {
    config,
    updateConfig,
    resetToDefaults,
    exportConfig,
    importConfig,
    isDebugPanelOpen,
    toggleDebugPanel,
    performanceMetrics,
    setCesiumViewer
  } = useVisualSettings();

  const [activeTab, setActiveTab] = useState<EffectCategory>('atmosphere');
  const [showImportExport, setShowImportExport] = useState(false);
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Set Cesium viewer on mount if provided
  useEffect(() => {
    if (cesiumViewer && setCesiumViewer) {
      setCesiumViewer(cesiumViewer);
    }
  }, [cesiumViewer, setCesiumViewer]);

  // Focus management
  useEffect(() => {
    if (isDebugPanelOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isDebugPanelOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDebugPanelOpen) return;

      // Ctrl+S to save (export)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleExport();
      }

      // Ctrl+R to reset
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleReset();
      }

      // Tab navigation between categories
      if (e.key === 'Tab' && !e.shiftKey) {
        const tabs: EffectCategory[] = [
          'atmosphere', 'terrain', 'water', 'weather', 
          'postProcessing', 'camera', 'performance'
        ];
        const currentIndex = tabs.indexOf(activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex]);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebugPanelOpen, activeTab]);

  // Handle close
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      toggleDebugPanel();
    }
  }, [onClose, toggleDebugPanel]);

  // Handle export
  const handleExport = useCallback(() => {
    const exported = exportConfig();
    setExportText(exported);
    setShowImportExport(true);
    
    // Copy to clipboard
    navigator.clipboard.writeText(exported).then(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    });
  }, [exportConfig]);

  // Handle import
  const handleImport = useCallback(() => {
    if (!importText.trim()) return;
    
    const success = importConfig(importText);
    if (success) {
      setSaveStatus('saved');
      setShowImportExport(false);
      setImportText('');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      alert('Invalid configuration format');
    }
  }, [importText, importConfig]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (confirm('Reset all visual settings to defaults?')) {
      resetToDefaults();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [resetToDefaults]);

  // Auto-save indicator
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1000);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [config]);

  if (!isDebugPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="visual-settings-backdrop"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div 
        ref={modalRef}
        className="visual-settings-modal"
        role="dialog"
        aria-label="Visual Settings"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>Visual Settings</h2>
          
          <div className="header-controls">
            {/* Save Status */}
            <span className={`save-status ${saveStatus}`}>
              {saveStatus === 'saving' && '⏳ Saving...'}
              {saveStatus === 'saved' && '✓ Saved'}
            </span>

            {/* Quality Preset Selector */}
            <QualityPresetSelector />

            {/* Action Buttons */}
            <button
              className="btn-icon"
              onClick={handleExport}
              title="Export Settings (Ctrl+S)"
              aria-label="Export Settings"
            >
              📤
            </button>
            
            <button
              className="btn-icon"
              onClick={() => setShowImportExport(true)}
              title="Import Settings"
              aria-label="Import Settings"
            >
              📥
            </button>
            
            <button
              className="btn-icon"
              onClick={handleReset}
              title="Reset to Defaults (Ctrl+R)"
              aria-label="Reset to Defaults"
            >
              🔄
            </button>
            
            <button
              className="btn-close"
              onClick={handleClose}
              title="Close (Q or Esc)"
              aria-label="Close Modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="modal-tabs" role="tablist">
          {[
            { id: 'atmosphere', label: '☁️ Atmosphere', icon: '☁️' },
            { id: 'terrain', label: '⛰️ Terrain', icon: '⛰️' },
            { id: 'water', label: '💧 Water', icon: '💧' },
            { id: 'weather', label: '🌦️ Weather', icon: '🌦️' },
            { id: 'postProcessing', label: '✨ Effects', icon: '✨' },
            { id: 'camera', label: '📷 Camera', icon: '📷' },
            { id: 'performance', label: '📊 Performance', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as EffectCategory)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label.split(' ')[1]}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Settings Panels */}
          {activeTab !== 'performance' ? (
            <SettingsPanel 
              category={activeTab}
              config={config}
              onUpdate={updateConfig}
            />
          ) : (
            <PerformanceMonitor 
              metrics={performanceMetrics}
              config={config.performance}
              onUpdate={(perf) => updateConfig({ performance: perf })}
            />
          )}
        </div>

        {/* Import/Export Dialog */}
        {showImportExport && (
          <div className="import-export-dialog">
            <div className="dialog-content">
              <h3>Import/Export Configuration</h3>
              
              <div className="dialog-tabs">
                <button 
                  className="active"
                  onClick={() => setExportText(exportConfig())}
                >
                  Export
                </button>
                <button onClick={() => setExportText('')}>
                  Import
                </button>
              </div>

              {exportText ? (
                <div className="export-section">
                  <textarea
                    value={exportText}
                    readOnly
                    rows={10}
                    className="config-textarea"
                  />
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(exportText);
                      alert('Copied to clipboard!');
                    }}
                  >
                    Copy to Clipboard
                  </button>
                </div>
              ) : (
                <div className="import-section">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste configuration JSON here..."
                    rows={10}
                    className="config-textarea"
                  />
                  <button 
                    className="btn-primary"
                    onClick={handleImport}
                    disabled={!importText.trim()}
                  >
                    Import Configuration
                  </button>
                </div>
              )}

              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowImportExport(false);
                  setImportText('');
                  setExportText('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-info">
            <span className="quality-badge">
              Quality: <strong>{config.quality}</strong>
            </span>
            {performanceMetrics && (
              <span className="fps-badge">
                FPS: <strong>{performanceMetrics.fps}</strong>
              </span>
            )}
          </div>
          
          <div className="footer-actions">
            <button 
              className="btn-secondary"
              onClick={handleClose}
            >
              Close
            </button>
            <button 
              className="btn-primary"
              onClick={() => {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 1000);
              }}
            >
              Apply & Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};