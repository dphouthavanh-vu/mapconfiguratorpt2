/**
 * T024: Performance Monitor Component
 * Real-time performance metrics display with auto-quality adjustment
 */

import React, { useEffect, useRef, useState } from 'react';
import type { PerformanceMetrics, PerformanceConfig } from '../../types/visualSettings';
import './PerformanceMonitor.scss';

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics | null;
  config: PerformanceConfig;
  onUpdate: (config: PerformanceConfig) => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  metrics,
  config,
  onUpdate
}) => {
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const maxHistoryLength = 60; // 60 data points

  // Update history
  useEffect(() => {
    if (!metrics) return;

    setFpsHistory(prev => {
      const updated = [...prev, metrics.fps];
      return updated.slice(-maxHistoryLength);
    });

    setMemoryHistory(prev => {
      const updated = [...prev, metrics.memoryUsage];
      return updated.slice(-maxHistoryLength);
    });
  }, [metrics]);

  // Draw FPS graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || fpsHistory.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);
      
      // Draw grid lines
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      
      // Horizontal lines (FPS markers)
      const fpsMarkers = [0, 30, 60, 90, 120];
      fpsMarkers.forEach(fps => {
        const y = height - (fps / 120) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        
        // Label
        ctx.fillStyle = '#666';
        ctx.font = '10px monospace';
        ctx.fillText(`${fps}`, 5, y - 2);
      });
      
      // Draw FPS line
      if (fpsHistory.length > 1) {
        ctx.strokeStyle = getFpsColor(fpsHistory[fpsHistory.length - 1]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        fpsHistory.forEach((fps, index) => {
          const x = (index / (maxHistoryLength - 1)) * width;
          const y = height - (fps / 120) * height;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        
        ctx.stroke();
      }
      
      // Draw current FPS value
      if (metrics) {
        ctx.fillStyle = getFpsColor(metrics.fps);
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`${metrics.fps} FPS`, width - 60, 20);
      }
    };

    draw();
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fpsHistory, metrics]);

  // Get color based on FPS
  const getFpsColor = (fps: number): string => {
    const target = config.targetFPS.desktop;
    if (fps >= target) return '#00ff00'; // Green
    if (fps >= target * 0.8) return '#ffff00'; // Yellow
    if (fps >= target * 0.5) return '#ff8800'; // Orange
    return '#ff0000'; // Red
  };

  // Get memory color
  const getMemoryColor = (usage: number): string => {
    const max = config.maxMemoryUsage;
    const ratio = usage / max;
    if (ratio <= 0.5) return '#00ff00';
    if (ratio <= 0.75) return '#ffff00';
    if (ratio <= 0.9) return '#ff8800';
    return '#ff0000';
  };

  // Calculate statistics
  const getStatistics = () => {
    if (fpsHistory.length === 0) {
      return { avgFps: 0, minFps: 0, maxFps: 0 };
    }
    
    const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
    const minFps = Math.min(...fpsHistory);
    const maxFps = Math.max(...fpsHistory);
    
    return { avgFps, minFps, maxFps };
  };

  const stats = getStatistics();

  return (
    <div className="performance-monitor">
      <div className="monitor-header">
        <h3>Performance Metrics</h3>
        <div className="auto-adjust-toggle">
          <label>
            <input
              type="checkbox"
              checked={config.autoAdjustQuality}
              onChange={(e) => onUpdate({
                ...config,
                autoAdjustQuality: e.target.checked
              })}
            />
            Auto-adjust quality
          </label>
        </div>
      </div>

      {/* FPS Graph */}
      <div className="graph-container">
        <h4>Frame Rate</h4>
        <canvas 
          ref={canvasRef}
          width={400}
          height={150}
          className="fps-graph"
        />
        <div className="graph-stats">
          <span>Avg: {stats.avgFps.toFixed(0)}</span>
          <span>Min: {stats.minFps.toFixed(0)}</span>
          <span>Max: {stats.maxFps.toFixed(0)}</span>
        </div>
      </div>

      {/* Current Metrics */}
      {metrics && (
        <div className="metrics-grid">
          <div className="metric-card">
            <label>Frame Time</label>
            <div className="metric-value">
              {metrics.frameTime.toFixed(2)}
              <span className="unit">ms</span>
            </div>
          </div>

          <div className="metric-card">
            <label>Memory Usage</label>
            <div 
              className="metric-value"
              style={{ color: getMemoryColor(metrics.memoryUsage) }}
            >
              {metrics.memoryUsage.toFixed(0)}
              <span className="unit">MB</span>
            </div>
            <div className="metric-bar">
              <div 
                className="metric-bar-fill"
                style={{ 
                  width: `${(metrics.memoryUsage / config.maxMemoryUsage) * 100}%`,
                  backgroundColor: getMemoryColor(metrics.memoryUsage)
                }}
              />
            </div>
          </div>

          <div className="metric-card">
            <label>GPU Memory</label>
            <div 
              className="metric-value"
              style={{ color: getMemoryColor(metrics.gpuMemory) }}
            >
              {metrics.gpuMemory.toFixed(0)}
              <span className="unit">MB</span>
            </div>
            <div className="metric-bar">
              <div 
                className="metric-bar-fill"
                style={{ 
                  width: `${(metrics.gpuMemory / config.gpuMemoryLimit) * 100}%`,
                  backgroundColor: getMemoryColor(metrics.gpuMemory)
                }}
              />
            </div>
          </div>

          <div className="metric-card">
            <label>Triangle Count</label>
            <div className="metric-value">
              {(metrics.triangleCount / 1000).toFixed(0)}
              <span className="unit">K</span>
            </div>
          </div>

          <div className="metric-card">
            <label>Draw Calls</label>
            <div className="metric-value">
              {metrics.drawCalls}
            </div>
          </div>

          <div className="metric-card">
            <label>Texture Memory</label>
            <div className="metric-value">
              {metrics.textureMemory.toFixed(0)}
              <span className="unit">MB</span>
            </div>
          </div>
        </div>
      )}

      {/* Performance Settings */}
      <div className="performance-settings">
        <h4>Target Performance</h4>
        
        <div className="setting-row">
          <label>Desktop FPS Target</label>
          <input
            type="number"
            min="30"
            max="144"
            value={config.targetFPS.desktop}
            onChange={(e) => onUpdate({
              ...config,
              targetFPS: {
                ...config.targetFPS,
                desktop: parseInt(e.target.value)
              }
            })}
          />
        </div>

        <div className="setting-row">
          <label>Mobile FPS Target</label>
          <input
            type="number"
            min="15"
            max="60"
            value={config.targetFPS.mobile}
            onChange={(e) => onUpdate({
              ...config,
              targetFPS: {
                ...config.targetFPS,
                mobile: parseInt(e.target.value)
              }
            })}
          />
        </div>

        <div className="setting-row">
          <label>Max Memory Usage</label>
          <input
            type="number"
            min="512"
            max="8192"
            step="256"
            value={config.maxMemoryUsage}
            onChange={(e) => onUpdate({
              ...config,
              maxMemoryUsage: parseInt(e.target.value)
            })}
          />
          <span className="unit">MB</span>
        </div>

        <div className="setting-row">
          <label>GPU Memory Limit</label>
          <input
            type="number"
            min="256"
            max="4096"
            step="128"
            value={config.gpuMemoryLimit}
            onChange={(e) => onUpdate({
              ...config,
              gpuMemoryLimit: parseInt(e.target.value)
            })}
          />
          <span className="unit">MB</span>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="performance-tips">
        <h4>Performance Tips</h4>
        {metrics && (
          <ul>
            {metrics.fps < config.targetFPS.desktop * 0.5 && (
              <li className="tip-critical">
                ⚠️ FPS is critically low. Consider reducing quality settings.
              </li>
            )}
            {metrics.memoryUsage > config.maxMemoryUsage * 0.9 && (
              <li className="tip-warning">
                ⚠️ Memory usage is high. Disable some effects to free memory.
              </li>
            )}
            {metrics.drawCalls > 100 && (
              <li className="tip-info">
                ℹ️ High draw call count. Reduce terrain detail or disable landmarks.
              </li>
            )}
            {metrics.triangleCount > 500000 && (
              <li className="tip-info">
                ℹ️ High triangle count. Lower terrain resolution for better performance.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};