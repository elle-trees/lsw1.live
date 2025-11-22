/**
 * Utility functions for error handling
 */

/**
 * Type guard to check if an error is a Firebase Auth error
 */
export function isFirebaseAuthError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/**
 * Type guard to check if an error is a standard Error object
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Get a user-friendly error message from an error
 */
export function getErrorMessage(error: unknown, defaultMessage = "An error occurred. Please try again."): string {
  if (isFirebaseAuthError(error)) {
    // Map Firebase Auth error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      "auth/invalid-email": "Invalid email address.",
      "auth/user-disabled": "This account has been disabled.",
      "auth/user-not-found": "Invalid email or password.",
      "auth/wrong-password": "Invalid email or password.",
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/weak-password": "Password is too weak. Please use a stronger password.",
      "auth/network-request-failed": "Network error. Please check your connection.",
      "auth/too-many-requests": "Too many requests. Please try again later.",
    };

    return errorMessages[error.code] || error.message || defaultMessage;
  }

  if (isError(error)) {
    return error.message || defaultMessage;
  }

  if (typeof error === "string") {
    return error;
  }

  return defaultMessage;
}

/**
 * Log error with context for debugging
 * Note: Logging removed for production cleanup
 */
export function logError(_error: unknown, _context?: string): void {
  // Error logging removed for production cleanup
  // Errors are handled via user-facing toasts and error boundaries
}

