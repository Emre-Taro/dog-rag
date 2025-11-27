# RAG Pipeline Documentation

This RAG (Retrieval-Augmented Generation) system provides AI-powered advice for dog care by combining:
1. **Internal dog state** - Weekly summaries and log entries from the database
2. **External advice documents** - General dog care advice from `.tsx` files

## Architecture

### Components

1. **Embedding Module** (`embedding.ts`)
   - Abstraction for multiple embedding providers (OpenAI, BGE-M3)
   - Default: OpenAI `text-embedding-3-small` (1536 dimensions)

2. **Internal Indexing** (`internalIndex.ts`)
   - Indexes `DogWeekSummary` and `DogWeekText` from database
   - Creates documents and chunks with `corpus: 'dog_internal'`

3. **External Indexing** (`externalIndex.ts`)
   - Indexes `.txt`, `.md`, `.mdx` files from `src/data/documents/`
   - Creates documents and chunks with `corpus: 'dog_external'`

4. **Search Module** (`search.ts`)
   - Searches both corpora separately using vector similarity
   - Returns top-K results from each corpus

5. **API Endpoint** (`/api/rag/advice`)
   - Accepts queries with `dogId`, `question`, `lookbackDays`
   - Searches both corpora separately
   - Generates answer using LLM (OpenAI)

## Usage

### 1. Index Internal Corpus

Index weekly summaries and texts for a specific dog:

```bash
# Index specific dog (past 30 days)
npm run index-rag:internal 6

# Index specific dog (past 60 days)
npm run index-rag:internal 6 60

# Index all dogs (past 30 days)
npm run index-rag:internal
```

### 2. Index External Corpus

Index advice documents:

```bash
npm run index-rag:external
```

Place `.txt`, `.md`, or `.mdx` files in `src/data/documents/` before running.

### 3. Index Both

```bash
npm run index-rag
```

### 4. Query RAG System

```typescript
POST /api/rag/advice
Content-Type: application/json
Authorization: Bearer <token>

{
  "dogId": 6,
  "lookbackDays": 30,
  "question": "How is the recent meal situation?",
  "topKInternal": 5,
  "topKExternal": 5
}
```

Response:

```json
{
  "success": true,
  "answer": "AI-generated answer...",
  "contexts": {
    "internal": {
      "count": 5,
      "results": [...]
    },
    "external": {
      "count": 5,
      "results": [...]
    }
  }
}
```

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string (with pgvector)
- `OPENAI_API_KEY` - For embeddings and LLM

Optional:
- `EMBEDDING_PROVIDER` - `openai` (default) or `bge-m3`
- `LLM_MODEL` - OpenAI model name (default: `gpt-4o-mini`)
- `OPENAI_API_URL` - Custom OpenAI API URL (default: `https://api.openai.com/v1/chat/completions`)

## Database Schema

The system uses existing tables:
- `documents` - Stores document metadata
- `chunks` - Stores text chunks with vector embeddings

Each chunk has metadata JSON with:
- `corpus`: `'dog_internal'` or `'dog_external'`
- `sourceType`: Document type identifier
- Additional fields specific to corpus type

## Key Features

1. **Separate Corpora**: Internal and external data are searched separately, not merged
2. **Top-K from Each**: Returns top-K results from each corpus independently
3. **Metadata Filtering**: Internal corpus filtered by `dogId`
4. **Vector Search**: Uses pgvector for fast similarity search
5. **LLM Integration**: Combines both contexts in LLM prompt

## Notes

- Embeddings are stored as `vector` type in PostgreSQL (pgvector extension required)
- Chunk size: ~800 characters with 100 character overlap
- Vector dimension: 1536 (OpenAI) or 1024 (BGE-M3)
- Documents are re-indexed (existing chunks deleted) on each indexing run

