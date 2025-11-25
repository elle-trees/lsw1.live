# Deployment Strategy

## Overview

This project supports two deployment strategies:
1. **Vercel** (Recommended) - Serverless functions with automatic static hosting
2. **Self-hosted** - Custom Node.js server for static file serving

## Vercel Deployment (Recommended)

### Configuration

The project is configured for Vercel deployment via `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

### Features

- **Automatic Static Hosting**: Vercel serves the built `dist/` directory
- **Serverless Functions**: API routes in `/api` are automatically deployed as serverless functions
- **SPA Routing**: All non-API routes are rewritten to `/index.html` for client-side routing
- **Environment Variables**: Set in Vercel dashboard under Project Settings

### Required Environment Variables

See `.env.example` for all required variables. Set these in Vercel:
- Firebase configuration (VITE_*)
- UploadThing configuration (UPLOADTHING_*) - Optional
- Admin UID (VITE_ADMIN_UID) - Optional
- Google Translate API Key (VITE_GOOGLE_TRANSLATE_API_KEY) - Optional, required for auto-translation feature

### Deployment Steps

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all required variables (see `.env.example`)
   - **Important**: For `VITE_GOOGLE_TRANSLATE_API_KEY`, set it to: `AIzaSyA4nWDyPRbm4y8Mkb1NaWPYzApwGjCklJk`
   - Make sure to set variables for all environments (Production, Preview, Development)
3. Vercel will automatically:
   - Run `npm install`
   - Run `npm run build`
   - Deploy the `dist/` directory
   - Deploy API routes as serverless functions

### API Routes

API routes in `/api` are automatically deployed as Vercel serverless functions:
- `/api/twitch/*` - Twitch proxy endpoints
- `/api/uploadthing` - File upload handler

## Self-Hosted Deployment

### Using server.js

The project includes `server.js` for self-hosted deployments:

```bash
npm run build
npm start
```

The server:
- Serves static files from `dist/`
- Handles SPA routing (all routes serve `index.html`)
- Runs on port 8080 (or PORT environment variable)

### Configuration

1. Build the project: `npm run build`
2. Set environment variables
3. Start the server: `npm start` or `node server.js`

### When to Use

- Self-hosted VPS/dedicated server
- Docker containers
- Local development/testing
- Environments where Vercel isn't suitable

## Environment Variables

### Development

Create a `.env` file in the project root (see `.env.example`):

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
# ... etc
```

### Production

- **Vercel**: Set in Vercel dashboard
- **Self-hosted**: Set as environment variables or use a `.env` file (not recommended for production)

## Build Process

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Firebase Deployment

Firebase configuration is separate from the main app:

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

## Notes

- The `server.js` file is only needed for self-hosted deployments
- Vercel automatically handles static file serving
- API routes work the same in both deployment strategies
- Environment variables must be prefixed with `VITE_` for client-side access

