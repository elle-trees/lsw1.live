/**
 * Standardized error handling for API routes
 */

/**
 * CORS headers for API responses
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

/**
 * Creates a standardized error response with CORS headers
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  headers: HeadersInit = {}
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      code,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
        ...headers,
      },
    }
  );
}

/**
 * Creates a standardized success response with CORS headers
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  headers: HeadersInit = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

/**
 * Creates a text response with CORS headers (for Twitch API proxy responses)
 */
export function createTextResponse(
  text: string,
  status: number = 200,
  headers: HeadersInit = {}
): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain',
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

/**
 * Creates a standardized OPTIONS response for CORS preflight
 */
export function createOptionsResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

/**
 * Validates required query parameters
 */
export function validateQueryParams(
  searchParams: URLSearchParams,
  required: string[]
): { valid: true } | { valid: false; error: Response } {
  const missing: string[] = [];
  
  for (const param of required) {
    const value = searchParams.get(param);
    if (!value || value.trim() === '') {
      missing.push(param);
    }
  }
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: createErrorResponse(
        `Missing required parameters: ${missing.join(', ')}`,
        400,
        'MISSING_PARAMETERS'
      ),
    };
  }
  
  return { valid: true };
}

/**
 * Wraps an API handler with standardized error handling
 */
export async function handleApiRequest<T>(
  handler: () => Promise<Response>,
  context: string
): Promise<Response> {
  try {
    return await handler();
  } catch (error: unknown) {
    console.error(`[API] Error in ${context}:`, error);
    return createErrorResponse(
      'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }
}

/**
 * Creates cache control headers for API responses
 */
export function createCacheHeaders(
  maxAge: number,
  staleWhileRevalidate?: number
): HeadersInit {
  const cacheControl = staleWhileRevalidate
    ? `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    : `public, s-maxage=${maxAge}`;
  
  return {
    'Cache-Control': cacheControl,
  };
}

