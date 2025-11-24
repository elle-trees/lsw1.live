/**
 * Rate limiter utility for API calls
 * Prevents exceeding API rate limits by queuing requests
 */

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export class RateLimiter {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private lastRequest = 0;
  private minInterval: number;
  private maxRetries: number;
  private retryDelay: number;

  /**
   * @param minInterval - Minimum milliseconds between requests (default: 100ms)
   * @param maxRetries - Maximum number of retries on failure (default: 3)
   * @param retryDelay - Base delay for exponential backoff in ms (default: 1000ms)
   */
  constructor(
    minInterval: number = 100,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ) {
    this.minInterval = minInterval;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Execute a function with rate limiting and retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      // Wait for minimum interval
      const now = Date.now();
      const waitTime = Math.max(0, this.minInterval - (now - this.lastRequest));
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Execute with retry logic
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          this.lastRequest = Date.now();
          const result = await item.fn();
          item.resolve(result);
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Don't retry on certain errors (4xx client errors except 429)
          if (error instanceof Error && 'status' in error) {
            const status = (error as any).status;
            if (status >= 400 && status < 500 && status !== 429) {
              item.reject(lastError);
              break;
            }
          }

          // If this was the last attempt, reject
          if (attempt === this.maxRetries) {
            item.reject(lastError);
            break;
          }

          // Exponential backoff: wait longer for each retry
          const backoffDelay = this.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.queue.forEach(item => {
      item.reject(new Error("Queue cleared"));
    });
    this.queue = [];
  }
}

// Singleton instance for Speedrun.com API
export const srcRateLimiter = new RateLimiter(
  100, // 100ms between requests (10 requests per second max)
  3,   // 3 retries
  1000 // 1 second base retry delay
);

