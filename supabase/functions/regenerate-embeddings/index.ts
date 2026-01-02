import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface CompanyBrain {
  id: string;
  user_id: string;
  company_name: string | null;
  industry: string | null;
  company_size: string | null;
  target_market: string | null;
  key_products: string | null;
  unique_value_prop: string | null;
  additional_context: string | null;
}

interface BrainDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  description: string | null;
  tags: string[] | null;
  category: string | null;
  storage_url: string;
}

// Generate embedding using Google Gemini
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: {
        parts: [{
          text: text
        }]
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

// Chunk text into smaller pieces
function chunkText(text: string, maxLength: number = 1000): string[] {
  if (text.length <= maxLength) return [text];
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  const sentences = text.split(/[.!?]+\s+/);
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence + '. ';
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence + '. ';
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  
  return chunks;
}

// Prepare company info for embedding
function prepareCompanyInfoForEmbedding(brain: CompanyBrain): string {
  return [
    brain.company_name ? `Company: ${brain.company_name}` : '',
    brain.industry ? `Industry: ${brain.industry}` : '',
    brain.company_size ? `Size: ${brain.company_size}` : '',
    brain.target_market ? `Target Market: ${brain.target_market}` : '',
    brain.key_products ? `Products: ${brain.key_products}` : '',
    brain.unique_value_prop ? `Value Proposition: ${brain.unique_value_prop}` : '',
  ].filter(Boolean).join('\n');
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Verify this is a cron job request (optional security check)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting embedding regeneration...');

    // 1. Regenerate Company Brain embeddings
    const { data: companyBrains, error: brainError } = await supabase
      .from('company_brain')
      .select('*');

    if (brainError) throw brainError;

    for (const brain of companyBrains || []) {
      // Delete old embeddings
      await supabase
        .from('company_brain_embeddings')
        .delete()
        .eq('user_id', brain.user_id)
        .eq('content_type', 'company_info');

      // Generate and store new embedding
      const content = prepareCompanyInfoForEmbedding(brain);
      const embedding = await generateEmbedding(content, geminiApiKey);

      await supabase
        .from('company_brain_embeddings')
        .insert({
          user_id: brain.user_id,
          content_type: 'company_info',
          content_id: brain.id,
          content,
          embedding,
          metadata: {
            company_name: brain.company_name,
            industry: brain.industry,
            company_size: brain.company_size,
          }
        });

      console.log(`Regenerated embedding for company: ${brain.company_name}`);

      // 2. Regenerate Additional Context embeddings if exists
      if (brain.additional_context) {
        await supabase
          .from('company_brain_embeddings')
          .delete()
          .eq('user_id', brain.user_id)
          .eq('content_type', 'additional_context');

        const chunks = chunkText(brain.additional_context);
        
        for (let i = 0; i < chunks.length; i++) {
          const chunkEmbedding = await generateEmbedding(chunks[i], geminiApiKey);
          
          await supabase
            .from('company_brain_embeddings')
            .insert({
              user_id: brain.user_id,
              content_type: 'additional_context',
              content_id: brain.id,
              content: chunks[i],
              embedding: chunkEmbedding,
              metadata: {
                chunk_index: i,
                total_chunks: chunks.length,
              }
            });
        }

        console.log(`Regenerated ${chunks.length} additional context chunks`);
      }
    }

    // 3. Regenerate Document embeddings
    const { data: documents, error: docError } = await supabase
      .from('brain_documents')
      .select('*');

    if (docError) throw docError;

    for (const doc of documents || []) {
      // Delete old document embeddings
      await supabase
        .from('company_brain_embeddings')
        .delete()
        .eq('user_id', doc.user_id)
        .eq('content_type', 'document')
        .eq('content_id', doc.id);

      // Generate new embedding from metadata
      const embeddingContent = [
        `File: ${doc.file_name}`,
        doc.description ? `Description: ${doc.description}` : '',
        doc.category ? `Category: ${doc.category}` : '',
        doc.tags?.length ? `Tags: ${doc.tags.join(', ')}` : '',
        `Type: ${doc.file_type}`
      ].filter(Boolean).join('\n');

      const embedding = await generateEmbedding(embeddingContent, geminiApiKey);

      await supabase
        .from('company_brain_embeddings')
        .insert({
          user_id: doc.user_id,
          content_type: 'document',
          content_id: doc.id,
          content: embeddingContent,
          embedding,
          metadata: {
            file_name: doc.file_name,
            file_type: doc.file_type,
            category: doc.category,
            tags: doc.tags,
            storage_url: doc.storage_url
          }
        });

      console.log(`Regenerated embedding for document: ${doc.file_name}`);
    }

    const totalProcessed = (companyBrains?.length || 0) + (documents?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Embeddings regenerated successfully',
        stats: {
          company_brains_processed: companyBrains?.length || 0,
          documents_processed: documents?.length || 0,
          total_processed: totalProcessed
        }
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error regenerating embeddings:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});
