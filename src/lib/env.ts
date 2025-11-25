/**
 * Environment variable validation and access
 * Provides type-safe access to environment variables with validation
 */

interface EnvConfig {
  // Firebase
  VITE_FIREBASE_API_KEY: string;
  VITE_FIREBASE_AUTH_DOMAIN: string;
  VITE_FIREBASE_PROJECT_ID: string;
  VITE_FIREBASE_STORAGE_BUCKET: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  VITE_FIREBASE_APP_ID: string;
  
  // UploadThing (server-side only)
  UPLOADTHING_SECRET?: string;
  UPLOADTHING_APP_ID?: string;
  
  // Admin
  VITE_ADMIN_UID?: string;
  
  // Google Translate API (optional - for auto-translation)
  VITE_GOOGLE_TRANSLATE_API_KEY?: string;
  
  // Server
  PORT?: string;
}

/**
 * Validates required environment variables at build/runtime
 * Throws an error if required variables are missing
 */
function validateEnv(): EnvConfig {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ] as const;

  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    const value = import.meta.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or deployment environment variables.'
    );
  }

  return {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    UPLOADTHING_SECRET: import.meta.env.UPLOADTHING_SECRET,
    UPLOADTHING_APP_ID: import.meta.env.UPLOADTHING_APP_ID,
    VITE_ADMIN_UID: import.meta.env.VITE_ADMIN_UID,
    VITE_GOOGLE_TRANSLATE_API_KEY: import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY,
    PORT: import.meta.env.PORT,
  };
}

/**
 * Validated environment configuration
 * Access this instead of import.meta.env directly for type safety
 */
export const env = validateEnv();

/**
 * Get Firebase config from validated environment variables
 */
export function getFirebaseConfig() {
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
}

/**
 * Get admin UID if configured
 */
export function getAdminUid(): string | undefined {
  return env.VITE_ADMIN_UID;
}

