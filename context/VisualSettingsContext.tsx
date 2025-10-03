/**
 * T014: Visual Enhancement System - React Context (Complete Implementation)
 * Global state management for visual settings with full integration
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  VisualConfiguration,
  VisualSettingsContextType,
  QualityLevel,
  PerformanceMetrics
} from '../types/visualSettings';
import { DEFAULT_VISUAL_CONFIG, QUALITY_PRESETS } from '../config/visualDefaults';
import { validateVisualConfiguration } from '../schemas/visualConfigSchema';
import { visualSettingsStorage } from '../services/visualSettingsStorage';
import { performanceMonitor } from '../services/performanceMonitor';

// Create the context
const VisualSettingsContext = createContext<VisualSettingsContextType | undefined>(undefined);

// Provider props
interface VisualSettingsProviderProps {
  children: ReactNode;
}

/**
 * Visual Settings Provider Component
 * Manages global visual configuration state with full service integration
 */
export const VisualSettingsProvider: React.FC<VisualSettingsProviderProps> = ({ children }) => {
  // State management
  const [config, setConfig] = useState<VisualConfiguration>(DEFAULT_VISUAL_CONFIG);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  
  // Refs for tracking state
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedConfig = useRef<string>('');
  const autoQualityEnabled = useRef(true);
  const performanceUnsubscribe = useRef<(() => void) | null>(null);

  // Load settings from storage on mount
  useEffect(() => {
    const loadStoredSettings = async () => {
      try {
        const stored = visualSettingsStorage.loadSettings();
        if (stored) {
          setConfig(stored);
          lastSavedConfig.current = JSON.stringify(stored);
        } else {
          // No stored settings, use defaults
          setConfig(DEFAULT_VISUAL_CONFIG);
          // Save defaults for next time
          visualSettingsStorage.saveSettings(DEFAULT_VISUAL_CONFIG);
        }
      } catch (error) {
        console.error('Failed to load stored visual settings:', error);
        setConfig(DEFAULT_VISUAL_CONFIG);
      }
    };
    
    loadStoredSettings();
  }, []);

  // Debounced save to localStorage when config changes
  useEffect(() => {
    const configString = JSON.stringify(config);
    
    // Skip if config hasn't actually changed
    if (configString === lastSavedConfig.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to avoid excessive localStorage writes
    saveTimeoutRef.current = setTimeout(() => {
      const success = visualSettingsStorage.saveSettings(config);
      if (success) {
        lastSavedConfig.current = configString;
      } else {
        console.error('Failed to save visual settings');
      }
    }, 500); // 500ms debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [config]);

  // Setup performance monitoring
  useEffect(() => {
    // Subscribe to performance updates
    performanceUnsubscribe.current = performanceMonitor.subscribe((metrics) => {
      setPerformanceMetrics(metrics);
      
      // Auto-adjust quality if enabled
      if (autoQualityEnabled.current && config.performance.autoAdjustQuality) {
        const currentQuality = config.quality;
        const suggestedQuality = performanceMonitor.suggestQualityLevel(currentQuality);
        
        if (suggestedQuality !== currentQuality && suggestedQuality !== 'custom') {
          console.info(`Auto-adjusting quality from ${currentQuality} to ${suggestedQuality} based on performance`);
          loadPreset(suggestedQuality);
        }
      }
    });

    // Start monitoring if not already running
    if (!performanceMonitor.isRunning()) {
      performanceMonitor.start();
    }

    return () => {
      if (performanceUnsubscribe.current) {
        performanceUnsubscribe.current();
        performanceUnsubscribe.current = null;
      }
    };
  }, [config.quality, config.performance.autoAdjustQuality]);

  // Update configuration with automatic quality detection
  const updateConfig = useCallback((updates: Partial<VisualConfiguration>) => {
    setConfig(prev => {
      // Determine if we should switch to custom quality
      const isModifyingSettings = 
        updates.atmosphere !== undefined ||
        updates.terrain !== undefined ||
        updates.water !== undefined ||
        updates.weather !== undefined ||
        updates.postProcessing !== undefined ||
        updates.camera !== undefined;
      
      const shouldBeCustom = isModifyingSettings && 
        prev.quality !== 'custom' && 
        updates.quality === undefined;

      return {
        ...prev,
        ...updates,
        quality: updates.quality || (shouldBeCustom ? 'custom' : prev.quality)
      };
    });
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaults = visualSettingsStorage.getDefaultSettings();
    setConfig(defaults);
    // Ensure defaults are saved
    visualSettingsStorage.saveSettings(defaults);
  }, []);

  // Load quality preset with proper merging
  const loadPreset = useCallback((preset: QualityLevel) => {
    if (preset === 'custom') {
      // Don't change config for custom, just set quality flag
      setConfig(prev => ({ ...prev, quality: 'custom' }));
      return;
    }

    const presetConfig = QUALITY_PRESETS[preset];
    if (presetConfig) {
      setConfig(prev => ({
        ...DEFAULT_VISUAL_CONFIG,
        ...presetConfig,
        quality: preset,
        version: prev.version // Preserve version
      }));
      
      // Temporarily disable auto-quality when manually selecting
      autoQualityEnabled.current = false;
      setTimeout(() => {
        autoQualityEnabled.current = true;
      }, 5000); // Re-enable after 5 seconds
    }
  }, []);

  // Export configuration using storage service
  const exportConfig = useCallback(() => {
    return visualSettingsStorage.exportSettings(config);
  }, [config]);

  // Import configuration with validation
  const importConfig = useCallback((json: string): boolean => {
    const success = visualSettingsStorage.importSettings(json);
    if (success) {
      // Reload the imported settings
      const imported = visualSettingsStorage.loadSettings();
      if (imported) {
        setConfig(imported);
        return true;
      }
    }
    return false;
  }, []);

  // Toggle debug panel with keyboard support
  const toggleDebugPanel = useCallback(() => {
    setIsDebugPanelOpen(prev => !prev);
  }, []);

  // Update performance metrics (now handled by performance monitor subscription)
  const updatePerformanceMetrics = useCallback((metrics: PerformanceMetrics) => {
    // This is now primarily handled by the performance monitor subscription
    // But we keep this method for manual updates if needed
    setPerformanceMetrics(metrics);
  }, []);

  // Set Cesium viewer for performance monitoring
  const setCesiumViewer = useCallback((viewer: any) => {
    performanceMonitor.setViewer(viewer);
  }, []);

  // Get performance statistics
  const getPerformanceStats = useCallback(() => {
    return {
      current: performanceMetrics,
      statistics: performanceMonitor.getFPSStatistics(),
      health: performanceMonitor.getHealthStatus(),
      trend: performanceMonitor.getPerformanceTrend()
    };
  }, [performanceMetrics]);

  // Keyboard event handler for modal toggle
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Check if we should ignore the keypress (e.g., in input fields)
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable) {
        return;
      }

      // Toggle modal with 'Q' key
      if (event.key === 'q' || event.key === 'Q') {
        toggleDebugPanel();
      }
      
      // Close modal with Escape key
      if (event.key === 'Escape' && isDebugPanelOpen) {
        setIsDebugPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isDebugPanelOpen, toggleDebugPanel]);

  // Context value with extended functionality
  const contextValue: VisualSettingsContextType = {
    config,
    updateConfig,
    resetToDefaults,
    loadPreset,
    exportConfig,
    importConfig,
    isDebugPanelOpen,
    toggleDebugPanel,
    performanceMetrics,
    updatePerformanceMetrics,
    // Extended methods not in original type but useful
    setCesiumViewer,
    getPerformanceStats,
    // Storage utilities
    saveSettings: () => visualSettingsStorage.saveSettings(config),
    clearSettings: () => {
      visualSettingsStorage.clearSettings();
      resetToDefaults();
    },
    createBackup: () => visualSettingsStorage.createBackup(),
    restoreBackup: (backup: string) => {
      const success = visualSettingsStorage.restoreBackup(backup);
      if (success) {
        const restored = visualSettingsStorage.loadSettings();
        if (restored) {
          setConfig(restored);
        }
      }
      return success;
    }
  } as VisualSettingsContextType;

  return (
    <VisualSettingsContext.Provider value={contextValue}>
      {children}
    </VisualSettingsContext.Provider>
  );
};

/**
 * Custom hook to use visual settings context
 */
export const useVisualSettings = (): VisualSettingsContextType => {
  const context = useContext(VisualSettingsContext);
  if (!context) {
    throw new Error('useVisualSettings must be used within VisualSettingsProvider');
  }
  return context;
};

// Export context for direct access if needed
export { VisualSettingsContext };