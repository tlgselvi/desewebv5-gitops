#!/usr/bin/env python3
"""
EA Plan v5.3.1 - SEO Rank Drift Analyzer
Monitors keyword rankings using Ahrefs + GSC APIs
Exports metrics to Prometheus for anomaly detection
"""

import os
import sys
import json
import time
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from prometheus_client import CollectorRegistry, Gauge, Counter, push_to_gateway


class RankDriftAnalyzer:
    """Analyze SEO rank drift using Ahrefs and GSC data"""
    
    def __init__(self):
        self.ahrefs_token = os.getenv('AHREFS_API_TOKEN')
        self.gsc_service_account = os.getenv('GSC_SERVICE_ACCOUNT_KEY')
        self.prometheus_gateway = os.getenv('PROMETHEUS_GATEWAY', 'http://prometheus:9091')
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
        
        # Prometheus metrics
        self.registry = CollectorRegistry()
        self.rank_drift_score = Gauge('cpt_seo_rank_drift_score', 'SEO rank drift score (-100 to 100)', 
                                      ['keyword'], registry=self.registry)
        self.position_delta = Gauge('cpt_seo_position_delta', 'Position change (positive = dropping)', 
                                    ['keyword'], registry=self.registry)
        self.keyword_visibility = Gauge('cpt_keyword_visibility_index', 'Keyword visibility index (0-100)', 
                                        ['keyword'], registry=self.registry)
        self.drift_events = Counter('cpt_seo_drift_events_total', 'Total drift events detected', 
                                    ['severity'], registry=self.registry)
    
    def fetch_ahrefs_rankings(self, keywords: List[str]) -> Dict[str, Any]:
        """Fetch keyword rankings from Ahrefs API"""
        rankings = {}
        
        try:
            headers = {
                'Authorization': f'Token {self.ahrefs_token}',
                'Content-Type': 'application/json'
            }
            
            # Rate limit: 1 req/sec
            for keyword in keywords:
                response = requests.get(
                    f'https://apiv2.ahrefs.com/v2/keywords',
                    headers=headers,
                    params={'target': keyword, 'limit': 1},
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Parse Ahrefs response
                    if data.get('keywords'):
                        rankings[keyword] = {
                            'position': data['keywords'][0].get('position', 0),
                            'volume': data['keywords'][0].get('search_volume', 0),
                            'cpc': data['keywords'][0].get('cpc', 0)
                        }
                
                time.sleep(1)  # Rate limiting
        
        except Exception as e:
            print(f"⚠️  Ahrefs API error: {e}")
        
        return rankings
    
    def fetch_gsc_data(self, keywords: List[str], days: int = 7) -> Dict[str, Any]:
        """Fetch keyword performance from backend API or Google Search Console"""
        gsc_data = {}
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Try to fetch from backend SEO analytics API first
            try:
                seo_url = f"{self.backend_url}/api/v1/seo/analyze"
                response = requests.post(
                    seo_url,
                    json={'keywords': keywords, 'days': days},
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Extract GSC-like data structure
                    if 'keywords' in data or 'rankings' in data:
                        keyword_data = data.get('keywords', data.get('rankings', {}))
                        gsc_data = {
                            'period': f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                            'keywords': {}
                        }
                        
                        for keyword in keywords:
                            if keyword in keyword_data:
                                gsc_data['keywords'][keyword] = keyword_data[keyword]
                            else:
                                # Default structure if keyword not found
                                gsc_data['keywords'][keyword] = {
                                    'position': 0,
                                    'clicks': 0,
                                    'impressions': 0,
                                    'ctr': 0.0
                                }
                        
                        return gsc_data
            except Exception as api_error:
                print(f"⚠️  Backend API error, trying GSC: {api_error}")
            
            # Try Google Search Console API if credentials available
            if self.gsc_service_account:
                try:
                    # GSC API integration would use google.oauth2 and googleapiclient
                    # For now, this is a placeholder for real GSC integration
                    # In production, you would:
                    # 1. Authenticate with service account
                    # 2. Use searchanalytics.query() method
                    # 3. Fetch position, clicks, impressions data
                    
                    print("⚠️  GSC API integration requires google-api-python-client library")
                    print("⚠️  Using backend API fallback")
                except Exception as gsc_error:
                    print(f"⚠️  GSC API error: {gsc_error}")
            
            # Fallback to mock data structure if all APIs fail
            gsc_data = {
                'period': f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                'keywords': {}
            }
            
            for keyword in keywords:
                gsc_data['keywords'][keyword] = {
                    'position': 0,
                    'clicks': 0,
                    'impressions': 0,
                    'ctr': 0.0
                }
        
        except Exception as e:
            print(f"⚠️  GSC data fetch error: {e}")
            gsc_data = {
                'period': f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                'keywords': {}
            }
        
        return gsc_data
    
    def calculate_drift_score(self, current_positions: Dict[str, int], 
                            baseline_positions: Dict[str, int]) -> Dict[str, float]:
        """Calculate drift score for each keyword"""
        drift_scores = {}
        
        for keyword in current_positions:
            if keyword in baseline_positions:
                current = current_positions[keyword]
                baseline = baseline_positions[keyword]
                
                if baseline > 0:
                    # Calculate drift: positive = improvement, negative = decline
                    drift = ((baseline - current) / baseline) * 100
                    drift_scores[keyword] = drift
                else:
                    drift_scores[keyword] = 0.0
        
        return drift_scores
    
    def detect_anomalies(self, drift_scores: Dict[str, float]) -> List[Dict[str, Any]]:
        """Detect anomalous rank drops using z-score method"""
        anomalies = []
        
        if not drift_scores:
            return anomalies
        
        # Calculate mean and std deviation
        scores = list(drift_scores.values())
        mean = sum(scores) / len(scores)
        variance = sum((x - mean) ** 2 for x in scores) / len(scores)
        std_dev = variance ** 0.5
        
        # Flag anomalies (z-score > 2 or < -2)
        for keyword, score in drift_scores.items():
            if std_dev > 0:
                z_score = (score - mean) / std_dev
                
                if abs(z_score) > 2:
                    severity = 'critical' if score < -20 else 'warning'
                    
                    anomalies.append({
                        'keyword': keyword,
                        'drift_score': score,
                        'z_score': z_score,
                        'severity': severity,
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    # Increment drift events counter
                    self.drift_events.labels(severity=severity).inc()
        
        return anomalies
    
    def export_metrics_to_prometheus(self, drift_scores: Dict[str, float],
                                    position_deltas: Dict[str, int],
                                    visibility_scores: Dict[str, float]):
        """Export SEO metrics to Prometheus pushgateway"""
        try:
            # Set gauge values
            for keyword, score in drift_scores.items():
                self.rank_drift_score.labels(keyword=keyword).set(score)
            
            for keyword, delta in position_deltas.items():
                self.position_delta.labels(keyword=keyword).set(delta)
            
            for keyword, visibility in visibility_scores.items():
                self.keyword_visibility.labels(keyword=keyword).set(visibility)
            
            # Push metrics
            push_to_gateway(
                gateway=self.prometheus_gateway,
                job='seo-rank-drift-analyzer',
                registry=self.registry
            )
            
            print(f"✅ Metrics exported to Prometheus: {len(drift_scores)} keywords")
        
        except Exception as e:
            print(f"⚠️  Prometheus export error: {e}")
    
    def run_analysis(self, keywords: List[str], baseline_file: str = 'baseline-rankings.json'):
        """Main analysis workflow"""
        print("🔍 Starting SEO Rank Drift Analysis...")
        
        # Load baseline
        if os.path.exists(baseline_file):
            with open(baseline_file, 'r') as f:
                baseline_positions = json.load(f)
        else:
            baseline_positions = {}
            print("⚠️  No baseline found. Creating new baseline from current data.")
        
        # Fetch current rankings
        print("📊 Fetching current rankings from Ahrefs...")
        current_rankings = self.fetch_ahrefs_rankings(keywords)
        
        if not current_rankings:
            print("❌ No rankings data available")
            return
        
        # Extract positions
        current_positions = {k: v['position'] for k, v in current_rankings.items()}
        
        # Calculate drift scores
        drift_scores = self.calculate_drift_score(current_positions, baseline_positions)
        
        # Calculate position deltas
        position_deltas = {}
        for keyword in current_positions:
            if keyword in baseline_positions:
                position_deltas[keyword] = current_positions[keyword] - baseline_positions[keyword]
        
        # Calculate visibility scores (mock for now)
        visibility_scores = {k: 100 - v for k, v in current_positions.items()}
        
        # Detect anomalies
        anomalies = self.detect_anomalies(drift_scores)
        
        # Export to Prometheus
        self.export_metrics_to_prometheus(drift_scores, position_deltas, visibility_scores)
        
        # Print summary
        print("\n📈 Rank Drift Analysis Summary:")
        print(f"   Keywords analyzed: {len(drift_scores)}")
        print(f"   Anomalies detected: {len(anomalies)}")
        
        if anomalies:
            print("\n⚠️  Detected Anomalies:")
            for anomaly in anomalies:
                print(f"   - {anomaly['keyword']}: {anomaly['drift_score']:.1f}% drift "
                      f"({anomaly['severity']})")
        
        # Save new baseline
        if current_positions:
            with open(baseline_file, 'w') as f:
                json.dump(current_positions, f, indent=2)
            print(f"\n✅ Baseline updated")
        
        return {
            'drift_scores': drift_scores,
            'anomalies': anomalies,
            'timestamp': datetime.now().isoformat()
        }


def main():
    """Main entry point"""
    # Example keywords to monitor
    keywords = [
        'seo tools',
        'keyword research',
        'seo audit',
        'link building',
        'content marketing'
    ]
    
    analyzer = RankDriftAnalyzer()
    results = analyzer.run_analysis(keywords)
    
    if results:
        print(f"\n✅ Analysis complete: {len(results['drift_scores'])} keywords processed")
        sys.exit(0)
    else:
        print("\n❌ Analysis failed")
        sys.exit(1)


if __name__ == '__main__':
    main()
