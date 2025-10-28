import React from 'react';

interface MetricCardProps {
  title: string;
  value: number;
  target: number;
  unit: string;
  trend: 'stable' | 'improving' | 'declining' | 'warning';
}

export default function MetricCard({ title, value, target, unit, trend }: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'improving': return '↗';
      case 'declining': return '↘';
      case 'warning': return '⚠';
      default: return '→';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'improving': return 'green';
      case 'declining': return 'red';
      case 'warning': return 'orange';
      default: return 'blue';
    }
  };

  const isTargetMet = value >= target;

  return (
    <div className={`metric-card ${trend}`}>
      <div className="metric-header">
        <h4>{title}</h4>
        <span className={`trend-icon ${getTrendColor()}`}>
          {getTrendIcon()}
        </span>
      </div>
      <div className="metric-value">
        <span className="value">
          {typeof value === 'number' && value < 1 ? 
            (value * 100).toFixed(1) : 
            value.toFixed(1)
          }
        </span>
        <span className="unit">{unit}</span>
      </div>
      <div className="metric-target">
        <span className="target-label">Target:</span>
        <span className={`target-value ${isTargetMet ? 'met' : 'not-met'}`}>
          {typeof target === 'number' && target < 1 ? 
            (target * 100).toFixed(1) : 
            target.toFixed(1)
          }{unit}
        </span>
      </div>
      <div className="metric-status">
        <span className={`status ${isTargetMet ? 'success' : 'warning'}`}>
          {isTargetMet ? 'Target Met' : 'Below Target'}
        </span>
      </div>
    </div>
  );
}
