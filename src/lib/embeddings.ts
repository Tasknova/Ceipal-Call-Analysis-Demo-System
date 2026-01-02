// Utility functions for vector embeddings with Google Gemini
// This will be used to generate embeddings for company data and documents

interface EmbeddingResponse {
  embedding: number[];
  error?: string;
}

export async function generateEmbedding(text: string): Promise<EmbeddingResponse> {
  try {
    // You'll need to add VITE_GEMINI_API_KEY to your .env file
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('Gemini API key not configured');
      return { embedding: [], error: 'Gemini API key not configured' };
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: {
          parts: [{
            text: text
          }]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return { embedding: data.embedding.values };
  } catch (error) {
    console.error('Error generating embedding:', error);
    return { embedding: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export interface CompanyBrainEmbedding {
  id?: string;
  user_id: string;
  content_type: 'company_info' | 'document' | 'additional_context';
  content_id?: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
  created_at?: string;
  updated_at?: string;
}

export async function storeEmbedding(
  supabase: any,
  data: CompanyBrainEmbedding
): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate embedding if not provided
    let embedding = data.embedding;
    if (!embedding) {
      const result = await generateEmbedding(data.content);
      if (result.error) {
        return { success: false, error: result.error };
      }
      embedding = result.embedding;
    }

    // Store in database
    const { error } = await supabase
      .from('company_brain_embeddings')
      .insert([{
        user_id: data.user_id,
        content_type: data.content_type,
        content_id: data.content_id,
        content: data.content,
        metadata: data.metadata,
        embedding: embedding
      }]);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error storing embedding:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function updateEmbedding(
  supabase: any,
  id: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await generateEmbedding(text);
    if (result.error) {
      return { success: false, error: result.error };
    }

    const { error } = await supabase
      .from('company_brain_embeddings')
      .update({
        content: text,
        embedding: result.embedding,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating embedding:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function searchSimilarContent(
  supabase: any,
  userId: string,
  query: string,
  threshold: number = 0.78,
  limit: number = 10
): Promise<any[]> {
  try {
    // Generate embedding for query
    const result = await generateEmbedding(query);
    if (result.error) {
      console.error('Error generating query embedding:', result.error);
      return [];
    }

    // Search using RPC function
    const { data, error } = await supabase
      .rpc('match_company_brain_documents', {
        query_embedding: result.embedding,
        match_user_id: userId,
        match_threshold: threshold,
        match_count: limit
      });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error searching similar content:', error);
    return [];
  }
}

// Helper function to chunk large text for better embeddings
export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += paragraph + '\n\n';
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Helper to prepare company form data for embeddings
export function prepareCompanyInfoForEmbedding(companyBrain: any): string {
  const parts = [];
  
  if (companyBrain.company_name) parts.push(`Company: ${companyBrain.company_name}`);
  if (companyBrain.company_tagline) parts.push(`Tagline: ${companyBrain.company_tagline}`);
  if (companyBrain.company_description) parts.push(`Description: ${companyBrain.company_description}`);
  if (companyBrain.industry) parts.push(`Industry: ${companyBrain.industry}`);
  if (companyBrain.mission_statement) parts.push(`Mission: ${companyBrain.mission_statement}`);
  if (companyBrain.vision_statement) parts.push(`Vision: ${companyBrain.vision_statement}`);
  if (companyBrain.core_values?.length) parts.push(`Values: ${companyBrain.core_values.join(', ')}`);
  if (companyBrain.unique_selling_points?.length) parts.push(`USPs: ${companyBrain.unique_selling_points.join(', ')}`);
  if (companyBrain.target_audience) parts.push(`Target Audience: ${companyBrain.target_audience}`);
  if (companyBrain.key_features?.length) parts.push(`Features: ${companyBrain.key_features.join(', ')}`);
  if (companyBrain.pricing_model) parts.push(`Pricing: ${companyBrain.pricing_model}`);
  
  return parts.join('\n');
}
