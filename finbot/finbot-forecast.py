#!/usr/bin/env python3
"""
EA Plan v5.5.1 - FinBot v2.0 Cost & ROI Forecasting
Prophet-based cost trend prediction with ROI optimization
HTTP Server mode for Prometheus scraping
"""

import os
import sys
import json
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from http.server import HTTPServer, BaseHTTPRequestHandler
import numpy as np
import pandas as pd
from prometheus_client import CollectorRegistry, Gauge, Counter, generate_latest, CONTENT_TYPE_LATEST

try:
    from prophet import Prophet
except ImportError:
    print("⚠️  Prophet not installed, using placeholder")
    Prophet = None


class MetricsHandler(BaseHTTPRequestHandler):
    """HTTP handler for Prometheus metrics"""
    
    def do_GET(self):
        if self.path == '/metrics':
            self.send_response(200)
            self.send_header('Content-Type', CONTENT_TYPE_LATEST)
            self.end_headers()
            self.wfile.write(generate_latest(registry))
        elif self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'healthy', 'service': 'finbot'}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Suppress default logging


# Global registry for metrics
registry = CollectorRegistry()

# Prometheus metrics
cost_prediction = Gauge('finbot_cost_prediction', 'Predicted cost (USD)', 
                        ['period'], registry=registry)
cost_correlation = Gauge('finbot_cost_correlation', 'Cost prediction correlation (0-1)', 
                         registry=registry)
roi_score = Gauge('finbot_roi_score', 'ROI optimization score (0-100)', 
                 registry=registry)
predictive_score = Gauge('finbot_predictive_score', 'Predictive model score (0-100)', 
                         registry=registry)
budget_variance = Gauge('finbot_budget_variance', 'Budget variance percentage', 
                       registry=registry)


class FinBotForecaster:
    """Cost & ROI forecasting using Prophet time-series analysis"""
    
    def __init__(self):
        self.prediction_horizon = int(os.getenv('FINBOT_PREDICTION_DAYS', '90'))
        self.update_interval = int(os.getenv('FINBOT_UPDATE_INTERVAL', '300'))  # 5 minutes
        
        # Prophet model
        self.prophet_model = None
        self.correlation_score = 0.0
        self.running = True
    
    def fetch_historical_cost_data(self, days: int = 90) -> pd.DataFrame:
        """Fetch historical cost data from cloud providers / APIs"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            dates = pd.date_range(start=start_date, end=end_date, freq='D')
            
            # Mock cost data with trend
            base_cost = 100.0
            trend = 0.02  # 2% daily increase
            costs = [base_cost * (1 + trend) ** i for i in range(len(dates))]
            
            df = pd.DataFrame({
                'ds': dates,
                'y': costs
            })
            
            return df
            
        except Exception as e:
            print(f"⚠️  Error fetching cost data: {e}")
            return pd.DataFrame()
    
    def train_prophet_model(self, df: pd.DataFrame) -> Prophet:
        """Train Prophet model on historical cost data"""
        try:
            if Prophet is None:
                print("⚠️  Prophet not available, using mock predictions")
                return None
            
            model = Prophet(
                yearly_seasonality=False,
                weekly_seasonality=True,
                daily_seasonality=False,
                seasonality_mode='multiplicative'
            )
            
            model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
            model.fit(df)
            
            self.prophet_model = model
            return model
            
        except Exception as e:
            print(f"⚠️  Model training error: {e}")
            return None
    
    def predict_future_costs(self, periods: int = 90) -> pd.DataFrame:
        """Generate future cost predictions"""
        try:
            if self.prophet_model is None:
                # Mock predictions when Prophet unavailable
                dates = pd.date_range(start=datetime.now(), periods=periods, freq='D')
                mock_forecast = pd.DataFrame({
                    'ds': dates,
                    'yhat': [100.0 * (1.02 ** i) for i in range(periods)],
                    'yhat_lower': [95.0 * (1.02 ** i) for i in range(periods)],
                    'yhat_upper': [105.0 * (1.02 ** i) for i in range(periods)]
                })
                return mock_forecast
            
            future = self.prophet_model.make_future_dataframe(periods=periods)
            forecast = self.prophet_model.predict(future)
            forecast_df = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(periods)
            
            return forecast_df
            
        except Exception as e:
            print(f"⚠️  Prediction error: {e}")
            return pd.DataFrame()
    
    def calculate_correlation(self, historical: pd.DataFrame, predicted: pd.DataFrame) -> float:
        """Calculate correlation between historical trend and predictions"""
        try:
            if historical.empty or predicted.empty:
                return 0.0
            
            historical_trend = historical['y'].values[-min(len(predicted), len(historical)):]
            predicted_trend = predicted['yhat'].values[:len(historical_trend)]
            
            correlation = np.corrcoef(historical_trend, predicted_trend)[0, 1]
            
            if np.isnan(correlation):
                return 0.0
            
            return float(correlation)
            
        except Exception as e:
            print(f"⚠️  Correlation calculation error: {e}")
            return 0.0
    
    def calculate_roi_score(self, predicted_costs: pd.DataFrame, current_costs: float) -> float:
        """Calculate ROI optimization score based on cost predictions"""
        try:
            if predicted_costs.empty:
                return 50.0
            
            avg_future_cost = predicted_costs['yhat'].head(30).mean()
            
            if avg_future_cost > current_costs:
                cost_increase_pct = ((avg_future_cost - current_costs) / current_costs) * 100
                roi_score = max(0, 100 - cost_increase_pct * 2)
            else:
                cost_decrease_pct = ((current_costs - avg_future_cost) / current_costs) * 100
                roi_score = min(100, 50 + cost_decrease_pct * 2)
            
            return float(roi_score)
            
        except Exception as e:
            print(f"⚠️  ROI calculation error: {e}")
            return 50.0
    
    def update_metrics(self, predictions: pd.DataFrame, correlation: float, 
                      roi_score: float, predictive_score: float, budget_variance: float):
        """Update Prometheus metrics"""
        try:
            if not predictions.empty:
                cost_prediction.labels(period='7d').set(predictions['yhat'].head(7).mean())
                cost_prediction.labels(period='30d').set(predictions['yhat'].head(30).mean())
                cost_prediction.labels(period='90d').set(predictions['yhat'].mean())
            
            cost_correlation.set(correlation)
            roi_score_gauge.set(roi_score)
            predictive_score.set(predictive_score)
            budget_variance.set(budget_variance)
            
        except Exception as e:
            print(f"⚠️  Metrics update error: {e}")
    
    def run_forecast_loop(self):
        """Main forecasting loop that runs periodically"""
        print("💰 Starting FinBot v2.0 Cost & ROI Forecasting (HTTP Server Mode)...")
        
        while self.running:
            try:
                # Fetch historical data
                historical_data = self.fetch_historical_cost_data(days=90)
                
                if historical_data.empty:
                    print("❌ No historical data available")
                    time.sleep(self.update_interval)
                    continue
                
                # Train model
                model = self.train_prophet_model(historical_data)
                
                if model is None:
                    print("⚠️  Model training failed, using mock predictions")
                
                # Predict future costs
                predictions = self.predict_future_costs(periods=self.prediction_horizon)
                
                if predictions.empty:
                    print("❌ Prediction failed")
                    time.sleep(self.update_interval)
                    continue
                
                # Calculate metrics
                correlation = self.calculate_correlation(historical_data, predictions)
                self.correlation_score = correlation
                
                current_cost = historical_data['y'].iloc[-1]
                roi = self.calculate_roi_score(predictions, current_cost)
                
                # Predictive score = correlation * 100 (normalized)
                predictive = abs(correlation) * 100
                
                budget_var = 0.0  # Mock for now
                
                # Update metrics
                self.update_metrics(predictions, correlation, roi, predictive, budget_var)
                
                # Print summary
                print(f"\n💰 FinBot Forecast Summary:")
                print(f"   Correlation: {correlation:.3f}")
                print(f"   ROI Score: {roi:.1f}")
                print(f"   Predictive Score: {predictive:.1f}")
                print(f"   Current Cost: ${current_cost:.2f}")
                print(f"   Predicted 30d Avg: ${predictions['yhat'].head(30).mean():.2f}")
                
            except Exception as e:
                print(f"⚠️  Forecast loop error: {e}")
            
            # Wait before next update
            time.sleep(self.update_interval)


def main():
    """Main entry point"""
    port = int(os.getenv('PORT', '8080'))
    
    # Start HTTP server
    httpd = HTTPServer(('', port), MetricsHandler)
    print(f"✅ FinBot metrics server started on port {port}")
    print(f"   Endpoints: http://localhost:{port}/metrics, http://localhost:{port}/health")
    
    # Start forecast loop in background thread
    forecaster = FinBotForecaster()
    forecast_thread = threading.Thread(target=forecaster.run_forecast_loop, daemon=True)
    forecast_thread.start()
    
    # Run HTTP server
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down FinBot...")
        forecaster.running = False
        httpd.shutdown()


if __name__ == '__main__':
    main()
