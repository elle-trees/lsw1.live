/**
 * Simple in-memory cache for page data
 * Prevents unnecessary refetches when navigating between pages
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  maxAge: number; // in milliseconds
}

class PageCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultMaxAge = 1000 * 60 * 5; // 5 minutes default

  /**
   * Get cached data if it exists and is still valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, maxAge?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      maxAge: maxAge || this.defaultMaxAge,
    });
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    if (age > entry.maxAge) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const pageCache = new PageCache();

/**
 * Hook to use cached data with automatic fetching
 * Returns [data, loading, error, refetch]
 * Note: This is a utility function - import React hooks at the top of your component file
 */
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: {
    maxAge?: number;
    enabled?: boolean;
    onSuccess?: (data: T) => void;
  }
): [T | null, boolean, Error | null, () => Promise<void>] {
  // This function is provided for reference but requires React hooks
  // Components should implement caching directly using useState and pageCache
  throw new Error("useCachedData requires React hooks - implement caching directly in your component");
}

