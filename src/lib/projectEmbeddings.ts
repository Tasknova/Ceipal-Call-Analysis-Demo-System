// Utility functions for Project-level embeddings
// Similar to embeddings.ts but scoped to projects

import { generateEmbedding } from './embeddings';
import type { ProjectMetadata, ProjectEmbedding } from './supabase';

interface ProjectEmbeddingData {
  project_id: string;
  company_id: string;
  content_type: 'project_metadata' | 'document' | 'document_chunk';
  content_id?: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

/**
 * Store an embedding for project content
 */
export async function storeProjectEmbedding(
  supabase: any,
  data: ProjectEmbeddingData
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
      .from('project_embeddings')
      .insert([{
        project_id: data.project_id,
        company_id: data.company_id,
        content_type: data.content_type,
        content_id: data.content_id,
        content: data.content,
        metadata: data.metadata,
        embedding: embedding
      }]);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error storing project embedding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Search for similar content within a specific project
 */
export async function searchProjectContent(
  supabase: any,
  projectId: string,
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

    // Search using RPC function (scoped to project)
    const { data, error } = await supabase
      .rpc('match_project_documents', {
        p_query_embedding: result.embedding,
        p_project_id: projectId,
        p_match_threshold: threshold,
        p_match_count: limit
      });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error searching project content:', error);
    return [];
  }
}

/**
 * Search across all projects in a company
 */
export async function searchCompanyProjects(
  supabase: any,
  companyId: string,
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

    // Search using RPC function (across all company projects)
    const { data, error } = await supabase
      .rpc('match_company_projects', {
        p_query_embedding: result.embedding,
        p_company_id: companyId,
        p_match_threshold: threshold,
        p_match_count: limit
      });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error searching company projects:', error);
    return [];
  }
}

/**
 * Prepare project metadata for embedding
 */
export function prepareProjectMetadataForEmbedding(metadata: Partial<ProjectMetadata>, projectName: string): string {
  const parts = [];

  if (projectName) parts.push(`Project: ${projectName}`);
  if (metadata.domain) parts.push(`Domain: ${metadata.domain}`);
  if (metadata.industry) parts.push(`Industry: ${metadata.industry}`);
  if (metadata.project_type) parts.push(`Type: ${metadata.project_type}`);
  if (metadata.target_audience) parts.push(`Target Audience: ${metadata.target_audience}`);
  if (metadata.tech_stack?.length) parts.push(`Tech Stack: ${metadata.tech_stack.join(', ')}`);
  if (metadata.key_goals?.length) parts.push(`Goals: ${metadata.key_goals.join(', ')}`);
  if (metadata.requirements) parts.push(`Requirements: ${metadata.requirements}`);
  if (metadata.team_size) parts.push(`Team Size: ${metadata.team_size}`);
  if (metadata.budget_range) parts.push(`Budget: ${metadata.budget_range}`);
  if (metadata.priority_level) parts.push(`Priority: ${metadata.priority_level}`);
  if (metadata.additional_context) parts.push(`Additional Context: ${metadata.additional_context}`);

  return parts.join('\n');
}

/**
 * Delete all embeddings for a project
 */
export async function deleteProjectEmbeddings(
  supabase: any,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('project_embeddings')
      .delete()
      .eq('project_id', projectId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting project embeddings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete embeddings for a specific content type in a project
 */
export async function deleteProjectEmbeddingsByType(
  supabase: any,
  projectId: string,
  contentType: 'project_metadata' | 'document' | 'document_chunk'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('project_embeddings')
      .delete()
      .eq('project_id', projectId)
      .eq('content_type', contentType);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting project embeddings by type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get project statistics
 */
export async function getProjectStats(
  supabase: any,
  projectId: string
): Promise<any> {
  try {
    const { data, error } = await supabase
      .rpc('get_project_stats', {
        p_project_id: projectId
      });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting project stats:', error);
    return null;
  }
}

/**
 * Chunk text for project documents (reuse from embeddings.ts logic)
 */
export function chunkProjectText(text: string, maxChunkSize: number = 1000): string[] {
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
