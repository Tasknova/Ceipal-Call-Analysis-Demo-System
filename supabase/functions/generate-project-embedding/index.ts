import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface RequestBody {
  type: 'metadata' | 'document';
  project_id: string;
  company_id: string;
  document_id?: string;
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

// Prepare project metadata for embedding
function prepareProjectMetadataForEmbedding(metadata: any, projectName: string): string {
  return [
    `Project: ${projectName}`,
    metadata.domain ? `Domain: ${metadata.domain}` : '',
    metadata.industry ? `Industry: ${metadata.industry}` : '',
    metadata.project_type ? `Type: ${metadata.project_type}` : '',
    metadata.target_audience ? `Target Audience: ${metadata.target_audience}` : '',
    metadata.budget_range ? `Budget: ${metadata.budget_range}` : '',
    metadata.tech_stack?.length ? `Tech Stack: ${metadata.tech_stack.join(', ')}` : '',
    metadata.key_goals?.length ? `Key Goals: ${metadata.key_goals.join(', ')}` : '',
    metadata.requirements ? `Requirements: ${metadata.requirements}` : '',
    metadata.team_size ? `Team Size: ${metadata.team_size}` : '',
    metadata.priority_level ? `Priority: ${metadata.priority_level}` : '',
    metadata.additional_context ? `Additional Context: ${metadata.additional_context}` : '',
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: RequestBody = await req.json();

    const { type, project_id, company_id, document_id } = body;

    // Get project info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('project_name, status')
      .eq('id', project_id)
      .single();

    if (projectError) throw projectError;

    if (type === 'metadata') {
      // Generate embedding for project metadata
      const { data: metadata, error: metadataError } = await supabase
        .from('project_metadata')
        .select('*')
        .eq('project_id', project_id)
        .single();

      if (metadataError) throw metadataError;

      const content = prepareProjectMetadataForEmbedding(metadata, project.project_name);
      const embedding = await generateEmbedding(content, geminiApiKey);

      // Check if embedding already exists
      const { data: existingEmbedding } = await supabase
        .from('project_embeddings')
        .select('id')
        .eq('project_id', project_id)
        .eq('content_type', 'project_metadata')
        .maybeSingle();

      if (existingEmbedding) {
        // Update existing embedding
        await supabase
          .from('project_embeddings')
          .update({
            content,
            embedding,
            metadata: {
              source: 'project_metadata_form',
              project_name: project.project_name,
              status: project.status
            }
          })
          .eq('id', existingEmbedding.id);
        console.log(`✓ Updated metadata embedding for: ${project.project_name}`);
      } else {
        // Insert new embedding
        await supabase
          .from('project_embeddings')
          .insert({
            project_id,
            company_id,
            content_type: 'project_metadata',
            content_id: project_id,
            content,
            embedding,
            metadata: {
              source: 'project_metadata_form',
              project_name: project.project_name,
              status: project.status
            }
          });
        console.log(`✓ Generated metadata embedding for: ${project.project_name}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Metadata embedding generated',
          project_name: project.project_name
        }),
        {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 200
        }
      );

    } else if (type === 'document' && document_id) {
      // Generate embedding for project document
      const { data: doc, error: docError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('id', document_id)
        .single();

      if (docError) throw docError;

      const embeddingContent = [
        `Project: ${project.project_name}`,
        `File: ${doc.file_name}`,
        doc.description ? `Description: ${doc.description}` : '',
        doc.category ? `Category: ${doc.category}` : '',
        doc.tags?.length ? `Tags: ${doc.tags.join(', ')}` : '',
        `Type: ${doc.file_type}`
      ].filter(Boolean).join('\n');

      const embedding = await generateEmbedding(embeddingContent, geminiApiKey);

      // Check if embedding already exists for this document
      const { data: existingEmbedding } = await supabase
        .from('project_embeddings')
        .select('id')
        .eq('content_id', document_id)
        .eq('content_type', 'document')
        .maybeSingle();

      if (existingEmbedding) {
        // Update existing embedding
        await supabase
          .from('project_embeddings')
          .update({
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
          })
          .eq('id', existingEmbedding.id);
        console.log(`✓ Updated document embedding: ${doc.file_name}`);
      } else {
        // Insert new embedding
        await supabase
          .from('project_embeddings')
          .insert({
            project_id,
            company_id,
            content_type: 'document',
            content_id: document_id,
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
        console.log(`✓ Generated document embedding: ${doc.file_name}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Document embedding generated',
          file_name: doc.file_name
        }),
        {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 200
        }
      );

    } else {
      throw new Error('Invalid request parameters');
    }

  } catch (error) {
    console.error('Error generating embedding:', error);
    
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
