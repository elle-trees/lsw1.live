// Vercel serverless function to proxy Twitch viewercount requests
// This bypasses CORS issues by making the request server-side

import {
  validateQueryParams,
  createTextResponse,
  createErrorResponse,
  createOptionsResponse,
  createCacheHeaders,
  handleApiRequest,
} from '../utils/errorHandler';

export async function GET(request: Request) {
  return handleApiRequest(async () => {
    const { searchParams } = new URL(request.url);
    
    // Validate required parameters
    const validation = validateQueryParams(searchParams, ['username']);
    if (!validation.valid) {
      return validation.error;
    }
    
    const username = searchParams.get('username')!;
    
    // Fetch from decapi.me
    const response = await fetch(`https://decapi.me/twitch/viewercount/${username.toLowerCase()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    
    if (!response.ok) {
      return createErrorResponse(
        'Failed to fetch viewercount',
        response.status,
        'TWITCH_API_ERROR'
      );
    }
    
    const text = await response.text();
    
    // Return the text response with CORS headers and caching
    // Cache for 15 seconds (viewercount changes frequently)
    return createTextResponse(text, 200, createCacheHeaders(15, 30));
  }, 'Twitch viewercount');
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return createOptionsResponse();
}

