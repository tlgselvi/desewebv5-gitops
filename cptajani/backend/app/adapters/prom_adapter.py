from typing import Dict, Any, List
import random
import time

class PromAdapter:
    def query(self, promql: str, time_range: str = "1h") -> Dict[str, Any]:
        """Prometheus metriklerini sorgula (stub)"""
        # Simulate query execution
        time.sleep(0.1)  # Simulate network delay
        
        return {
            "query": promql,
            "data": [
                {
                    "metric": {"__name__": "cpu_usage", "instance": "pod-1"},
                    "values": [[time.time() - 3600, "0.75"], [time.time(), "0.82"]]
                },
                {
                    "metric": {"__name__": "memory_usage", "instance": "pod-2"},
                    "values": [[time.time() - 3600, "0.65"], [time.time(), "0.71"]]
                }
            ],
            "status": "success",
            "execution_time_ms": random.randint(50, 200)
        }

    def query_range(self, promql: str, start: str, end: str, step: str = "15s") -> Dict[str, Any]:
        """Prometheus range query"""
        return {
            "query": promql,
            "start": start,
            "end": end,
            "step": step,
            "data": self._generate_time_series_data(),
            "status": "success"
        }

    def _generate_time_series_data(self) -> List[Dict]:
        """Zaman serisi verisi oluştur (stub)"""
        data = []
        current_time = time.time()
        
        for i in range(24):  # 24 data points
            timestamp = current_time - (i * 3600)  # Every hour
            value = random.uniform(0.1, 0.9)
            data.append([timestamp, str(value)])
        
        return [{
            "metric": {"__name__": "sample_metric"},
            "values": data
        }]
