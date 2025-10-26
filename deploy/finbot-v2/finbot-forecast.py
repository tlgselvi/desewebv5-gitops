#!/usr/bin/env python3
"""
EA Plan v5.5.1 - FinBot v2.0 Cost & ROI Forecasting
Prophet-based cost trend prediction with ROI optimization
"""

import os
import sys
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
from prometheus_client import CollectorRegistry, Gauge, Counter, push_to_gateway

try:
    from prophet import Prophet
except ImportError:
    print("⚠️  Prophet not installed, using placeholder")
    Prophet = None


class FinBotForecaster:
    """Cost & ROI forecasting using Prophet time-series analysis"""
    
    def __init__(self):
        self.prometheus_gateway = os.getenv('PROMETHEUS_GATEWAY', 'http://prometheus:9091')
        self.prediction_horizon = int(os.getenv('FINBOT_PREDICTION_DAYS', '90'))
        
        # Prometheus metrics
        self.registry = CollectorRegistry()
        self.cost_prediction = Gauge('finbot_cost_prediction', 'Predicted cost (USD)', 
                                     ['period'], registry=self.registry)
        self.cost_correlation = Gauge('finbot_cost_correlation', 'Cost prediction correlation (0-1)', 
                                      registry=self.registry)
        self.roi_score = Gauge('finbot_roi_score', 'ROI optimization score (0-100)', 
                              registry=self.registry)
        self.budget_variance = Gauge('finbot_budget_variance', 'Budget variance percentage', 
                                    registry=self.registry)
        
        # Prophet model
        self.prophet_model = None
        self.correlation_score = 0.0
    
    def fetch_historical_cost_data(self, days: int = 90) -> pd.DataFrame:
        """Fetch historical cost data from cloud providers / APIs"""
        try:
            # In production, this would query AWS/Azure/GCP billing APIs
            # For now, generating mock data structure
            
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
                print("⚠️  Prophet not available, skipping training")
                return None
            
            # Initialize Prophet model
            model = Prophet(
                yearly_seasonality=False,
                weekly_seasonality=True,
                daily_seasonality=False,
                seasonality_mode='multiplicative'
            )
            
            # Add custom seasonality
            model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
            
            # Fit model
            model.fit(df)
            
            self.prophet_model = model
            print("✅ Prophet model trained successfully")
            return model
            
        except Exception as e:
            print(f"⚠️  Model training error: {e}")
            return None
    
    def predict_future_costs(self, periods: int = 90) -> pd.DataFrame:
        """Generate future cost predictions"""
        try:
            if self.prophet_model is None:
                print("⚠️  Model not trained, returning empty forecast")
                return pd.DataFrame()
            
            # Create future dates
            future = self.prophet_model.make_future_dataframe(periods=periods)
            
            # Predict
            forecast = self.prophet_model.predict(future)
            
            # Extract forecast only (not historical)
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
            
            # Align data
            historical_trend = historical['y'].values[-len(predicted):]
            predicted_trend = predicted['yhat'].values
            
            # Calculate correlation
            correlation = np.corrcoef(historical_trend, predicted_trend)[0, 1]
            
            # Handle NaN
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
                return 50.0  # Neutral score
            
            # Average predicted cost for next 30 days
            avg_future_cost = predicted_costs['yhat'].head(30).mean()
            
            # Calculate ROI score (inverse of cost increase)
            if avg_future_cost > current_costs:
                cost_increase_pct = ((avg_future_cost - current_costs) / current_costs) * 100
                roi_score = max(0, 100 - cost_increase_pct * 2)  # Penalize cost increases
            else:
                cost_decrease_pct = ((current_costs - avg_future_cost) / current_costs) * 100
                roi_score = min(100, 50 + cost_decrease_pct * 2)  # Reward cost decreases
            
            return float(roi_score)
            
        except Exception as e:
            print(f"⚠️  ROI calculation error: {e}")
            return 50.0
    
    def export_metrics_to_prometheus(self, predictions: pd.DataFrame, correlation: float, 
                                    roi_score: float, budget_variance: float):
        """Export FinBot metrics to Prometheus"""
        try:
            if not predictions.empty:
                # Export predictions for different periods
                self.cost_prediction.labels(period='7d').set(predictions['yhat'].head(7).mean())
                self.cost_prediction.labels(period='30d').set(predictions['yhat'].head(30).mean())
                self.cost_prediction.labels(period='90d').set(predictions['yhat'].mean())
            
            self.cost_correlation.set(correlation)
            self.roi_score.set(roi_score)
            self.budget_variance.set(budget_variance)
            
            # Push metrics
            push_to_gateway(
                gateway=self.prometheus_gateway,
                job='finbot-v2-forecaster',
                registry=self.registry
            )
            
            print(f"✅ Metrics exported to Prometheus")
            
        except Exception as e:
            print(f"⚠️  Prometheus export error: {e}")
    
    def run_forecast(self) -> Dict[str, Any]:
        """Main forecasting workflow"""
        print("💰 Starting FinBot v2.0 Cost & ROI Forecasting...")
        
        # Fetch historical data
        print("📊 Fetching historical cost data...")
        historical_data = self.fetch_historical_cost_data(days=90)
        
        if historical_data.empty:
            print("❌ No historical data available")
            return {}
        
        # Train model
        print("🧠 Training Prophet model...")
        model = self.train_prophet_model(historical_data)
        
        if model is None:
            print("❌ Model training failed")
            return {}
        
        # Predict future costs
        print(f"🔮 Predicting costs for next {self.prediction_horizon} days...")
        predictions = self.predict_future_costs(periods=self.prediction_horizon)
        
        if predictions.empty:
            print("❌ Prediction failed")
            return {}
        
        # Calculate correlation
        correlation = self.calculate_correlation(historical_data, predictions)
        self.correlation_score = correlation
        
        # Calculate ROI score
        current_cost = historical_data['y'].iloc[-1]
        roi_score = self.calculate_roi_score(predictions, current_cost)
        
        # Calculate budget variance (mock for now)
        budget_variance = 0.0
        
        # Export to Prometheus
        self.export_metrics_to_prometheus(predictions, correlation, roi_score, budget_variance)
        
        # Print summary
        print(f"\n💰 FinBot Forecast Summary:")
        print(f"   Correlation: {correlation:.3f}")
        print(f"   ROI Score: {roi_score:.1f}")
        print(f"   Current Cost: ${current_cost:.2f}")
        print(f"   Predicted 30d Avg: ${predictions['yhat'].head(30).mean():.2f}")
        
        return {
            'correlation': correlation,
            'roi_score': roi_score,
            'predictions': predictions.to_dict('records'),
            'timestamp': datetime.now().isoformat()
        }


def main():
    """Main entry point"""
    forecaster = FinBotForecaster()
    results = forecaster.run_forecast()
    
    if results:
        print(f"\n✅ FinBot forecast complete")
        sys.exit(0)
    else:
        print("\n❌ FinBot forecast failed")
        sys.exit(1)


if __name__ == '__main__':
    main()
