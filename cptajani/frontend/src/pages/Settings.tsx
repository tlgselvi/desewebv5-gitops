import React, { useState } from 'react';

export default function Settings() {
  const [settings, setSettings] = useState({
    apiEndpoint: 'http://localhost:8080',
    refreshInterval: 30,
    theme: 'light',
    notifications: true,
    autoRefresh: true
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    // TODO: Save settings to backend
    console.log('Settings saved:', settings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="settings">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure application settings</p>
      </div>

      <div className="settings-sections">
        <div className="settings-section">
          <h3>API Configuration</h3>
          <div className="setting-item">
            <label>API Endpoint</label>
            <input 
              type="text" 
              value={settings.apiEndpoint}
              onChange={(e) => handleSettingChange('apiEndpoint', e.target.value)}
              placeholder="http://localhost:8080"
            />
          </div>
          <div className="setting-item">
            <label>Refresh Interval (seconds)</label>
            <input 
              type="number" 
              value={settings.refreshInterval}
              onChange={(e) => handleSettingChange('refreshInterval', parseInt(e.target.value))}
              min="5"
              max="300"
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>Display Settings</h3>
          <div className="setting-item">
            <label>Theme</label>
            <select 
              value={settings.theme}
              onChange={(e) => handleSettingChange('theme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                checked={settings.autoRefresh}
                onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
              />
              Auto Refresh
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Notifications</h3>
          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                checked={settings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
              />
              Enable Notifications
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>System Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span>Application Version</span>
              <span>1.0.0</span>
            </div>
            <div className="info-item">
              <span>API Version</span>
              <span>v1</span>
            </div>
            <div className="info-item">
              <span>Last Updated</span>
              <span>2025-10-29</span>
            </div>
            <div className="info-item">
              <span>Environment</span>
              <span>Development</span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn-primary" onClick={handleSave}>
          Save Settings
        </button>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
