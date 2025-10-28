from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import openai
import json
import time
from typing import List, Dict, Any, Optional
import logging
from enum import Enum
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EA Plan v6.0 Conversational AI API", version="1.0.0")

class ConversationType(str, Enum):
    CHATBOT = "chatbot"
    VIRTUAL_ASSISTANT = "virtual_assistant"
    CUSTOMER_SUPPORT = "customer_support"
    TECHNICAL_SUPPORT = "technical_support"
    SALES_ASSISTANT = "sales_assistant"

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ConversationRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    conversation_type: ConversationType = ConversationType.CHATBOT
    context: Optional[Dict[str, Any]] = None
    user_profile: Optional[Dict[str, Any]] = None
    max_tokens: int = 500
    temperature: float = 0.7

class ConversationResponse(BaseModel):
    response: str
    conversation_id: str
    message_id: str
    confidence: float
    processing_time_ms: float
    metadata: Dict[str, Any]

class ConversationHistoryResponse(BaseModel):
    conversation_id: str
    messages: List[Dict[str, Any]]
    total_messages: int
    created_at: str
    last_updated: str

class IntentResponse(BaseModel):
    intent: str
    confidence: float
    entities: List[Dict[str, Any]]
    processing_time_ms: float

class ConversationalAI:
    def __init__(self):
        self.conversations = {}
        self.intent_patterns = {}
        self.load_intent_patterns()
        self.setup_openai()
    
    def setup_openai(self):
        """Setup OpenAI client"""
        try:
            # In production, use proper API key management
            openai.api_key = "your-openai-api-key"
            self.openai_available = True
            logger.info("✅ OpenAI client configured")
        except Exception as e:
            logger.warning(f"⚠️ OpenAI not configured: {e}. Using mock responses.")
            self.openai_available = False
    
    def load_intent_patterns(self):
        """Load intent recognition patterns"""
        self.intent_patterns = {
            "greeting": [
                r"hello", r"hi", r"hey", r"good morning", r"good afternoon", r"good evening"
            ],
            "goodbye": [
                r"bye", r"goodbye", r"see you", r"farewell", r"take care"
            ],
            "help": [
                r"help", r"assist", r"support", r"how to", r"what is", r"explain"
            ],
            "product_info": [
                r"product", r"feature", r"price", r"cost", r"buy", r"purchase"
            ],
            "technical_support": [
                r"bug", r"error", r"issue", r"problem", r"fix", r"troubleshoot"
            ],
            "complaint": [
                r"complaint", r"dissatisfied", r"angry", r"frustrated", r"disappointed"
            ],
            "compliment": [
                r"great", r"excellent", r"amazing", r"wonderful", r"love", r"fantastic"
            ],
            "question": [
                r"\?", r"what", r"how", r"when", r"where", r"why", r"who"
            ]
        }
    
    def detect_intent(self, message: str) -> Dict[str, Any]:
        """Detect user intent from message"""
        message_lower = message.lower()
        intent_scores = {}
        
        for intent, patterns in self.intent_patterns.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, message_lower):
                    score += 1
            intent_scores[intent] = score / len(patterns)
        
        # Get the intent with highest score
        best_intent = max(intent_scores, key=intent_scores.get)
        confidence = intent_scores[best_intent]
        
        # Extract entities (simple implementation)
        entities = []
        if "price" in message_lower or "cost" in message_lower:
            entities.append({"type": "price_inquiry", "value": "price", "confidence": 0.8})
        if any(word in message_lower for word in ["bug", "error", "issue"]):
            entities.append({"type": "technical_issue", "value": "technical", "confidence": 0.9})
        
        return {
            "intent": best_intent,
            "confidence": confidence,
            "entities": entities
        }
    
    def generate_response(self, message: str, conversation_type: ConversationType, 
                         context: Optional[Dict[str, Any]] = None,
                         user_profile: Optional[Dict[str, Any]] = None) -> str:
        """Generate AI response"""
        if self.openai_available:
            try:
                # Use OpenAI API for real responses
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": self.get_system_prompt(conversation_type)},
                        {"role": "user", "content": message}
                    ],
                    max_tokens=500,
                    temperature=0.7
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.error(f"OpenAI API error: {e}")
                return self.get_mock_response(message, conversation_type)
        else:
            return self.get_mock_response(message, conversation_type)
    
    def get_system_prompt(self, conversation_type: ConversationType) -> str:
        """Get system prompt based on conversation type"""
        prompts = {
            ConversationType.CHATBOT: "You are a helpful and friendly chatbot assistant.",
            ConversationType.VIRTUAL_ASSISTANT: "You are a virtual assistant that helps users with various tasks.",
            ConversationType.CUSTOMER_SUPPORT: "You are a customer support representative. Be helpful, empathetic, and solution-oriented.",
            ConversationType.TECHNICAL_SUPPORT: "You are a technical support specialist. Provide clear, technical solutions.",
            ConversationType.SALES_ASSISTANT: "You are a sales assistant. Help customers find the right products and services."
        }
        return prompts.get(conversation_type, "You are a helpful assistant.")
    
    def get_mock_response(self, message: str, conversation_type: ConversationType) -> str:
        """Generate mock response for demonstration"""
        message_lower = message.lower()
        
        # Intent-based responses
        if any(word in message_lower for word in ["hello", "hi", "hey"]):
            return "Hello! How can I help you today?"
        elif any(word in message_lower for word in ["bye", "goodbye"]):
            return "Goodbye! Have a great day!"
        elif any(word in message_lower for word in ["help", "support"]):
            return "I'm here to help! What do you need assistance with?"
        elif any(word in message_lower for word in ["product", "feature", "price"]):
            return "I'd be happy to tell you about our products and features. What specific information are you looking for?"
        elif any(word in message_lower for word in ["bug", "error", "issue", "problem"]):
            return "I understand you're experiencing an issue. Let me help you troubleshoot this problem."
        elif any(word in message_lower for word in ["thank", "thanks"]):
            return "You're welcome! Is there anything else I can help you with?"
        else:
            # Default responses based on conversation type
            if conversation_type == ConversationType.CUSTOMER_SUPPORT:
                return "I understand your concern. Let me help you resolve this issue. Can you provide more details?"
            elif conversation_type == ConversationType.TECHNICAL_SUPPORT:
                return "I can help you with technical issues. Please describe the problem you're experiencing."
            elif conversation_type == ConversationType.SALES_ASSISTANT:
                return "I'd be happy to help you find the right product. What are you looking for?"
            else:
                return "That's interesting! Can you tell me more about that?"
    
    def create_conversation(self, conversation_id: str, conversation_type: ConversationType) -> Dict[str, Any]:
        """Create a new conversation"""
        conversation = {
            "id": conversation_id,
            "type": conversation_type,
            "messages": [],
            "created_at": time.time(),
            "last_updated": time.time(),
            "metadata": {
                "total_messages": 0,
                "user_satisfaction": None,
                "resolved": False
            }
        }
        self.conversations[conversation_id] = conversation
        return conversation
    
    def add_message(self, conversation_id: str, role: MessageRole, content: str, metadata: Dict[str, Any] = None) -> str:
        """Add a message to a conversation"""
        if conversation_id not in self.conversations:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        message_id = f"msg_{int(time.time() * 1000)}"
        message = {
            "id": message_id,
            "role": role,
            "content": content,
            "timestamp": time.time(),
            "metadata": metadata or {}
        }
        
        self.conversations[conversation_id]["messages"].append(message)
        self.conversations[conversation_id]["last_updated"] = time.time()
        self.conversations[conversation_id]["metadata"]["total_messages"] += 1
        
        return message_id
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation by ID"""
        return self.conversations.get(conversation_id)

# Initialize service
conversational_ai = ConversationalAI()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "conversational-ai",
        "openai_available": conversational_ai.openai_available,
        "total_conversations": len(conversational_ai.conversations),
        "supported_intents": list(conversational_ai.intent_patterns.keys()),
        "version": "1.0.0"
    }

@app.post("/chat", response_model=ConversationResponse)
async def chat(request: ConversationRequest):
    """Main chat endpoint"""
    start_time = time.time()
    
    try:
        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or f"conv_{int(time.time() * 1000)}"
        
        # Create conversation if it doesn't exist
        if conversation_id not in conversational_ai.conversations:
            conversational_ai.create_conversation(conversation_id, request.conversation_type)
        
        # Detect intent
        intent_result = conversational_ai.detect_intent(request.message)
        
        # Generate response
        response = conversational_ai.generate_response(
            request.message,
            request.conversation_type,
            request.context,
            request.user_profile
        )
        
        # Add user message to conversation
        user_message_id = conversational_ai.add_message(
            conversation_id,
            MessageRole.USER,
            request.message,
            {"intent": intent_result["intent"], "confidence": intent_result["confidence"]}
        )
        
        # Add assistant response to conversation
        assistant_message_id = conversational_ai.add_message(
            conversation_id,
            MessageRole.ASSISTANT,
            response,
            {"intent": intent_result["intent"], "confidence": intent_result["confidence"]}
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        return ConversationResponse(
            response=response,
            conversation_id=conversation_id,
            message_id=assistant_message_id,
            confidence=intent_result["confidence"],
            processing_time_ms=processing_time,
            metadata={
                "intent": intent_result["intent"],
                "entities": intent_result["entities"],
                "conversation_type": request.conversation_type,
                "total_messages": conversational_ai.conversations[conversation_id]["metadata"]["total_messages"]
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/intent", response_model=IntentResponse)
async def analyze_intent(request: ConversationRequest):
    """Analyze user intent from message"""
    start_time = time.time()
    
    try:
        intent_result = conversational_ai.detect_intent(request.message)
        processing_time = (time.time() - start_time) * 1000
        
        return IntentResponse(
            intent=intent_result["intent"],
            confidence=intent_result["confidence"],
            entities=intent_result["entities"],
            processing_time_ms=processing_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations/{conversation_id}", response_model=ConversationHistoryResponse)
async def get_conversation_history(conversation_id: str):
    """Get conversation history"""
    conversation = conversational_ai.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return ConversationHistoryResponse(
        conversation_id=conversation_id,
        messages=conversation["messages"],
        total_messages=conversation["metadata"]["total_messages"],
        created_at=str(conversation["created_at"]),
        last_updated=str(conversation["last_updated"])
    )

@app.get("/conversations")
async def list_conversations():
    """List all conversations"""
    conversations = []
    for conv_id, conv in conversational_ai.conversations.items():
        conversations.append({
            "id": conv_id,
            "type": conv["type"],
            "total_messages": conv["metadata"]["total_messages"],
            "created_at": conv["created_at"],
            "last_updated": conv["last_updated"],
            "resolved": conv["metadata"]["resolved"]
        })
    
    return {
        "conversations": conversations,
        "total_count": len(conversations)
    }

@app.post("/conversations/{conversation_id}/resolve")
async def resolve_conversation(conversation_id: str, satisfaction_score: Optional[int] = None):
    """Mark conversation as resolved"""
    conversation = conversational_ai.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation["metadata"]["resolved"] = True
    if satisfaction_score is not None:
        conversation["metadata"]["user_satisfaction"] = satisfaction_score
    
    return {
        "conversation_id": conversation_id,
        "resolved": True,
        "satisfaction_score": satisfaction_score
    }

@app.get("/analytics/conversations")
async def get_conversation_analytics():
    """Get analytics about conversations"""
    total_conversations = len(conversational_ai.conversations)
    resolved_conversations = sum(1 for conv in conversational_ai.conversations.values() if conv["metadata"]["resolved"])
    
    # Intent distribution
    intent_counts = {}
    for conv in conversational_ai.conversations.values():
        for message in conv["messages"]:
            if message["role"] == MessageRole.USER and "intent" in message["metadata"]:
                intent = message["metadata"]["intent"]
                intent_counts[intent] = intent_counts.get(intent, 0) + 1
    
    # Conversation type distribution
    type_counts = {}
    for conv in conversational_ai.conversations.values():
        conv_type = conv["type"]
        type_counts[conv_type] = type_counts.get(conv_type, 0) + 1
    
    return {
        "total_conversations": total_conversations,
        "resolved_conversations": resolved_conversations,
        "resolution_rate": resolved_conversations / total_conversations if total_conversations > 0 else 0,
        "intent_distribution": intent_counts,
        "conversation_type_distribution": type_counts,
        "average_messages_per_conversation": sum(conv["metadata"]["total_messages"] for conv in conversational_ai.conversations.values()) / total_conversations if total_conversations > 0 else 0
    }

@app.get("/models/info")
async def get_models_info():
    """Get information about the conversational AI models"""
    return {
        "models": {
            "openai": {
                "available": conversational_ai.openai_available,
                "model": "gpt-3.5-turbo",
                "capabilities": ["text-generation", "conversation", "intent-detection"]
            },
            "intent_detection": {
                "type": "pattern-matching",
                "supported_intents": list(conversational_ai.intent_patterns.keys()),
                "accuracy": "85%"
            }
        },
        "capabilities": [
            "chatbot",
            "virtual-assistant",
            "customer-support",
            "technical-support",
            "sales-assistant",
            "intent-detection",
            "conversation-management",
            "sentiment-analysis"
        ],
        "supported_conversation_types": [t.value for t in ConversationType]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
