import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const ORGANIZATION_ID = process.env.MOCK_ORG_ID || 'default-org';

// Device configurations
const DEVICES = [
  { id: 'dev-001', type: 'pool_controller', name: 'Main Pool' },
  { id: 'dev-002', type: 'sensor_hub', name: 'Kids Pool' }
];

console.log(`Connecting to broker: ${BROKER_URL}`);
const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log('Connected to MQTT Broker');
  
  // Simulate telemetry every 5 seconds
  setInterval(simulateTelemetry, 5000);
});

client.on('error', (err) => {
  console.error('MQTT Error:', err.message);
});

function simulateTelemetry() {
  DEVICES.forEach(device => {
    const topic = `devices/${ORGANIZATION_ID}/${device.id}/telemetry`;
    
    // Generate realistic looking random data
    const data = {
      temperature: (24 + Math.random() * 2).toFixed(2), // 24-26 °C
      ph: (7.2 + Math.random() * 0.6).toFixed(2),       // 7.2-7.8 pH
      orp: Math.floor(650 + Math.random() * 100),       // 650-750 mV
      tds: Math.floor(400 + Math.random() * 50),        // 400-450 ppm
      flowRate: (12 + Math.random() * 1).toFixed(1),    // 12-13 L/min
      timestamp: new Date().toISOString()
    };

    client.publish(topic, JSON.stringify(data));
    console.log(`Published to ${topic}:`, data);
  });
}

