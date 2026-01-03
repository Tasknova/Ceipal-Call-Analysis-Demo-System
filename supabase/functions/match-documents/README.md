# match-documents Edge Function

A Supabase Edge Function that provides semantic vector search across embedding tables using pgvector.

## Purpose

This function replaces the missing SQL RPC `public.match_documents` typically used by n8n's LangChain Supabase Vector Store node. It enables semantic search across your AI knowledge base embeddings.

## Endpoint

```
POST https://<your-project-ref>.functions.supabase.co/match-documents
```

## Request Format

```json
{
  "table": "project_embeddings" | "company_brain_embeddings",
  "query_embedding": [0.123, 0.456, ...],  // Array of 768 numbers
  "match_count": 5,
  "filter": {                              // Optional
    "project_id": "uuid-here",
    "content_type": "document_chunk"
  }
}
```

### Parameters

- **table** (required): Which embedding table to search
  - `"project_embeddings"` - Project-specific knowledge base
  - `"company_brain_embeddings"` - Company-wide knowledge base
  
- **query_embedding** (required): Vector array representing your search query
  - Must be array of 768 floating-point numbers
  - Generated using Google's `text-embedding-004` model
  
- **match_count** (required): Number of results to return
  - Must be positive integer
  - Typical values: 3-10
  
- **filter** (optional): Additional filtering criteria
  - Key-value pairs to match against table columns
  - Example: `{ "project_id": "abc-123", "content_type": "metadata" }`

## Response Format

```json
{
  "matches": [
    {
      "id": "uuid",
      "project_id": "uuid",           // null for company_brain_embeddings
      "company_id": "uuid",
      "content_type": "document_chunk",
      "content_id": "uuid",           // null for company_brain_embeddings
      "content": "This is the matched text content...",
      "metadata": {
        "source": "project_description",
        "timestamp": "2026-01-03T10:00:00Z"
      },
      "similarity": 0.95              // 0-1, higher = more similar
    }
  ]
}
```

### Response Fields

- **id**: Unique identifier of the embedding record
- **project_id**: Associated project (project_embeddings only)
- **company_id**: Company this belongs to
- **content_type**: Type of content (e.g., "metadata", "document_chunk")
- **content_id**: Source document/metadata ID (project_embeddings only)
- **content**: The actual text content
- **metadata**: Additional context stored with the embedding
- **similarity**: Cosine similarity score (1 = identical, 0 = unrelated)

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required field: table"
}
```

### 500 Internal Server Error
```json
{
  "error": "Database function 'match_documents' not found. Please run the setup migration first.",
  "details": "function public.match_documents does not exist",
  "hint": "See VECTOR_STORE_GUIDE.md for setup instructions"
}
```

## Setup Requirements

### 1. Database Function

The SQL function `public.match_documents` must exist in your database. It was created by the migration:

```sql
-- Migration: create_match_documents_function
-- Already applied to your database
```

Verify it exists:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'match_documents';
```

### 2. pgvector Extension

Ensure pgvector is enabled:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Embedding Tables

Your tables must have a `vector(768)` column named `embedding`:

```sql
-- project_embeddings
ALTER TABLE project_embeddings 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- company_brain_embeddings
ALTER TABLE company_brain_embeddings 
ADD COLUMN IF NOT EXISTS embedding vector(768);
```

### 4. Vector Index (Optional but Recommended)

For better performance on large datasets:

```sql
-- IVFFlat index for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS project_embeddings_embedding_idx 
ON project_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS company_brain_embeddings_embedding_idx 
ON company_brain_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Deployment

Deploy this function using the Supabase CLI:

```bash
supabase functions deploy match-documents
```

## Usage Examples

### Example 1: Search Project Embeddings

```bash
curl -X POST https://your-project.functions.supabase.co/match-documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "table": "project_embeddings",
    "query_embedding": [0.123, 0.456, ...],
    "match_count": 5,
    "filter": {
      "project_id": "bc6bf3b0-2baa-403e-9df8-d74519360693"
    }
  }'
```

### Example 2: Search Company Brain (No Filter)

```bash
curl -X POST https://your-project.functions.supabase.co/match-documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "table": "company_brain_embeddings",
    "query_embedding": [0.123, 0.456, ...],
    "match_count": 10
  }'
```

### Example 3: JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Generate embedding for your query (using Google's API or your model)
const queryEmbedding = await generateEmbedding("What is our AI customer support solution?");

// Call the edge function
const { data, error } = await supabase.functions.invoke('match-documents', {
  body: {
    table: 'project_embeddings',
    query_embedding: queryEmbedding,
    match_count: 5,
    filter: {
      project_id: 'your-project-id-here'
    }
  }
});

if (error) {
  console.error('Search failed:', error);
} else {
  console.log('Found matches:', data.matches);
}
```

### Example 4: n8n LangChain Integration

In your n8n workflow, use the **HTTP Request** node:

1. **Method**: POST
2. **URL**: `https://your-project.functions.supabase.co/match-documents`
3. **Authentication**: None (or Bearer Token with your key)
4. **Body**:
```json
{
  "table": "{{ $json.table }}",
  "query_embedding": {{ $json.embedding }},
  "match_count": 5,
  "filter": {
    "project_id": "{{ $json.project_id }}"
  }
}
```

## Testing

### Test with curl

```bash
# Get an embedding first (simplified example)
EMBEDDING="[0.1, 0.2, 0.3, ...]"  # Use actual 768-dim vector

# Search
curl -X POST http://localhost:54321/functions/v1/match-documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY" \
  -d "{
    \"table\": \"project_embeddings\",
    \"query_embedding\": $EMBEDDING,
    \"match_count\": 3
  }"
```

## Performance Considerations

- **Vector Index**: Create IVFFlat or HNSW indexes for faster searches on large datasets
- **Match Count**: Keep under 20 for optimal response times
- **Filters**: Add database indexes on commonly filtered columns (e.g., `project_id`)
- **Embedding Size**: This function expects 768-dimensional vectors (Google text-embedding-004)

## Troubleshooting

### "function public.match_documents does not exist"

**Solution**: Run the migration:
```bash
supabase migration up
```

### "Invalid table name"

**Solution**: Ensure you're using `"project_embeddings"` or `"company_brain_embeddings"` exactly.

### "Missing or invalid query_embedding array"

**Solution**: 
- Verify embedding is an array of numbers
- Check it has 768 dimensions
- Ensure no NaN or Infinity values

### Empty results with high similarity threshold

**Solution**: Lower your similarity threshold or check if embeddings exist in the filtered scope.

## Related Documentation

- [VECTOR_STORE_GUIDE.md](../../../VECTOR_STORE_GUIDE.md) - Complete vector store setup
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

## License

Part of the Ceipal Call Analysis Demo System.
