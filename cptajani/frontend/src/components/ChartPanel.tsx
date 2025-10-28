import React from 'react';

interface ChartPanelProps {
  title: string;
  data: Array<{ time: string; value: number }>;
}

export default function ChartPanel({ title, data }: ChartPanelProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <h3>{title}</h3>
        <div className="chart-controls">
          <button className="btn-small">1H</button>
          <button className="btn-small active">6H</button>
          <button className="btn-small">24H</button>
          <button className="btn-small">7D</button>
        </div>
      </div>
      
      <div className="chart-container">
        <div className="chart-y-axis">
          <span>{maxValue.toFixed(2)}</span>
          <span>{((maxValue + minValue) / 2).toFixed(2)}</span>
          <span>{minValue.toFixed(2)}</span>
        </div>
        
        <div className="chart-area">
          <svg width="100%" height="200" viewBox="0 0 400 200">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
              </linearGradient>
            </defs>
            
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={i}
                x1="0"
                y1={200 * ratio}
                x2="400"
                y2={200 * ratio}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            
            {/* Data line */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              points={data.map((d, i) => 
                `${(i / (data.length - 1)) * 400},${200 - ((d.value - minValue) / (maxValue - minValue)) * 200}`
              ).join(' ')}
            />
            
            {/* Area fill */}
            <polygon
              fill="url(#gradient)"
              points={`0,200 ${data.map((d, i) => 
                `${(i / (data.length - 1)) * 400},${200 - ((d.value - minValue) / (maxValue - minValue)) * 200}`
              ).join(' ')} 400,200`}
            />
            
            {/* Data points */}
            {data.map((d, i) => (
              <circle
                key={i}
                cx={(i / (data.length - 1)) * 400}
                cy={200 - ((d.value - minValue) / (maxValue - minValue)) * 200}
                r="3"
                fill="#3b82f6"
              />
            ))}
          </svg>
        </div>
        
        <div className="chart-x-axis">
          {data.map((d, i) => (
            <span key={i} className="x-label">
              {d.time}
            </span>
          ))}
        </div>
      </div>
      
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color" style={{backgroundColor: '#3b82f6'}}></div>
          <span>Performance Score</span>
        </div>
      </div>
    </div>
  );
}
