from typing import Dict, Any
import random

class ArgoAdapter:
    def sync(self, app: str) -> Dict[str, Any]:
        """ArgoCD uygulamasını senkronize et (stub)"""
        return {
            "argo_app": app,
            "sync": "requested",
            "status": "syncing",
            "revision": f"commit-{random.randint(1000, 9999)}",
            "timestamp": "2025-10-29T01:30:00Z"
        }

    def get_app_status(self, app: str) -> Dict[str, Any]:
        """ArgoCD uygulama durumunu getir"""
        return {
            "name": app,
            "status": "synced",
            "health": "healthy",
            "sync_status": "synced",
            "last_sync": "2025-10-29T01:25:00Z"
        }

    def get_apps(self) -> Dict[str, Any]:
        """Tüm ArgoCD uygulamalarını listele"""
        return {
            "applications": [
                {"name": "cpt-ajan", "status": "synced", "health": "healthy"},
                {"name": "gitops-demo", "status": "synced", "health": "healthy"}
            ]
        }
