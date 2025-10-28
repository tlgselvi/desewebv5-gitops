import React, { useState, useEffect } from 'react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      name: "High CPU Usage",
      severity: "warning",
      status: "firing",
      description: "CPU usage above 80%",
      timestamp: "2025-10-29T01:30:00Z",
      source: "prometheus"
    },
    {
      id: 2,
      name: "Memory Pressure",
      severity: "info",
      status: "resolved",
      description: "Memory usage normalized",
      timestamp: "2025-10-29T01:25:00Z",
      source: "prometheus"
    },
    {
      id: 3,
      name: "SEO Score Drop",
      severity: "critical",
      status: "firing",
      description: "SEO score dropped below 0.85",
      timestamp: "2025-10-29T01:20:00Z",
      source: "seo-observer"
    },
    {
      id: 4,
      name: "Anomaly Detected",
      severity: "warning",
      status: "firing",
      description: "Unusual pattern detected in metrics",
      timestamp: "2025-10-29T01:15:00Z",
      source: "aiops-engine"
    }
  ]);

  const [filteredAlerts, setFilteredAlerts] = useState(alerts);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (filter === 'all') {
      setFilteredAlerts(alerts);
    } else {
      setFilteredAlerts(alerts.filter(alert => alert.status === filter));
    }
  }, [filter, alerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'warning': return 'orange';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'firing': return 'red';
      case 'resolved': return 'green';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  return (
    <div className="alerts">
      <div className="page-header">
        <h2>Alert Management</h2>
        <p>Monitor and manage system alerts</p>
      </div>

      <div className="alerts-controls">
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({alerts.length})
          </button>
          <button 
            className={filter === 'firing' ? 'active' : ''}
            onClick={() => setFilter('firing')}
          >
            Firing ({alerts.filter(a => a.status === 'firing').length})
          </button>
          <button 
            className={filter === 'resolved' ? 'active' : ''}
            onClick={() => setFilter('resolved')}
          >
            Resolved ({alerts.filter(a => a.status === 'resolved').length})
          </button>
        </div>
        
        <div className="alert-actions">
          <button className="btn-primary">Acknowledge All</button>
          <button className="btn-secondary">Refresh</button>
        </div>
      </div>

      <div className="alerts-list">
        {filteredAlerts.map(alert => (
          <div key={alert.id} className={`alert-item ${alert.status}`}>
            <div className="alert-header">
              <div className="alert-title">
                <h4>{alert.name}</h4>
                <span 
                  className={`severity-badge ${getSeverityColor(alert.severity)}`}
                >
                  {alert.severity}
                </span>
                <span 
                  className={`status-badge ${getStatusColor(alert.status)}`}
                >
                  {alert.status}
                </span>
              </div>
              <div className="alert-timestamp">
                {new Date(alert.timestamp).toLocaleString()}
              </div>
            </div>
            
            <div className="alert-body">
              <p>{alert.description}</p>
              <div className="alert-source">
                <span>Source: {alert.source}</span>
              </div>
            </div>
            
            <div className="alert-actions">
              <button className="btn-primary">Acknowledge</button>
              <button className="btn-secondary">View Details</button>
              <button className="btn-danger">Silence</button>
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="no-alerts">
          <p>No alerts found for the selected filter.</p>
        </div>
      )}
    </div>
  );
}
