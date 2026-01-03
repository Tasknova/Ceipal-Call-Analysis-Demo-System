import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MatchDocumentsRequest {
  table: "project_embeddings" | "company_brain_embeddings";
  filter?: Record<string, any>;
  match_count: number;
  query_embedding: number[];
}

interface MatchResult {
  id: string;
  project_id?: string;
  company_id: string;
  content_type: string;
  content_id?: string;
  content: string;
  metadata?: Record<string, any>;
  similarity: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request body
    const body: MatchDocumentsRequest = await req.json();
    const { table, filter, match_count, query_embedding } = body;

    console.log(`[match-documents] Request received - table: ${table}, match_count: ${match_count}, filter:`, filter);

    // Validate required fields
    if (!table) {
      return new Response(
        JSON.stringify({ error: "Missing required field: table" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!query_embedding || !Array.isArray(query_embedding) || query_embedding.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid query_embedding array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!match_count || match_count < 1) {
      return new Response(
        JSON.stringify({ error: "match_count must be a positive integer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate table name to prevent SQL injection
    const validTables = ["project_embeddings", "company_brain_embeddings"];
    if (!validTables.includes(table)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid table name. Must be one of: ${validTables.join(", ")}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call the database RPC function for vector similarity search
    // This function must be created in your database (see migration below)
    const { data, error } = await supabase.rpc("match_documents", {
      p_table: table,
      p_query_embedding: query_embedding,
      p_match_count: match_count,
      p_filter: filter || {}
    });

    if (error) {
      console.error("[match-documents] Database error:", error);
      
      // Provide helpful error message if the function doesn't exist
      if (error.message.includes("function") && error.message.includes("does not exist")) {
        return new Response(
          JSON.stringify({ 
            error: "Database function 'match_documents' not found. Please run the setup migration first.",
            details: error.message,
            hint: "See VECTOR_STORE_GUIDE.md for setup instructions"
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform results to match expected format
    const matches: MatchResult[] = (data || []).map((row: any) => ({
      id: row.id,
      project_id: row.project_id,
      company_id: row.company_id,
      content_type: row.content_type,
      content_id: row.content_id,
      content: row.content,
      metadata: row.metadata,
      similarity: row.similarity
    }));

    console.log(`[match-documents] Found ${matches.length} matches`);

    return new Response(
      JSON.stringify({ matches }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[match-documents] Unexpected error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error",
        type: error instanceof Error ? error.constructor.name : "UnknownError"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
