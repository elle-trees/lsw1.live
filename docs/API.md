# API Documentation

## Overview

This document describes all API endpoints available in the lsw1.dev application. All API routes are deployed as Vercel serverless functions and follow standardized patterns for error handling, validation, and CORS.

## Base URL

- **Production**: `https://lsw1.dev/api`
- **Development**: `http://localhost:5173/api`

## Standard Patterns

All API routes follow these patterns:

### Error Handling

All routes use standardized error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-12-19T12:00:00.000Z"
}
```

### CORS

All routes include CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

### Caching

Routes that proxy external APIs include cache headers:
- `Cache-Control: public, s-maxage=<seconds>, stale-while-revalidate=<seconds>`

### Request Validation

All routes validate required parameters and return standardized error responses for missing or invalid parameters.

---

## Twitch API Proxy Endpoints

These endpoints proxy requests to the decapi.me Twitch API to bypass CORS restrictions.

### GET `/api/twitch/status`

Get the current streaming status of a Twitch channel.

**Query Parameters:**
- `username` (required): Twitch username (case-insensitive)

**Response:**
- **200 OK**: Plain text response with status ("online" or "offline")
- **400 Bad Request**: Missing or invalid `username` parameter
- **500 Internal Server Error**: Failed to fetch from Twitch API

**Example:**
```bash
GET /api/twitch/status?username=example_streamer
```

**Response:**
```
online
```

**Caching:** 30 seconds (stale-while-revalidate: 60 seconds)

---

### GET `/api/twitch/uptime`

Get the current uptime (how long the stream has been live) for a Twitch channel.

**Query Parameters:**
- `username` (required): Twitch username (case-insensitive)

**Response:**
- **200 OK**: Plain text response with uptime (e.g., "2h 30m 15s" or "offline")
- **400 Bad Request**: Missing or invalid `username` parameter
- **500 Internal Server Error**: Failed to fetch from Twitch API

**Example:**
```bash
GET /api/twitch/uptime?username=example_streamer
```

**Response:**
```
2h 30m 15s
```

**Caching:** 30 seconds (stale-while-revalidate: 60 seconds)

---

### GET `/api/twitch/viewercount`

Get the current viewer count for a Twitch channel.

**Query Parameters:**
- `username` (required): Twitch username (case-insensitive)

**Response:**
- **200 OK**: Plain text response with viewer count (e.g., "1234" or "offline")
- **400 Bad Request**: Missing or invalid `username` parameter
- **500 Internal Server Error**: Failed to fetch from Twitch API

**Example:**
```bash
GET /api/twitch/viewercount?username=example_streamer
```

**Response:**
```
1234
```

**Caching:** 15 seconds (stale-while-revalidate: 30 seconds)

---

## File Upload Endpoints

### POST `/api/uploadthing`

Handle file uploads using UploadThing service.

**Endpoints:**
- `downloadFile`: Upload download files (max 64MB, single file)
- `profilePicture`: Upload profile pictures (max 4MB, single file)

**Authentication:** Required (handled by UploadThing)

**Response:**
- **200 OK**: Upload successful, returns file metadata
- **400 Bad Request**: Invalid file or missing parameters
- **413 Payload Too Large**: File exceeds size limit
- **500 Internal Server Error**: Upload failed

**Example:**
```bash
POST /api/uploadthing
Content-Type: multipart/form-data

[file data]
```

**Response:**
```json
{
  "url": "https://uploadthing.com/f/...",
  "name": "file.pdf",
  "size": 1234567,
  "type": "application/pdf"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `MISSING_PARAMETERS` | Required query parameters are missing |
| `TWITCH_API_ERROR` | Failed to fetch data from Twitch API |
| `INTERNAL_ERROR` | Internal server error |

---

## Rate Limiting

Currently, there are no explicit rate limits on API endpoints. However, consider:

- Twitch API proxy endpoints are cached to reduce external API calls
- UploadThing endpoints have built-in rate limiting
- Future implementations may add rate limiting middleware

---

## Development

### Local Development

API routes can be tested locally using Vite's dev server:

```bash
npm run dev
```

Routes will be available at `http://localhost:5173/api/*`

### Testing

Example using `curl`:

```bash
# Test Twitch status endpoint
curl "http://localhost:5173/api/twitch/status?username=example"

# Test with error (missing parameter)
curl "http://localhost:5173/api/twitch/status"
```

---

## Implementation Details

### Error Handling Utilities

All API routes use utilities from `api/utils/errorHandler.ts`:

- `createErrorResponse()`: Creates standardized error responses
- `createSuccessResponse()`: Creates standardized success responses
- `createTextResponse()`: Creates text responses with CORS headers
- `createOptionsResponse()`: Creates CORS preflight responses
- `validateQueryParams()`: Validates required query parameters
- `handleApiRequest()`: Wraps handlers with error handling
- `createCacheHeaders()`: Creates cache control headers

### Route Structure

All routes follow this pattern:

```typescript
import {
  validateQueryParams,
  createTextResponse,
  createErrorResponse,
  createOptionsResponse,
  handleApiRequest,
} from '../utils/errorHandler';

export async function GET(request: Request) {
  return handleApiRequest(async () => {
    // Validate parameters
    const validation = validateQueryParams(searchParams, ['required']);
    if (!validation.valid) {
      return validation.error;
    }
    
    // Process request
    // ...
    
    // Return response
    return createTextResponse(data);
  }, 'Route context');
}

export async function OPTIONS() {
  return createOptionsResponse();
}
```

---

## Future Enhancements

- [ ] Add rate limiting middleware
- [ ] Add request logging
- [ ] Add API versioning
- [ ] Create OpenAPI/Swagger specification
- [ ] Add authentication/authorization for protected endpoints
- [ ] Add request/response validation schemas (Zod)

