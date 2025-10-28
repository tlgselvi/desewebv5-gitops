from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
import pickle
import time
from typing import List, Dict, Any, Optional
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EA Plan v6.0 Recommendation Engine API", version="1.0.0")

class RecommendationRequest(BaseModel):
    user_id: Optional[str] = None
    item_id: Optional[str] = None
    user_profile: Optional[Dict[str, Any]] = None
    item_features: Optional[Dict[str, Any]] = None
    recommendation_type: str  # collaborative, content-based, hybrid
    num_recommendations: int = 10
    context: Optional[Dict[str, Any]] = None

class RecommendationResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    recommendation_type: str
    confidence_scores: List[float]
    processing_time_ms: float
    metadata: Dict[str, Any]

class SimilarityResponse(BaseModel):
    similar_items: List[Dict[str, Any]]
    similarity_scores: List[float]
    processing_time_ms: float

class RecommendationEngine:
    def __init__(self):
        self.models = {}
        self.data = {}
        self.load_models()
        self.load_sample_data()
    
    def load_models(self):
        """Load pre-trained recommendation models"""
        try:
            # Collaborative Filtering Model
            self.models['collaborative'] = pickle.load(open('/app/models/collaborative_model.pkl', 'rb'))
            logger.info("✅ Collaborative filtering model loaded")
            
            # Content-Based Model
            self.models['content_based'] = pickle.load(open('/app/models/content_based_model.pkl', 'rb'))
            logger.info("✅ Content-based model loaded")
            
            # Hybrid Model
            self.models['hybrid'] = pickle.load(open('/app/models/hybrid_model.pkl', 'rb'))
            logger.info("✅ Hybrid model loaded")
            
        except Exception as e:
            logger.warning(f"⚠️ Models not found: {e}. Using mock models.")
            self.models = {
                'collaborative': None,
                'content_based': None,
                'hybrid': None
            }
    
    def load_sample_data(self):
        """Load sample data for demonstration"""
        # Sample user-item interactions
        self.data['interactions'] = {
            'user_001': ['item_001', 'item_003', 'item_005', 'item_007'],
            'user_002': ['item_002', 'item_004', 'item_006', 'item_008'],
            'user_003': ['item_001', 'item_002', 'item_009', 'item_010'],
            'user_004': ['item_003', 'item_005', 'item_007', 'item_011'],
            'user_005': ['item_004', 'item_006', 'item_008', 'item_012']
        }
        
        # Sample item features
        self.data['item_features'] = {
            'item_001': {'category': 'technology', 'price': 299.99, 'rating': 4.5, 'tags': ['smartphone', 'mobile', 'android']},
            'item_002': {'category': 'technology', 'price': 199.99, 'rating': 4.2, 'tags': ['tablet', 'mobile', 'ios']},
            'item_003': {'category': 'electronics', 'price': 149.99, 'rating': 4.7, 'tags': ['headphones', 'audio', 'wireless']},
            'item_004': {'category': 'electronics', 'price': 79.99, 'rating': 4.0, 'tags': ['speaker', 'audio', 'bluetooth']},
            'item_005': {'category': 'computing', 'price': 1299.99, 'rating': 4.8, 'tags': ['laptop', 'computer', 'windows']},
            'item_006': {'category': 'computing', 'price': 899.99, 'rating': 4.3, 'tags': ['desktop', 'computer', 'gaming']},
            'item_007': {'category': 'home', 'price': 199.99, 'rating': 4.1, 'tags': ['smart-home', 'automation', 'wifi']},
            'item_008': {'category': 'home', 'price': 299.99, 'rating': 4.6, 'tags': ['security', 'camera', 'outdoor']},
            'item_009': {'category': 'fitness', 'price': 199.99, 'rating': 4.4, 'tags': ['smartwatch', 'fitness', 'health']},
            'item_010': {'category': 'fitness', 'price': 99.99, 'rating': 4.2, 'tags': ['fitness-tracker', 'health', 'sport']},
            'item_011': {'category': 'gaming', 'price': 499.99, 'rating': 4.9, 'tags': ['console', 'gaming', 'entertainment']},
            'item_012': {'category': 'gaming', 'price': 59.99, 'rating': 4.1, 'tags': ['controller', 'gaming', 'accessory']}
        }
        
        # Sample user profiles
        self.data['user_profiles'] = {
            'user_001': {'age': 25, 'gender': 'M', 'interests': ['technology', 'gaming'], 'budget': 500},
            'user_002': {'age': 30, 'gender': 'F', 'interests': ['electronics', 'home'], 'budget': 300},
            'user_003': {'age': 35, 'gender': 'M', 'interests': ['computing', 'fitness'], 'budget': 800},
            'user_004': {'age': 28, 'gender': 'F', 'interests': ['technology', 'home'], 'budget': 400},
            'user_005': {'age': 22, 'gender': 'M', 'interests': ['gaming', 'electronics'], 'budget': 600}
        }
    
    def collaborative_filtering(self, user_id: str, num_recommendations: int = 10) -> List[Dict[str, Any]]:
        """Collaborative filtering recommendations"""
        if self.models['collaborative'] is None:
            # Mock collaborative filtering
            user_items = self.data['interactions'].get(user_id, [])
            all_items = list(self.data['item_features'].keys())
            unrated_items = [item for item in all_items if item not in user_items]
            
            recommendations = []
            for item in unrated_items[:num_recommendations]:
                score = np.random.uniform(0.6, 0.95)
                recommendations.append({
                    'item_id': item,
                    'score': score,
                    'reason': 'Users with similar preferences also liked this item'
                })
            
            return sorted(recommendations, key=lambda x: x['score'], reverse=True)
        
        # Real collaborative filtering implementation would go here
        return []
    
    def content_based_filtering(self, user_id: str, num_recommendations: int = 10) -> List[Dict[str, Any]]:
        """Content-based filtering recommendations"""
        if self.models['content_based'] is None:
            # Mock content-based filtering
            user_profile = self.data['user_profiles'].get(user_id, {})
            user_interests = user_profile.get('interests', [])
            user_items = self.data['interactions'].get(user_id, [])
            
            recommendations = []
            for item_id, features in self.data['item_features'].items():
                if item_id not in user_items:
                    # Calculate similarity based on interests
                    item_category = features.get('category', '')
                    item_tags = features.get('tags', [])
                    
                    similarity_score = 0
                    if item_category in user_interests:
                        similarity_score += 0.5
                    
                    for tag in item_tags:
                        if any(interest in tag.lower() for interest in user_interests):
                            similarity_score += 0.1
                    
                    if similarity_score > 0:
                        recommendations.append({
                            'item_id': item_id,
                            'score': min(similarity_score, 0.95),
                            'reason': f'Matches your interests in {item_category}'
                        })
            
            return sorted(recommendations, key=lambda x: x['score'], reverse=True)[:num_recommendations]
        
        # Real content-based filtering implementation would go here
        return []
    
    def hybrid_recommendation(self, user_id: str, num_recommendations: int = 10) -> List[Dict[str, Any]]:
        """Hybrid recommendation combining collaborative and content-based"""
        if self.models['hybrid'] is None:
            # Mock hybrid recommendation
            collaborative_recs = self.collaborative_filtering(user_id, num_recommendations * 2)
            content_recs = self.content_based_filtering(user_id, num_recommendations * 2)
            
            # Combine and re-rank
            all_recs = {}
            for rec in collaborative_recs:
                item_id = rec['item_id']
                all_recs[item_id] = {
                    'item_id': item_id,
                    'collaborative_score': rec['score'],
                    'content_score': 0,
                    'hybrid_score': rec['score'] * 0.6
                }
            
            for rec in content_recs:
                item_id = rec['item_id']
                if item_id in all_recs:
                    all_recs[item_id]['content_score'] = rec['score']
                    all_recs[item_id]['hybrid_score'] = (
                        all_recs[item_id]['collaborative_score'] * 0.6 + 
                        rec['score'] * 0.4
                    )
                else:
                    all_recs[item_id] = {
                        'item_id': item_id,
                        'collaborative_score': 0,
                        'content_score': rec['score'],
                        'hybrid_score': rec['score'] * 0.4
                    }
            
            recommendations = sorted(all_recs.values(), key=lambda x: x['hybrid_score'], reverse=True)
            return recommendations[:num_recommendations]
        
        # Real hybrid recommendation implementation would go here
        return []
    
    def get_similar_items(self, item_id: str, num_similar: int = 5) -> List[Dict[str, Any]]:
        """Get similar items based on features"""
        if item_id not in self.data['item_features']:
            return []
        
        target_features = self.data['item_features'][item_id]
        similar_items = []
        
        for other_item_id, features in self.data['item_features'].items():
            if other_item_id != item_id:
                # Calculate similarity based on features
                similarity = 0
                
                # Category similarity
                if features['category'] == target_features['category']:
                    similarity += 0.4
                
                # Price similarity (inverse distance)
                price_diff = abs(features['price'] - target_features['price'])
                max_price = max(features['price'], target_features['price'])
                price_similarity = 1 - (price_diff / max_price)
                similarity += price_similarity * 0.3
                
                # Tag similarity
                target_tags = set(target_features['tags'])
                other_tags = set(features['tags'])
                tag_similarity = len(target_tags.intersection(other_tags)) / len(target_tags.union(other_tags))
                similarity += tag_similarity * 0.3
                
                similar_items.append({
                    'item_id': other_item_id,
                    'similarity_score': similarity,
                    'reason': f'Similar {features["category"]} item with matching features'
                })
        
        return sorted(similar_items, key=lambda x: x['similarity_score'], reverse=True)[:num_similar]

# Initialize service
rec_engine = RecommendationEngine()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "recommendation-engine",
        "models_loaded": {
            "collaborative": rec_engine.models['collaborative'] is not None,
            "content_based": rec_engine.models['content_based'] is not None,
            "hybrid": rec_engine.models['hybrid'] is not None
        },
        "data_loaded": {
            "interactions": len(rec_engine.data['interactions']),
            "item_features": len(rec_engine.data['item_features']),
            "user_profiles": len(rec_engine.data['user_profiles'])
        },
        "version": "1.0.0"
    }

@app.post("/recommend", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get recommendations for a user"""
    start_time = time.time()
    
    try:
        if request.recommendation_type == "collaborative":
            recommendations = rec_engine.collaborative_filtering(
                request.user_id or "user_001", 
                request.num_recommendations
            )
        elif request.recommendation_type == "content-based":
            recommendations = rec_engine.content_based_filtering(
                request.user_id or "user_001", 
                request.num_recommendations
            )
        elif request.recommendation_type == "hybrid":
            recommendations = rec_engine.hybrid_recommendation(
                request.user_id or "user_001", 
                request.num_recommendations
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid recommendation type")
        
        processing_time = (time.time() - start_time) * 1000
        confidence_scores = [rec['score'] for rec in recommendations]
        
        return RecommendationResponse(
            recommendations=recommendations,
            recommendation_type=request.recommendation_type,
            confidence_scores=confidence_scores,
            processing_time_ms=processing_time,
            metadata={
                "user_id": request.user_id,
                "num_recommendations": len(recommendations),
                "algorithm": request.recommendation_type
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/similar", response_model=SimilarityResponse)
async def get_similar_items(request: RecommendationRequest):
    """Get similar items to a given item"""
    start_time = time.time()
    
    try:
        if not request.item_id:
            raise HTTPException(status_code=400, detail="item_id is required for similarity")
        
        similar_items = rec_engine.get_similar_items(request.item_id, request.num_recommendations)
        processing_time = (time.time() - start_time) * 1000
        similarity_scores = [item['similarity_score'] for item in similar_items]
        
        return SimilarityResponse(
            similar_items=similar_items,
            similarity_scores=similarity_scores,
            processing_time_ms=processing_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/items/{item_id}")
async def get_item_details(item_id: str):
    """Get detailed information about an item"""
    if item_id not in rec_engine.data['item_features']:
        raise HTTPException(status_code=404, detail="Item not found")
    
    features = rec_engine.data['item_features'][item_id]
    return {
        "item_id": item_id,
        "features": features,
        "metadata": {
            "category": features['category'],
            "price": features['price'],
            "rating": features['rating'],
            "tags": features['tags']
        }
    }

@app.get("/users/{user_id}")
async def get_user_profile(user_id: str):
    """Get user profile information"""
    if user_id not in rec_engine.data['user_profiles']:
        raise HTTPException(status_code=404, detail="User not found")
    
    profile = rec_engine.data['user_profiles'][user_id]
    interactions = rec_engine.data['interactions'].get(user_id, [])
    
    return {
        "user_id": user_id,
        "profile": profile,
        "interactions": {
            "total_items": len(interactions),
            "item_ids": interactions
        }
    }

@app.get("/analytics/recommendations")
async def get_recommendation_analytics():
    """Get analytics about recommendation performance"""
    return {
        "total_users": len(rec_engine.data['user_profiles']),
        "total_items": len(rec_engine.data['item_features']),
        "total_interactions": sum(len(items) for items in rec_engine.data['interactions'].values()),
        "categories": list(set(features['category'] for features in rec_engine.data['item_features'].values())),
        "average_rating": np.mean([features['rating'] for features in rec_engine.data['item_features'].values()]),
        "price_range": {
            "min": min(features['price'] for features in rec_engine.data['item_features'].values()),
            "max": max(features['price'] for features in rec_engine.data['item_features'].values())
        }
    }

@app.get("/models/info")
async def get_models_info():
    """Get information about loaded models"""
    return {
        "models": {
            "collaborative": {
                "loaded": rec_engine.models['collaborative'] is not None,
                "type": "Matrix Factorization",
                "algorithm": "SVD"
            },
            "content_based": {
                "loaded": rec_engine.models['content_based'] is not None,
                "type": "TF-IDF",
                "algorithm": "Cosine Similarity"
            },
            "hybrid": {
                "loaded": rec_engine.models['hybrid'] is not None,
                "type": "Ensemble",
                "algorithm": "Weighted Combination"
            }
        },
        "capabilities": [
            "collaborative-filtering",
            "content-based-filtering",
            "hybrid-recommendation",
            "item-similarity",
            "user-profiling",
            "recommendation-analytics"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
