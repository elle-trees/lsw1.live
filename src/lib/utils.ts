import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to a localized date format
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

/**
 * Parse a time string (HH:MM:SS) to total seconds
 * @param timeString - Time string in HH:MM:SS format
 * @returns Total seconds
 */
export function parseTimeToSeconds(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * Format total seconds to HH:MM:SS format
 * @param totalSeconds - Total seconds
 * @returns Time string in HH:MM:SS format
 */
export function formatSecondsToTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format a time string to display without hours if under 1 hour
 * @param timeString - Time string in HH:MM:SS format
 * @returns Formatted time string (MM:SS if under 1 hour, otherwise HH:MM:SS)
 */
export function formatTime(timeString: string): string {
  if (!timeString) return timeString;
  
  // Trim whitespace
  const trimmed = timeString.trim();
  
  // Handle different time formats
  const parts = trimmed.split(':');
  
  // If it's already in MM:SS format (2 parts), return as-is
  if (parts.length === 2) {
    return trimmed;
  }
  
  // If it's in HH:MM:SS format (3 parts)
  if (parts.length === 3) {
    const hoursStr = parts[0].trim();
    const hours = parseInt(hoursStr, 10);
    
    // If hours is 0, "00", or NaN, return MM:SS format
    if (isNaN(hours) || hours === 0 || hoursStr === '00' || hoursStr === '0') {
      // Ensure minutes and seconds are properly formatted
      const minutes = (parts[1] || '00').trim();
      const seconds = (parts[2] || '00').trim();
      return `${minutes}:${seconds}`;
    }
    
    // If hours is 1-9, remove leading zero and return H:MM:SS
    // If hours is 10+, keep as is (though this won't happen in practice)
    if (hours >= 1 && hours < 10) {
      const minutes = (parts[1] || '00').trim();
      const seconds = (parts[2] || '00').trim();
      return `${hours}:${minutes}:${seconds}`;
    }
  }
  
  // Otherwise return as-is (for 10+ hours, though this won't happen)
  return trimmed;
}

/**
 * Calculate points for a run using simple flat rates
 * Points are awarded for:
 * - All verified runs (full game, individual levels, and community golds)
 * - All platforms
 * - All categories
 * - Both solo and co-op runs are eligible
 * 
 * Points calculation:
 * - Base points: flat amount for all verified runs
 * - Top 3 bonus: additional points for runs ranked 1st, 2nd, or 3rd in their category/platform/runType/level combination
 * 
 * @param timeString - Time string in HH:MM:SS format (not used in new system but kept for compatibility)
 * @param categoryName - Name of the category (not used in new system but kept for compatibility)
 * @param platformName - Name of the platform (not used in new system but kept for compatibility)
 * @param categoryId - Optional category ID (not used in new system but kept for compatibility)
 * @param platformId - Optional platform ID (not used in new system but kept for compatibility)
 * @param pointsConfig - Points configuration with basePointsPerRun and top3BonusPoints
 * @param rank - Optional rank of the run in its category (1-3 for bonus points)
 * @returns Points awarded for the run
 */
export function calculatePoints(
  timeString: string, 
  categoryName: string, 
  platformName?: string,
  categoryId?: string,
  platformId?: string,
  pointsConfig?: { 
    basePointsPerRun?: number;
    top3BonusPoints?: {
      rank1?: number;
      rank2?: number;
      rank3?: number;
    };
    enabled?: boolean;
  },
  rank?: number
): number {
  // Use config values or defaults
  const config = pointsConfig || {};
  const enabled = config.enabled !== false; // Default to true if not specified
  if (!enabled) return 0;

  // Rank #1 runs get 100 base points, all other runs use configured basePointsPerRun
  // Ensure rank is a number for comparison
  const numericRank = typeof rank === 'number' ? rank : (rank !== undefined ? Number(rank) : undefined);
  
  let basePoints: number;
  if (numericRank === 1) {
    basePoints = 100;
  } else {
    basePoints = config.basePointsPerRun ?? 10;
  }
  
  // Debug: Log rank #1 runs
  if (numericRank === 1) {
    console.log(`[calculatePoints] Rank #1 run detected! basePoints=${basePoints}, top3Bonus=${config.top3BonusPoints?.rank1 || 0}`);
  }
  
  // Start with base points
  let points = basePoints;

  // Add top 3 bonus if applicable (use numericRank for comparison)
  if (numericRank !== undefined && numericRank >= 1 && numericRank <= 3) {
    const top3Bonus = config.top3BonusPoints || { rank1: 50, rank2: 30, rank3: 20 };
    if (numericRank === 1 && top3Bonus.rank1) {
      points += top3Bonus.rank1;
    } else if (numericRank === 2 && top3Bonus.rank2) {
      points += top3Bonus.rank2;
    } else if (numericRank === 3 && top3Bonus.rank3) {
      points += top3Bonus.rank3;
    }
  }

  return Math.round(points);
}
