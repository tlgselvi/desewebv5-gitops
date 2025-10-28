import React, { useState, useEffect } from 'react';

export default function Models() {
  const [models, setModels] = useState([
    {
      name: "prophet_v5.5.1",
      version: "5.5.1",
      accuracy: 0.92,
      last_trained: "2025-10-29T01:00:00Z",
      status: "active"
    },
    {
      name: "anomaly_detector_v1.0",
      version: "1.0",
      accuracy: 0.88,
      last_trained: "2025-10-28T20:00:00Z",
      status: "active"
    },
    {
      name: "seo_predictor_v2.1",
      version: "2.1",
      accuracy: 0.91,
      last_trained: "2025-10-28T18:00:00Z",
      status: "active"
    }
  ]);

  const [selectedModel, setSelectedModel] = useState(null);

  return (
    <div className="models">
      <div className="page-header">
        <h2>Model Management</h2>
        <p>View and manage trained models</p>
      </div>

      <div className="models-grid">
        {models.map((model, index) => (
          <div 
            key={index} 
            className={`model-card ${model.status}`}
            onClick={() => setSelectedModel(model)}
          >
            <div className="model-header">
              <h3>{model.name}</h3>
              <span className={`status-badge ${model.status}`}>
                {model.status}
              </span>
            </div>
            <div className="model-details">
              <p><strong>Version:</strong> {model.version}</p>
              <p><strong>Accuracy:</strong> {(model.accuracy * 100).toFixed(1)}%</p>
              <p><strong>Last Trained:</strong> {new Date(model.last_trained).toLocaleString()}</p>
            </div>
            <div className="model-actions">
              <button className="btn-primary">Retrain</button>
              <button className="btn-secondary">Deploy</button>
              <button className="btn-danger">Archive</button>
            </div>
          </div>
        ))}
      </div>

      {selectedModel && (
        <div className="model-details-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedModel.name} Details</h3>
              <button onClick={() => setSelectedModel(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h4>Performance Metrics</h4>
                <div className="metrics-grid">
                  <div className="metric">
                    <span>Accuracy</span>
                    <span>{(selectedModel.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="metric">
                    <span>Precision</span>
                    <span>0.89</span>
                  </div>
                  <div className="metric">
                    <span>Recall</span>
                    <span>0.91</span>
                  </div>
                  <div className="metric">
                    <span>F1 Score</span>
                    <span>0.90</span>
                  </div>
                </div>
              </div>
              
              <div className="detail-section">
                <h4>Training History</h4>
                <div className="training-history">
                  <div className="history-item">
                    <span>2025-10-29 01:00:00</span>
                    <span>Model retrained with new data</span>
                    <span className="status-success">Success</span>
                  </div>
                  <div className="history-item">
                    <span>2025-10-28 20:00:00</span>
                    <span>Initial training completed</span>
                    <span className="status-success">Success</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
