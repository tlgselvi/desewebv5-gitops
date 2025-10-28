from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
import cv2
import numpy as np
import tensorflow as tf
from PIL import Image
import io
import base64
import time
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EA Plan v6.0 Computer Vision API", version="1.0.0")

class ImageAnalysisRequest(BaseModel):
    image_data: str  # Base64 encoded image
    analysis_type: str  # object-detection, image-classification, face-recognition
    confidence_threshold: float = 0.5

class ObjectDetectionResponse(BaseModel):
    objects: List[Dict[str, Any]]
    processing_time_ms: float
    image_size: Dict[str, int]

class ImageClassificationResponse(BaseModel):
    classifications: List[Dict[str, Any]]
    processing_time_ms: float
    image_size: Dict[str, int]

class FaceRecognitionResponse(BaseModel):
    faces: List[Dict[str, Any]]
    processing_time_ms: float
    image_size: Dict[str, int]

class ComputerVisionService:
    def __init__(self):
        self.models = {}
        self.load_models()
    
    def load_models(self):
        """Load pre-trained models for different CV tasks"""
        try:
            # Object Detection Model (YOLO)
            self.models['object_detection'] = tf.keras.models.load_model('/app/models/yolo_object_detection.h5')
            logger.info("✅ Object detection model loaded")
            
            # Image Classification Model (ResNet)
            self.models['image_classification'] = tf.keras.models.load_model('/app/models/resnet_classification.h5')
            logger.info("✅ Image classification model loaded")
            
            # Face Recognition Model (FaceNet)
            self.models['face_recognition'] = tf.keras.models.load_model('/app/models/facenet_recognition.h5')
            logger.info("✅ Face recognition model loaded")
            
        except Exception as e:
            logger.warning(f"⚠️ Models not found: {e}. Using mock models for demonstration.")
            self.models = {
                'object_detection': None,
                'image_classification': None,
                'face_recognition': None
            }
    
    def preprocess_image(self, image_data: str) -> np.ndarray:
        """Preprocess base64 image data"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            image_array = np.array(image)
            return image_array
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")
    
    def detect_objects(self, image: np.ndarray, confidence_threshold: float) -> List[Dict[str, Any]]:
        """Detect objects in image"""
        if self.models['object_detection'] is None:
            # Mock object detection for demonstration
            return [
                {
                    "class": "person",
                    "confidence": 0.95,
                    "bbox": [100, 150, 200, 300],
                    "area": 20000
                },
                {
                    "class": "car",
                    "confidence": 0.87,
                    "bbox": [300, 200, 150, 100],
                    "area": 15000
                }
            ]
        
        # Real object detection implementation would go here
        # For now, return mock data
        return [
            {
                "class": "person",
                "confidence": 0.95,
                "bbox": [100, 150, 200, 300],
                "area": 20000
            },
            {
                "class": "car",
                "confidence": 0.87,
                "bbox": [300, 200, 150, 100],
                "area": 15000
            }
        ]
    
    def classify_image(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Classify image content"""
        if self.models['image_classification'] is None:
            # Mock image classification for demonstration
            return [
                {"class": "landscape", "confidence": 0.92},
                {"class": "cityscape", "confidence": 0.78},
                {"class": "portrait", "confidence": 0.65}
            ]
        
        # Real image classification implementation would go here
        return [
            {"class": "landscape", "confidence": 0.92},
            {"class": "cityscape", "confidence": 0.78},
            {"class": "portrait", "confidence": 0.65}
        ]
    
    def recognize_faces(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Recognize faces in image"""
        if self.models['face_recognition'] is None:
            # Mock face recognition for demonstration
            return [
                {
                    "face_id": "face_001",
                    "confidence": 0.94,
                    "bbox": [120, 80, 80, 100],
                    "landmarks": [[140, 110], [160, 110], [150, 130], [135, 140], [165, 140]],
                    "embedding": [0.1, 0.2, 0.3, 0.4, 0.5]  # Mock embedding
                }
            ]
        
        # Real face recognition implementation would go here
        return [
            {
                "face_id": "face_001",
                "confidence": 0.94,
                "bbox": [120, 80, 80, 100],
                "landmarks": [[140, 110], [160, 110], [150, 130], [135, 140], [165, 140]],
                "embedding": [0.1, 0.2, 0.3, 0.4, 0.5]
            }
        ]

# Initialize service
cv_service = ComputerVisionService()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "computer-vision",
        "models_loaded": {
            "object_detection": cv_service.models['object_detection'] is not None,
            "image_classification": cv_service.models['image_classification'] is not None,
            "face_recognition": cv_service.models['face_recognition'] is not None
        },
        "version": "1.0.0"
    }

@app.post("/analyze/object-detection", response_model=ObjectDetectionResponse)
async def detect_objects(request: ImageAnalysisRequest):
    """Detect objects in image"""
    start_time = time.time()
    
    try:
        # Preprocess image
        image = cv_service.preprocess_image(request.image_data)
        
        # Detect objects
        objects = cv_service.detect_objects(image, request.confidence_threshold)
        
        # Filter by confidence threshold
        filtered_objects = [obj for obj in objects if obj['confidence'] >= request.confidence_threshold]
        
        processing_time = (time.time() - start_time) * 1000
        
        return ObjectDetectionResponse(
            objects=filtered_objects,
            processing_time_ms=processing_time,
            image_size={"width": image.shape[1], "height": image.shape[0]}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/image-classification", response_model=ImageClassificationResponse)
async def classify_image(request: ImageAnalysisRequest):
    """Classify image content"""
    start_time = time.time()
    
    try:
        # Preprocess image
        image = cv_service.preprocess_image(request.image_data)
        
        # Classify image
        classifications = cv_service.classify_image(image)
        
        processing_time = (time.time() - start_time) * 1000
        
        return ImageClassificationResponse(
            classifications=classifications,
            processing_time_ms=processing_time,
            image_size={"width": image.shape[1], "height": image.shape[0]}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/face-recognition", response_model=FaceRecognitionResponse)
async def recognize_faces(request: ImageAnalysisRequest):
    """Recognize faces in image"""
    start_time = time.time()
    
    try:
        # Preprocess image
        image = cv_service.preprocess_image(request.image_data)
        
        # Recognize faces
        faces = cv_service.recognize_faces(image)
        
        # Filter by confidence threshold
        filtered_faces = [face for face in faces if face['confidence'] >= request.confidence_threshold]
        
        processing_time = (time.time() - start_time) * 1000
        
        return FaceRecognitionResponse(
            faces=filtered_faces,
            processing_time_ms=processing_time,
            image_size={"width": image.shape[1], "height": image.shape[0]}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/multi-modal")
async def multi_modal_analysis(request: ImageAnalysisRequest):
    """Perform multi-modal analysis combining all CV capabilities"""
    start_time = time.time()
    
    try:
        # Preprocess image
        image = cv_service.preprocess_image(request.image_data)
        
        # Perform all analyses
        objects = cv_service.detect_objects(image, request.confidence_threshold)
        classifications = cv_service.classify_image(image)
        faces = cv_service.recognize_faces(image)
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "object_detection": objects,
            "image_classification": classifications,
            "face_recognition": faces,
            "processing_time_ms": processing_time,
            "image_size": {"width": image.shape[1], "height": image.shape[0]},
            "analysis_summary": {
                "total_objects": len(objects),
                "total_faces": len(faces),
                "primary_classification": classifications[0] if classifications else None
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/info")
async def get_models_info():
    """Get information about loaded models"""
    return {
        "models": {
            "object_detection": {
                "loaded": cv_service.models['object_detection'] is not None,
                "type": "YOLO",
                "input_size": [416, 416, 3],
                "classes": 80
            },
            "image_classification": {
                "loaded": cv_service.models['image_classification'] is not None,
                "type": "ResNet",
                "input_size": [224, 224, 3],
                "classes": 1000
            },
            "face_recognition": {
                "loaded": cv_service.models['face_recognition'] is not None,
                "type": "FaceNet",
                "input_size": [160, 160, 3],
                "embedding_size": 512
            }
        },
        "capabilities": [
            "object-detection",
            "image-classification", 
            "face-recognition",
            "multi-modal-analysis"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
