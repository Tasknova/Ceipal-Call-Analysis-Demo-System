import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface Project {
  id: string;
  company_id: string;
  project_name: string;
  status: string;
}

interface ProjectMetadata {
  id: string;
  project_id: string;
  company_id: string;
  project_description: string | null;
  project_goals: string | null;
  target_audience: string | null;
  budget_range: string | null;
  timeline: string | null;
  tech_stack: string[] | null;
  key_features: string[] | null;
  key_goals: string[] | null;
  success_metrics: string | null;
  constraints: string | null;
  additional_notes: string | null;
}

interface ProjectDocument {
  id: string;
  project_id: string;
  company_id: string;
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

// Prepare project metadata for embedding
function prepareProjectMetadataForEmbedding(metadata: ProjectMetadata, projectName: string): string {
  return [
    `Project: ${projectName}`,
    metadata.project_description ? `Description: ${metadata.project_description}` : '',
    metadata.project_goals ? `Goals: ${metadata.project_goals}` : '',
    metadata.target_audience ? `Target Audience: ${metadata.target_audience}` : '',
    metadata.budget_range ? `Budget: ${metadata.budget_range}` : '',
    metadata.timeline ? `Timeline: ${metadata.timeline}` : '',
    metadata.tech_stack?.length ? `Tech Stack: ${metadata.tech_stack.join(', ')}` : '',
    metadata.key_features?.length ? `Key Features: ${metadata.key_features.join(', ')}` : '',
    metadata.key_goals?.length ? `Key Goals: ${metadata.key_goals.join(', ')}` : '',
    metadata.success_metrics ? `Success Metrics: ${metadata.success_metrics}` : '',
    metadata.constraints ? `Constraints: ${metadata.constraints}` : '',
    metadata.additional_notes ? `Additional Notes: ${metadata.additional_notes}` : '',
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

    console.log('Starting project embedding regeneration...');

    // Get all projects (no need to filter is_deleted since projects are hard-deleted)
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*');

    if (projectsError) throw projectsError;

    let metadataCount = 0;
    let documentsCount = 0;

    for (const project of projects || []) {
      console.log(`Processing project: ${project.project_name}`);

      // 1. Regenerate Project Metadata embeddings
      const { data: metadata, error: metadataError } = await supabase
        .from('project_metadata')
        .select('*')
        .eq('project_id', project.id)
        .single();

      if (!metadataError && metadata) {
        // Delete old metadata embeddings
        await supabase
          .from('project_embeddings')
          .delete()
          .eq('project_id', project.id)
          .eq('content_type', 'project_metadata');

        // Generate and store new embedding
        const content = prepareProjectMetadataForEmbedding(metadata, project.project_name);
        const embedding = await generateEmbedding(content, geminiApiKey);

        await supabase
          .from('project_embeddings')
          .insert({
            project_id: project.id,
            company_id: project.company_id,
            content_type: 'project_metadata',
            content_id: project.id,
            content,
            embedding,
            metadata: {
              source: 'project_metadata_form',
              project_name: project.project_name,
              status: project.status
            }
          });

        metadataCount++;
        console.log(`✓ Regenerated metadata embedding for: ${project.project_name}`);
      }

      // 2. Regenerate Project Document embeddings
      const { data: documents, error: docError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', project.id)
        .eq('is_deleted', false);

      if (!docError && documents) {
        for (const doc of documents) {
          // Delete old document embeddings
          await supabase
            .from('project_embeddings')
            .delete()
            .eq('project_id', project.id)
            .eq('content_type', 'document')
            .eq('content_id', doc.id);

          // Generate new embedding from metadata
          const embeddingContent = [
            `Project: ${project.project_name}`,
            `File: ${doc.file_name}`,
            doc.description ? `Description: ${doc.description}` : '',
            doc.category ? `Category: ${doc.category}` : '',
            doc.tags?.length ? `Tags: ${doc.tags.join(', ')}` : '',
            `Type: ${doc.file_type}`
          ].filter(Boolean).join('\n');

          const embedding = await generateEmbedding(embeddingContent, geminiApiKey);

          await supabase
            .from('project_embeddings')
            .insert({
              project_id: project.id,
              company_id: project.company_id,
              content_type: 'document',
              content_id: doc.id,
              content: embeddingContent,
              embedding,
              metadata: {
                file_name: doc.file_name,
                file_type: doc.file_type,
                category: doc.category,
                tags: doc.tags,
                storage_url: doc.storage_url,
                project_name: project.project_name
              }
            });

          documentsCount++;
          console.log(`  ✓ Regenerated document embedding: ${doc.file_name}`);
        }
      }
    }

    const totalProcessed = metadataCount + documentsCount;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Project embeddings regenerated successfully',
        stats: {
          projects_processed: projects?.length || 0,
          metadata_processed: metadataCount,
          documents_processed: documentsCount,
          total_embeddings: totalProcessed
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
    console.error('Error regenerating project embeddings:', error);
    
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
