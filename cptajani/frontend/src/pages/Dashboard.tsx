import React, { useState, useEffect } from 'react';
import MetricCard from '../components/MetricCard';
import ChartPanel from '../components/ChartPanel';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    accuracy: 0.92,
    fp_rate: 0.025,
    correlation: 0.91,
    latency: 4.2
  });

  const [systemMetrics, setSystemMetrics] = useState({
    cpu_usage: 0.75,
    memory_usage: 0.68,
    disk_usage: 0.45,
    network_io: 0.32
  });

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        accuracy: prev.accuracy + (Math.random() - 0.5) * 0.01,
        fp_rate: prev.fp_rate + (Math.random() - 0.5) * 0.005,
        correlation: prev.correlation + (Math.random() - 0.5) * 0.01,
        latency: prev.latency + (Math.random() - 0.5) * 0.5
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>EA Control Center Dashboard</h2>
        <p>CPT Ajanı v1.0 - Real-time Monitoring</p>
      </div>

      <div className="metrics-grid">
        <div className="kpi-section">
          <h3>KPI Metrics</h3>
          <div className="metric-cards">
            <MetricCard 
              title="Accuracy" 
              value={metrics.accuracy} 
              target={0.90}
              unit="%" 
              trend="stable"
            />
            <MetricCard 
              title="FP Rate" 
              value={metrics.fp_rate} 
              target={0.03}
              unit="%" 
              trend="improving"
            />
            <MetricCard 
              title="Correlation" 
              value={metrics.correlation} 
              target={0.90}
              unit="" 
              trend="stable"
            />
            <MetricCard 
              title="Latency" 
              value={metrics.latency} 
              target={6.0}
              unit="s" 
              trend="stable"
            />
          </div>
        </div>

        <div className="system-section">
          <h3>System Metrics</h3>
          <div className="metric-cards">
            <MetricCard 
              title="CPU Usage" 
              value={systemMetrics.cpu_usage} 
              target={0.80}
              unit="%" 
              trend="warning"
            />
            <MetricCard 
              title="Memory Usage" 
              value={systemMetrics.memory_usage} 
              target={0.85}
              unit="%" 
              trend="stable"
            />
            <MetricCard 
              title="Disk Usage" 
              value={systemMetrics.disk_usage} 
              target={0.90}
              unit="%" 
              trend="stable"
            />
            <MetricCard 
              title="Network I/O" 
              value={systemMetrics.network_io} 
              target={0.70}
              unit="%" 
              trend="stable"
            />
          </div>
        </div>
      </div>

      <div className="charts-section">
        <ChartPanel 
          title="Performance Trend"
          data={[
            { time: '00:00', value: 0.89 },
            { time: '04:00', value: 0.91 },
            { time: '08:00', value: 0.88 },
            { time: '12:00', value: 0.92 },
            { time: '16:00', value: 0.90 },
            { time: '20:00', value: 0.93 }
          ]}
        />
      </div>
    </div>
  );
}
