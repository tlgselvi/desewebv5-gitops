#!/usr/bin/env python3
"""
EA Plan v6.7.0 - FinBot Event Publisher
Redis Streams event publisher for real-time synchronization
"""

import os
import json
import uuid
import hmac
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional
import redis


class FinBotEventPublisher:
    """
    Publishes events to Redis Streams for real-time synchronization.
    
    Events are HMAC signed for integrity verification.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize event publisher.
        
        Args:
            redis_url: Redis connection URL (default: from REDIS_URL env)
        """
        self.redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = redis.from_url(self.redis_url, decode_responses=False)
        self.event_secret = os.getenv(
            'EVENT_BUS_SECRET',
            'ea-plan-event-bus-secret-key-min-32-chars'
        )
        self.stream_name = 'finbot.events'
    
    def _sign_event(self, event_data: Dict[str, Any]) -> str:
        """
        Create HMAC-SHA256 signature for event.
        
        Args:
            event_data: Event data dictionary (without signature)
            
        Returns:
            Hex-encoded HMAC signature
        """
        payload = json.dumps({
            'id': event_data['id'],
            'type': event_data['type'],
            'timestamp': event_data['timestamp'],
            'source': event_data['source'],
            'data': event_data['data'],
            'version': event_data.get('version', '1.0.0'),
        }, sort_keys=True)
        
        signature = hmac.new(
            self.event_secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    def _create_event(
        self,
        event_type: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a signed event.
        
        Args:
            event_type: Event type (e.g., 'finbot.transaction.created')
            data: Event payload data
            
        Returns:
            Complete event dictionary with signature
        """
        event: Dict[str, Any] = {
            'id': str(uuid.uuid4()),
            'type': event_type,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'source': 'finbot',
            'data': data,
            'version': '1.0.0',
        }
        
        event['signature'] = self._sign_event(event)
        
        return event
    
    def publish_event(
        self,
        event_type: str,
        data: Dict[str, Any],
        stream_name: Optional[str] = None
    ) -> Optional[str]:
        """
        Publish event to Redis Stream.
        
        Args:
            event_type: Event type (e.g., 'finbot.transaction.created')
            data: Event payload data
            stream_name: Stream name (default: finbot.events)
            
        Returns:
            Redis Stream message ID, or None on error
        """
        try:
            event = self._create_event(event_type, data)
            stream = stream_name or self.stream_name
            
            # Convert event to JSON string for Redis Stream
            event_json = json.dumps(event)
            
            # Publish to Redis Stream using XADD
            message_id = self.redis_client.xadd(
                stream,
                {
                    'event': event_json,
                },
                maxlen=10000,  # Keep last 10k events
                approximate=True
            )
            
            return message_id.decode('utf-8') if isinstance(message_id, bytes) else str(message_id)
            
        except Exception as e:
            print(f"ERROR: Failed to publish event: {e}")
            return None
    
    def publish_transaction_created(
        self,
        transaction_id: str,
        account_id: str,
        amount: float,
        currency: str,
        transaction_type: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Publish transaction.created event.
        
        Args:
            transaction_id: Transaction ID
            account_id: Account ID
            amount: Transaction amount
            currency: Currency code
            transaction_type: 'income', 'expense', or 'transfer'
            description: Optional transaction description
            metadata: Optional additional metadata
            
        Returns:
            Redis Stream message ID, or None on error
        """
        data = {
            'transactionId': transaction_id,
            'accountId': account_id,
            'amount': amount,
            'currency': currency,
            'type': transaction_type,
        }
        
        if description:
            data['description'] = description
        
        if metadata:
            data['metadata'] = metadata
        
        return self.publish_event('finbot.transaction.created', data)
    
    def close(self):
        """Close Redis connection."""
        if self.redis_client:
            self.redis_client.close()


# Singleton instance
_publisher_instance: Optional[FinBotEventPublisher] = None


def get_publisher() -> FinBotEventPublisher:
    """
    Get or create singleton event publisher instance.
    
    Returns:
        FinBotEventPublisher instance
    """
    global _publisher_instance
    if _publisher_instance is None:
        _publisher_instance = FinBotEventPublisher()
    return _publisher_instance


def publish_transaction_event(
    transaction_id: str,
    account_id: str,
    amount: float,
    currency: str,
    transaction_type: str,
    description: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """
    Convenience function to publish transaction.created event.
    
    Args:
        transaction_id: Transaction ID
        account_id: Account ID
        amount: Transaction amount
        currency: Currency code
        transaction_type: 'income', 'expense', or 'transfer'
        description: Optional transaction description
        metadata: Optional additional metadata
        
    Returns:
        Redis Stream message ID, or None on error
    """
    publisher = get_publisher()
    return publisher.publish_transaction_created(
        transaction_id=transaction_id,
        account_id=account_id,
        amount=amount,
        currency=currency,
        transaction_type=transaction_type,
        description=description,
        metadata=metadata,
    )

