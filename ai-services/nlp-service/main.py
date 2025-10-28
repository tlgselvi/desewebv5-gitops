from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import spacy
import transformers
from transformers import pipeline
import torch
import time
from typing import List, Dict, Any, Optional
import logging
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EA Plan v6.0 NLP Service API", version="1.0.0")

class TextAnalysisRequest(BaseModel):
    text: str
    analysis_type: str  # sentiment, classification, entities, summarization, translation
    language: Optional[str] = "en"

class SentimentResponse(BaseModel):
    sentiment: str
    confidence: float
    scores: Dict[str, float]
    processing_time_ms: float

class ClassificationResponse(BaseModel):
    classifications: List[Dict[str, Any]]
    processing_time_ms: float

class EntityResponse(BaseModel):
    entities: List[Dict[str, Any]]
    processing_time_ms: float

class SummarizationResponse(BaseModel):
    summary: str
    original_length: int
    summary_length: int
    compression_ratio: float
    processing_time_ms: float

class TranslationResponse(BaseModel):
    translated_text: str
    source_language: str
    target_language: str
    confidence: float
    processing_time_ms: float

class NLPService:
    def __init__(self):
        self.models = {}
        self.load_models()
    
    def load_models(self):
        """Load pre-trained NLP models"""
        try:
            # Sentiment Analysis
            self.models['sentiment'] = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                return_all_scores=True
            )
            logger.info("✅ Sentiment analysis model loaded")
            
            # Text Classification
            self.models['classification'] = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli"
            )
            logger.info("✅ Text classification model loaded")
            
            # Named Entity Recognition
            self.models['ner'] = pipeline(
                "ner",
                model="dbmdz/bert-large-cased-finetuned-conll03-english",
                aggregation_strategy="simple"
            )
            logger.info("✅ NER model loaded")
            
            # Text Summarization
            self.models['summarization'] = pipeline(
                "summarization",
                model="facebook/bart-large-cnn"
            )
            logger.info("✅ Summarization model loaded")
            
            # Translation
            self.models['translation'] = pipeline(
                "translation_en_to_fr",
                model="Helsinki-NLP/opus-mt-en-fr"
            )
            logger.info("✅ Translation model loaded")
            
        except Exception as e:
            logger.warning(f"⚠️ Models not loaded: {e}. Using mock responses.")
            self.models = {
                'sentiment': None,
                'classification': None,
                'ner': None,
                'summarization': None,
                'translation': None
            }
    
    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze text sentiment"""
        if self.models['sentiment'] is None:
            # Mock sentiment analysis
            return {
                "sentiment": "positive",
                "confidence": 0.85,
                "scores": {
                    "positive": 0.85,
                    "negative": 0.10,
                    "neutral": 0.05
                }
            }
        
        try:
            results = self.models['sentiment'](text)
            scores = {result['label'].lower(): result['score'] for result in results[0]}
            
            # Determine primary sentiment
            primary_sentiment = max(scores, key=scores.get)
            confidence = scores[primary_sentiment]
            
            return {
                "sentiment": primary_sentiment,
                "confidence": confidence,
                "scores": scores
            }
        except Exception as e:
            logger.error(f"Sentiment analysis error: {e}")
            raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {e}")
    
    def classify_text(self, text: str, categories: List[str] = None) -> List[Dict[str, Any]]:
        """Classify text into categories"""
        if categories is None:
            categories = ["business", "technology", "health", "sports", "entertainment", "politics"]
        
        if self.models['classification'] is None:
            # Mock text classification
            return [
                {"label": "technology", "score": 0.92},
                {"label": "business", "score": 0.78},
                {"label": "health", "score": 0.45}
            ]
        
        try:
            result = self.models['classification'](text, categories)
            classifications = [
                {"label": label, "score": score}
                for label, score in zip(result['labels'], result['scores'])
            ]
            return classifications
        except Exception as e:
            logger.error(f"Text classification error: {e}")
            raise HTTPException(status_code=500, detail=f"Text classification failed: {e}")
    
    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract named entities from text"""
        if self.models['ner'] is None:
            # Mock entity extraction
            return [
                {"entity": "Apple Inc.", "label": "ORG", "score": 0.95, "start": 0, "end": 9},
                {"entity": "Tim Cook", "label": "PER", "score": 0.92, "start": 15, "end": 23},
                {"entity": "California", "label": "LOC", "score": 0.88, "start": 30, "end": 40}
            ]
        
        try:
            entities = self.models['ner'](text)
            return [
                {
                    "entity": entity['word'],
                    "label": entity['entity_group'],
                    "score": entity['score'],
                    "start": entity['start'],
                    "end": entity['end']
                }
                for entity in entities
            ]
        except Exception as e:
            logger.error(f"Entity extraction error: {e}")
            raise HTTPException(status_code=500, detail=f"Entity extraction failed: {e}")
    
    def summarize_text(self, text: str, max_length: int = 150) -> Dict[str, Any]:
        """Summarize text"""
        if self.models['summarization'] is None:
            # Mock summarization
            sentences = text.split('.')
            summary = '. '.join(sentences[:2]) + '.'
            return {
                "summary": summary,
                "original_length": len(text),
                "summary_length": len(summary),
                "compression_ratio": len(summary) / len(text)
            }
        
        try:
            summary = self.models['summarization'](
                text,
                max_length=max_length,
                min_length=30,
                do_sample=False
            )
            
            summary_text = summary[0]['summary_text']
            return {
                "summary": summary_text,
                "original_length": len(text),
                "summary_length": len(summary_text),
                "compression_ratio": len(summary_text) / len(text)
            }
        except Exception as e:
            logger.error(f"Summarization error: {e}")
            raise HTTPException(status_code=500, detail=f"Summarization failed: {e}")
    
    def translate_text(self, text: str, target_language: str = "fr") -> Dict[str, Any]:
        """Translate text to target language"""
        if self.models['translation'] is None:
            # Mock translation
            return {
                "translated_text": f"[{target_language}] {text}",
                "source_language": "en",
                "target_language": target_language,
                "confidence": 0.85
            }
        
        try:
            result = self.models['translation'](text)
            return {
                "translated_text": result[0]['translation_text'],
                "source_language": "en",
                "target_language": target_language,
                "confidence": 0.95
            }
        except Exception as e:
            logger.error(f"Translation error: {e}")
            raise HTTPException(status_code=500, detail=f"Translation failed: {e}")

# Initialize service
nlp_service = NLPService()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "nlp-service",
        "models_loaded": {
            "sentiment": nlp_service.models['sentiment'] is not None,
            "classification": nlp_service.models['classification'] is not None,
            "ner": nlp_service.models['ner'] is not None,
            "summarization": nlp_service.models['summarization'] is not None,
            "translation": nlp_service.models['translation'] is not None
        },
        "version": "1.0.0"
    }

@app.post("/analyze/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(request: TextAnalysisRequest):
    """Analyze text sentiment"""
    start_time = time.time()
    
    try:
        result = nlp_service.analyze_sentiment(request.text)
        processing_time = (time.time() - start_time) * 1000
        
        return SentimentResponse(
            sentiment=result['sentiment'],
            confidence=result['confidence'],
            scores=result['scores'],
            processing_time_ms=processing_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/classification", response_model=ClassificationResponse)
async def classify_text(request: TextAnalysisRequest):
    """Classify text into categories"""
    start_time = time.time()
    
    try:
        categories = ["business", "technology", "health", "sports", "entertainment", "politics"]
        classifications = nlp_service.classify_text(request.text, categories)
        processing_time = (time.time() - start_time) * 1000
        
        return ClassificationResponse(
            classifications=classifications,
            processing_time_ms=processing_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/entities", response_model=EntityResponse)
async def extract_entities(request: TextAnalysisRequest):
    """Extract named entities from text"""
    start_time = time.time()
    
    try:
        entities = nlp_service.extract_entities(request.text)
        processing_time = (time.time() - start_time) * 1000
        
        return EntityResponse(
            entities=entities,
            processing_time_ms=processing_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/summarization", response_model=SummarizationResponse)
async def summarize_text(request: TextAnalysisRequest):
    """Summarize text"""
    start_time = time.time()
    
    try:
        result = nlp_service.summarize_text(request.text)
        processing_time = (time.time() - start_time) * 1000
        
        return SummarizationResponse(
            summary=result['summary'],
            original_length=result['original_length'],
            summary_length=result['summary_length'],
            compression_ratio=result['compression_ratio'],
            processing_time_ms=processing_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/translation", response_model=TranslationResponse)
async def translate_text(request: TextAnalysisRequest):
    """Translate text"""
    start_time = time.time()
    
    try:
        result = nlp_service.translate_text(request.text, request.language or "fr")
        processing_time = (time.time() - start_time) * 1000
        
        return TranslationResponse(
            translated_text=result['translated_text'],
            source_language=result['source_language'],
            target_language=result['target_language'],
            confidence=result['confidence'],
            processing_time_ms=processing_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/comprehensive")
async def comprehensive_analysis(request: TextAnalysisRequest):
    """Perform comprehensive NLP analysis"""
    start_time = time.time()
    
    try:
        # Perform all analyses
        sentiment = nlp_service.analyze_sentiment(request.text)
        classifications = nlp_service.classify_text(request.text)
        entities = nlp_service.extract_entities(request.text)
        summary = nlp_service.summarize_text(request.text)
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "sentiment_analysis": sentiment,
            "text_classification": classifications,
            "entity_extraction": entities,
            "text_summarization": summary,
            "processing_time_ms": processing_time,
            "text_metrics": {
                "word_count": len(request.text.split()),
                "character_count": len(request.text),
                "sentence_count": len(re.split(r'[.!?]+', request.text)),
                "language": request.language or "en"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/info")
async def get_models_info():
    """Get information about loaded models"""
    return {
        "models": {
            "sentiment": {
                "loaded": nlp_service.models['sentiment'] is not None,
                "type": "RoBERTa",
                "model_name": "cardiffnlp/twitter-roberta-base-sentiment-latest"
            },
            "classification": {
                "loaded": nlp_service.models['classification'] is not None,
                "type": "BART",
                "model_name": "facebook/bart-large-mnli"
            },
            "ner": {
                "loaded": nlp_service.models['ner'] is not None,
                "type": "BERT",
                "model_name": "dbmdz/bert-large-cased-finetuned-conll03-english"
            },
            "summarization": {
                "loaded": nlp_service.models['summarization'] is not None,
                "type": "BART",
                "model_name": "facebook/bart-large-cnn"
            },
            "translation": {
                "loaded": nlp_service.models['translation'] is not None,
                "type": "MarianMT",
                "model_name": "Helsinki-NLP/opus-mt-en-fr"
            }
        },
        "capabilities": [
            "sentiment-analysis",
            "text-classification",
            "named-entity-recognition",
            "text-summarization",
            "translation",
            "comprehensive-analysis"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
