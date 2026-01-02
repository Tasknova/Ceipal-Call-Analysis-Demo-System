# Vector Store Setup for Company Brain

## Overview
The company brain data and documents are now stored in Supabase Vector Store using OpenAI embeddings for semantic search and AI retrieval.

## Database Structure

### Tables Created:
- `company_brain_embeddings` - Stores vector embeddings with content

### Columns:
- `id` - UUID primary key
- `user_id` - User reference
- `content_type` - Type: 'company_info', 'document', 'additional_context'
- `content_id` - Reference to original document or brain data
- `content` - The actual text content
- `metadata` - JSONB for additional info (tags, category, etc.)
- `embedding` - Vector(1536) for OpenAI ada-002 embeddings
- `created_at` / `updated_at` - Timestamps

## Setup Instructions

### 1. Enable Vector Extension
Already done via SQL migration. The `vector` extension is enabled.

### 2. Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to your `.env` file:
```env
VITE_OPENAI_API_KEY=sk-...your-key-here
```

### 3. Using the Embeddings API

```typescript
import { supabase } from '@/lib/supabase';
import { 
  storeEmbedding, 
  searchSimilarContent,
  prepareCompanyInfoForEmbedding,
  chunkText
} from '@/lib/embeddings';

// Store company info as embeddings
const companyData = await supabase.from('company_brain').select('*').single();
const content = prepareCompanyInfoForEmbedding(companyData.data);

await storeEmbedding(supabase, {
  user_id: userId,
  content_type: 'company_info',
  content_id: companyData.data.id,
  content: content,
  metadata: { source: 'company_brain_form' }
});

// Store document with embeddings
await storeEmbedding(supabase, {
  user_id: userId,
  content_type: 'document',
  content_id: documentId,
  content: documentText,
  metadata: { 
    file_name: 'example.pdf',
    category: 'training',
    tags: ['sales', 'onboarding']
  }
});

// Search for similar content
const results = await searchSimilarContent(
  supabase,
  userId,
  'Tell me about company products',
  0.78, // similarity threshold
  5     // max results
);

// Results contain: id, content, content_type, metadata, similarity
console.log(results);
```

## Features

### 1. Automatic Chunking
Large documents are automatically chunked into smaller pieces for better embedding quality:
```typescript
const chunks = chunkText(largeText, 1000); // 1000 chars per chunk
```

### 2. Semantic Search
Search across all company data using natural language:
```typescript
const results = await searchSimilarContent(
  supabase,
  userId,
  'What is the pricing model?'
);
```

### 3. Content Types
- `company_info` - Form data (name, description, values, etc.)
- `document` - Uploaded files (PDFs, docs, etc.)
- `additional_context` - Custom context from Additional Context tab

### 4. Metadata Filtering
Store additional metadata with embeddings:
```typescript
metadata: {
  category: 'product',
  tags: ['feature', 'pricing'],
  file_name: 'product_guide.pdf',
  group_id: 'uuid-of-group'
}
```

## Integration Points

### BrainPage.tsx
After saving company form or additional context:
```typescript
// Generate and store embeddings
const content = prepareCompanyInfoForEmbedding(formData);
await storeEmbedding(supabase, {
  user_id: user?.id,
  content_type: 'company_info',
  content: content
});
```

### Document Upload
After uploading a document:
```typescript
// Extract text from document (you'll need OCR for images/PDFs)
const documentText = extractedText;
const chunks = chunkText(documentText);

for (const chunk of chunks) {
  await storeEmbedding(supabase, {
    user_id: user?.id,
    content_type: 'document',
    content_id: documentId,
    content: chunk,
    metadata: {
      file_name: doc.file_name,
      category: doc.category,
      tags: doc.tags
    }
  });
}
```

## Cost Considerations

- OpenAI Ada-002: ~$0.0001 per 1K tokens
- 1000 words ≈ 750 tokens
- Estimate: $0.10 per 1M tokens

## Next Steps

1. **Add to BrainPage**: Automatically generate embeddings when saving company info
2. **Document Processing**: Extract text from PDFs/images and create embeddings
3. **Search Interface**: Add a search bar to query the vector store
4. **RAG Implementation**: Use embeddings to provide context to ChatGPT/AI agents
5. **Batch Processing**: Process all existing documents and company data

## Troubleshooting

### No API Key Error
Add `VITE_OPENAI_API_KEY` to your `.env` file.

### Slow Performance
- Use batch processing for multiple documents
- Consider using Supabase Edge Functions for server-side processing
- Implement caching for frequently searched queries

### Vector Search Not Working
Check that:
1. pgvector extension is enabled
2. Index is created on embeddings column
3. Similarity threshold is not too high (try 0.7 instead of 0.78)

## Example: Full Integration

```typescript
// In BrainPage.tsx - after handleSave
import { storeEmbedding, prepareCompanyInfoForEmbedding } from '@/lib/embeddings';

const handleSaveWithEmbeddings = async () => {
  // Save to database
  await handleSave();
  
  // Generate embeddings
  const content = prepareCompanyInfoForEmbedding(formData);
  const result = await storeEmbedding(supabase, {
    user_id: user?.id,
    content_type: 'company_info',
    content: content,
    metadata: { 
      last_updated: new Date().toISOString(),
      source: 'form'
    }
  });
  
  if (result.success) {
    toast({
      title: "Success",
      description: "Company info saved and indexed for AI search"
    });
  }
};
```
