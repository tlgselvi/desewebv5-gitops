#!/usr/bin/env python3
"""
SEO Rank Drift Observer
Monitors keyword rankings and detects >10% negative drift.
Sends Slack alert on significant rank drops.
"""

import json
import os
import requests
import sys
from datetime import datetime
from typing import Dict, List, Any


class SEORankObserver:
    """Monitor SEO keyword rank changes"""
    
    def __init__(self, api_key: str, slack_webhook: str = None):
        self.api_key = api_key
        self.slack_webhook = slack_webhook
        self.base_url = "https://api.cpt-digital.com/v1/seo"  # Replace with actual CPT API
    
    def fetch_rankings(self, keywords: List[str]) -> Dict[str, int]:
        """Fetch current keyword rankings from CPT API"""
        rankings = {}
        
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{self.base_url}/rankings",
                headers=headers,
                json={'keywords': keywords},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                rankings = {item['keyword']: item['rank'] for item in data.get('results', [])}
            else:
                print(f"⚠️  API returned status {response.status_code}: {response.text}")
        
        except Exception as e:
            print(f"❌ Error fetching rankings: {e}")
        
        return rankings
    
    def load_baseline_rankings(self, baseline_file: str = 'baseline-rankings.json') -> Dict[str, int]:
        """Load baseline rankings from file"""
        try:
            if os.path.exists(baseline_file):
                with open(baseline_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"⚠️  Could not load baseline: {e}")
        
        return {}
    
    def save_baseline(self, rankings: Dict[str, int], baseline_file: str = 'baseline-rankings.json'):
        """Save current rankings as baseline"""
        try:
            with open(baseline_file, 'w') as f:
                json.dump(rankings, f, indent=2)
            print(f"✅ Baseline saved to {baseline_file}")
        except Exception as e:
            print(f"❌ Error saving baseline: {e}")
    
    def calculate_drift(self, current: Dict[str, int], baseline: Dict[str, int]) -> Dict[str, Dict[str, Any]]:
        """Calculate drift percentage for each keyword"""
        drifts = {}
        
        for keyword in current.keys():
            if keyword in baseline:
                current_rank = current[keyword]
                baseline_rank = baseline[keyword]
                
                if baseline_rank > 0:
                    drift_pct = ((baseline_rank - current_rank) / baseline_rank) * 100
                else:
                    drift_pct = 0.0
                
                drifts[keyword] = {
                    'current_rank': current_rank,
                    'baseline_rank': baseline_rank,
                    'drift_pct': drift_pct,
                    'improving': drift_pct > 0,
                    'declining': drift_pct < -10
                }
        
        return drifts
    
    def send_slack_alert(self, drifts: Dict[str, Dict[str, Any]]):
        """Send Slack alert for significant rank drops"""
        if not self.slack_webhook:
            return
        
        declining_keywords = {k: v for k, v in drifts.items() if v['declining']}
        
        if not declining_keywords:
            return
        
        message = {
            "text": "🚨 SEO Rank Drift Alert",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🚨 SEO Rank Drift Detected"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Negative drift detected for {len(declining_keywords)} keywords*\n\n"
                    }
                }
            ]
        }
        
        # Add details for each declining keyword
        for keyword, data in declining_keywords.items():
            message["blocks"].append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{keyword}*\n"
                           f"Baseline: {data['baseline_rank']}\n"
                           f"Current: {data['current_rank']}\n"
                           f"Drift: {data['drift_pct']:.1f}%"
                }
            })
        
        try:
            response = requests.post(self.slack_webhook, json=message, timeout=10)
            if response.status_code == 200:
                print("✅ Slack alert sent")
            else:
                print(f"⚠️  Slack alert failed: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Error sending Slack alert: {e}")
    
    def observe(self, keywords: List[str], baseline_file: str = 'baseline-rankings.json'):
        """Main observation workflow"""
        print("=" * 60)
        print("🔍 SEO Rank Drift Observer")
        print("=" * 60)
        
        # Fetch current rankings
        print("\n📊 Fetching current rankings...")
        current_rankings = self.fetch_rankings(keywords)
        
        if not current_rankings:
            print("⚠️  No rankings available")
            return
        
        print(f"✅ Fetched {len(current_rankings)} keyword rankings")
        
        # Load baseline
        baseline_rankings = self.load_baseline_rankings(baseline_file)
        
        if not baseline_rankings:
            print("\n⚠️  No baseline found. Creating baseline from current rankings...")
            self.save_baseline(current_rankings, baseline_file)
            print("✅ Baseline created")
            return
        
        # Calculate drift
        print("\n📈 Calculating drift...")
        drifts = self.calculate_drift(current_rankings, baseline_rankings)
        
        # Report results
        print("\n" + "=" * 60)
        print("📊 Drift Analysis")
        print("=" * 60)
        
        declining_count = sum(1 for d in drifts.values() if d['declining'])
        improving_count = sum(1 for d in drifts.values() if d['improving'])
        
        print(f"\nDeclining: {declining_count}")
        print(f"Improving: {improving_count}")
        print(f"Stable: {len(drifts) - declining_count - improving_count}")
        
        for keyword, data in drifts.items():
            status = "🔻" if data['declining'] else ("🔺" if data['improving'] else "➡️")
            print(f"\n{status} {keyword}:")
            print(f"   Baseline: {data['baseline_rank']} → Current: {data['current_rank']}")
            print(f"   Drift: {data['drift_pct']:+.1f}%")
        
        # Send Slack alert if significant drift
        if declining_count > 0:
            print(f"\n⚠️  Alert: {declining_count} keywords declining >10%")
            self.send_slack_alert(drifts)
            
            # Save updated baseline
            self.save_baseline(current_rankings, baseline_file)
            
            sys.exit(1)
        else:
            print("\n✅ No significant negative drift detected")
            sys.exit(0)


def main():
    """Main entry point"""
    # Get API key from environment
    api_key = os.getenv('CPT_API_KEY', '')
    slack_webhook = os.getenv('SLACK_WEBHOOK', '')
    
    if not api_key:
        print("⚠️  CPT_API_KEY not set")
        sys.exit(1)
    
    # Keywords to monitor (from environment or defaults)
    keywords_str = os.getenv('KEYWORDS', '')
    if keywords_str:
        keywords = [k.strip() for k in keywords_str.split(',')]
    else:
        keywords = ['digital marketing', 'SEO services', 'web optimization']
    
    print(f"📝 Monitoring {len(keywords)} keywords")
    
    # Create observer and run
    observer = SEORankObserver(api_key, slack_webhook)
    observer.observe(keywords)


if __name__ == '__main__':
    main()

