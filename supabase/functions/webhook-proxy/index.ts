import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const WEBHOOK_URL = "https://n8nautomation.site/webhook/a9099f1a-02cb-45e8-8672-fd3d2d95adee";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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
    // Get the body from the request
    const body = await req.json();

    console.log('Proxying webhook request:', body);

    // Forward to n8n webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    
    console.log('n8n webhook response:', response.status, responseText);

    return new Response(
      JSON.stringify({
        success: true,
        status: response.status,
        message: 'Webhook forwarded successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Webhook proxy error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
