import React, { useState } from 'react';
import DataForm from '../components/DataForm';

export default function DataEntry() {
  const [submittedData, setSubmittedData] = useState(null);

  const handleDataSubmit = (data: any) => {
    setSubmittedData(data);
    // TODO: Send to backend API
    console.log('Data submitted:', data);
  };

  return (
    <div className="data-entry">
      <div className="page-header">
        <h2>Data Entry</h2>
        <p>Enter training data and configuration parameters</p>
      </div>

      <div className="data-forms">
        <DataForm 
          title="Prophet Configuration"
          fields={[
            { name: 'changepoint_prior_scale', label: 'Changepoint Prior Scale', type: 'number', defaultValue: 0.2 },
            { name: 'seasonality_mode', label: 'Seasonality Mode', type: 'select', options: ['additive', 'multiplicative'], defaultValue: 'multiplicative' },
            { name: 'holidays_prior_scale', label: 'Holidays Prior Scale', type: 'number', defaultValue: 10.0 }
          ]}
          onSubmit={handleDataSubmit}
        />

        <DataForm 
          title="Anomaly Detection Parameters"
          fields={[
            { name: 'threshold', label: 'Detection Threshold', type: 'number', defaultValue: 0.8 },
            { name: 'window_size', label: 'Window Size', type: 'number', defaultValue: 24 },
            { name: 'min_samples', label: 'Min Samples', type: 'number', defaultValue: 10 }
          ]}
          onSubmit={handleDataSubmit}
        />

        <DataForm 
          title="SEO Observer Settings"
          fields={[
            { name: 'target_url', label: 'Target URL', type: 'text', defaultValue: 'https://www.cpt.com.tr' },
            { name: 'measurement_interval', label: 'Measurement Interval (hours)', type: 'number', defaultValue: 6 },
            { name: 'performance_threshold', label: 'Performance Threshold', type: 'number', defaultValue: 0.8 }
          ]}
          onSubmit={handleDataSubmit}
        />
      </div>

      {submittedData && (
        <div className="submission-result">
          <h3>Submission Result</h3>
          <pre>{JSON.stringify(submittedData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
