export interface Device {
  id: string;
  name: string;
  serialNumber: string;
  type: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  lastSeen?: string;
  isActive: boolean;
}

export interface TelemetryData {
  timestamp: string;
  temperature?: number;
  ph?: number;
  orp?: number;
  tds?: number;
  flowRate?: number;
}

export interface Alert {
  id: string;
  deviceId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  isResolved: boolean;
  createdAt: string;
}

