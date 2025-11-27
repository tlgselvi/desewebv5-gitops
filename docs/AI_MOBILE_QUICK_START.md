# AI & Mobile Quick Start Guide

## Backend Setup

### 1. Environment Variables

Add to `.env`:

```bash
# Vector DB (choose one)
VECTOR_DB_PROVIDER=pinecone  # or weaviate, qdrant, chroma
VECTOR_DB_API_KEY=your-api-key
VECTOR_DB_INDEX_NAME=dese-index

# Embedding
EMBEDDING_MODEL=openai
EMBEDDING_MODEL_NAME=text-embedding-3-small
OPENAI_API_KEY=your-openai-key

# RAG
RAG_LLM_PROVIDER=openai
RAG_LLM_MODEL=gpt-4-turbo-preview
```

### 2. Database Migration

```bash
pnpm db:migrate
```

### 3. Start Backend

```bash
pnpm dev
```

## Mobile App Setup

### 1. Install Dependencies

```bash
cd mobile
pnpm install

# iOS (macOS only)
cd ios && pod install && cd ..
```

### 2. Configure API URL

Create `mobile/.env`:

```env
API_BASE_URL=http://localhost:3000/api/v1
```

### 3. Run Mobile App

```bash
# iOS
pnpm ios

# Android
pnpm android
```

## Usage Examples

### Index Content

```typescript
import { getContentIndexerService } from '@/services/ai/content-indexer.service.js';

const indexer = getContentIndexerService();
await indexer.indexFinanceContent(organizationId);
```

### RAG Query

```typescript
import { getRAGService } from '@/services/ai/rag.service.js';

const rag = getRAGService();
const response = await rag.query({
  query: "Son 3 ayın fatura toplamı nedir?",
  organizationId: "org-123",
});
```

### Chat

```typescript
import { getChatService } from '@/services/ai/chat.service.js';

const chat = getChatService();
const response = await chat.sendMessage({
  message: "Merhaba",
  organizationId: "org-123",
  userId: "user-456",
});
```

## API Endpoints

All endpoints require authentication (`Authorization: Bearer <token>`).

### RAG Query
```bash
POST /api/v1/ai/rag/query
{
  "query": "Your question",
  "topK": 5,
  "temperature": 0.7
}
```

### Chat
```bash
POST /api/v1/ai/chat/message
{
  "message": "Hello",
  "sessionId": "optional-uuid"
}
```

### Search
```bash
POST /api/v1/ai/search/semantic
{
  "query": "Search query",
  "topK": 10,
  "useRAG": true
}
```

## Troubleshooting

### Vector DB Not Configured
- Set `VECTOR_DB_PROVIDER` in `.env`
- Ensure API key is valid
- Check health: `GET /api/v1/ai/vector/health`

### OpenAI API Errors
- Verify `OPENAI_API_KEY` is set
- Check API quota/limits
- Review error logs

### Mobile App Connection Issues
- Verify `API_BASE_URL` in mobile `.env`
- Check backend is running
- Ensure CORS is configured

