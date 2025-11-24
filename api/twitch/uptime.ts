// Vercel serverless function to proxy Twitch uptime requests
// This bypasses CORS issues by making the request server-side

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return new Response(JSON.stringify({ error: 'Username is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Fetch from decapi.me
    const response = await fetch(`https://decapi.me/twitch/uptime/${username.toLowerCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch uptime' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const text = await response.text();
    
    // Return the text response with CORS headers and caching
    // Cache for 30 seconds (uptime changes less frequently than viewercount)
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching Twitch uptime:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

