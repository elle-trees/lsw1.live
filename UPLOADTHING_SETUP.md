# UploadThing Setup Guide

## Required Environment Variables

UploadThing requires the following environment variables to be set:

### For Vercel Deployment:
Add these in your Vercel project settings under "Environment Variables":
- `UPLOADTHING_SECRET` - Your UploadThing secret key
- `UPLOADTHING_APP_ID` - Your UploadThing app ID

### For Local Development:
Add these to your `.env` file (create it if it doesn't exist):
```
UPLOADTHING_SECRET=your_secret_here
UPLOADTHING_APP_ID=your_app_id_here
```

## Getting Your UploadThing Keys

1. Sign up at https://uploadthing.com
2. Create a new app
3. Copy your `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` from the dashboard

## Important Notes

- **Local Development**: The API route `/api/uploadthing` only works when deployed to Vercel. For local testing, you'll need to either:
  - Deploy to Vercel and test there
  - Set up a local proxy server (not recommended)
  - Use UploadThing's development endpoints

- **File Upload Feature**: The file upload feature will only work after:
  1. Setting up UploadThing account and getting API keys
  2. Adding environment variables to Vercel
  3. Deploying to Vercel (or configuring local development environment)

## Troubleshooting

If file uploads don't work:
1. Check that environment variables are set in Vercel
2. Check browser console for error messages
3. Verify UploadThing account is active and has sufficient quota
4. Ensure the API route is accessible (only works on Vercel deployment)

