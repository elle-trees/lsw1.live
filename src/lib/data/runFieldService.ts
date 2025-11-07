/**
 * Centralized service for autofilling and normalizing run fields
 * Eliminates redundancy across Admin, import, and submission workflows
 */

import { LeaderboardEntry, Category, Platform, Level } from "@/types/database";
import { 
  normalizeCategoryId, 
  normalizePlatformId, 
  normalizeLevelId,
  normalizeLeaderboardType 
} from "@/lib/dataValidation";

export interface AutofillResult {
  category: string;
  platform: string;
  level: string;
  updates: Partial<LeaderboardEntry>;
}

/**
 * Autofill category, platform, and level fields for a run
 * Attempts to match by ID first, then by SRC name if available
 * 
 * @param run - The run entry to autofill
 * @param categories - Available categories (all types)
 * @param platforms - Available platforms
 * @param levels - Available levels (for IL/Community Gold runs)
 * @returns Autofill result with normalized fields and update data
 */
export function autofillRunFields(
  run: LeaderboardEntry,
  categories: Category[],
  platforms: Platform[],
  levels: Array<{ id: string; name: string }> = []
): AutofillResult {
  const runLeaderboardType = normalizeLeaderboardType(run.leaderboardType);
  let category = normalizeCategoryId(run.category);
  let platform = normalizePlatformId(run.platform);
  let level = normalizeLevelId(run.level) || "";

  // Validate and fix category
  if (category) {
    const categoryObj = categories.find(cat => cat.id === category);
    if (categoryObj) {
      const catType = normalizeLeaderboardType((categoryObj as Category).leaderboardType);
      if (catType !== runLeaderboardType) {
        // Category ID doesn't match the run's leaderboard type - clear it
        category = "";
      }
    } else {
      // Category ID not found - clear it
      category = "";
    }
  }

  // Try to match category by SRC name if we don't have a valid category ID
  if (!category && run.srcCategoryName) {
    const matchingCategory = categories.find(cat => {
      const catType = normalizeLeaderboardType((cat as Category).leaderboardType);
      return catType === runLeaderboardType && 
             cat.name.toLowerCase().trim() === run.srcCategoryName!.toLowerCase().trim();
    });
    if (matchingCategory) {
      category = matchingCategory.id;
    }
  }

  // Validate platform
  if (platform) {
    const platformObj = platforms.find(p => p.id === platform);
    if (!platformObj) {
      // Platform ID not found - clear it
      platform = "";
    }
  }

  // Try to match platform by SRC name if we don't have a platform ID
  if (!platform && run.srcPlatformName) {
    const matchingPlatform = platforms.find(p => 
      p.name.toLowerCase().trim() === run.srcPlatformName!.toLowerCase().trim()
    );
    if (matchingPlatform) {
      platform = matchingPlatform.id;
    }
  }

  // Handle level based on leaderboard type
  if (runLeaderboardType === 'regular') {
    // For regular (full game) runs, ensure level is always empty
    level = "";
  } else if ((runLeaderboardType === 'individual-level' || runLeaderboardType === 'community-golds')) {
    // For IL/Community Gold runs, try to match level by SRC name if we don't have a level ID
    if (!level && run.srcLevelName) {
      const matchingLevel = levels.find(l => 
        l.name.toLowerCase().trim() === run.srcLevelName!.toLowerCase().trim()
      );
      if (matchingLevel) {
        level = matchingLevel.id;
      }
    }
  }

  // Build update data - only include fields that changed or were missing
  const updates: Partial<LeaderboardEntry> = {};
  
  if (category && category !== normalizeCategoryId(run.category)) {
    updates.category = category;
  }
  
  if (platform && platform !== normalizePlatformId(run.platform)) {
    updates.platform = platform;
  }
  
  // Handle level: only set for ILs/Community Golds, clear for regular runs
  if (runLeaderboardType === 'regular') {
    // For regular runs, ensure level is cleared if it exists
    if (run.level && run.level.trim() !== '') {
      updates.level = "";
    }
  } else if ((runLeaderboardType === 'individual-level' || runLeaderboardType === 'community-golds')) {
    if (level && level !== (normalizeLevelId(run.level) || "")) {
      updates.level = level;
    }
  }

  return {
    category,
    platform,
    level,
    updates,
  };
}

/**
 * Prepare a run for verification by autofilling fields
 * This is a convenience wrapper that fetches the necessary data
 * 
 * @param run - The run to prepare
 * @param getCategories - Function to get categories
 * @param getPlatforms - Function to get platforms
 * @param getLevels - Function to get levels
 * @returns Autofill result with updates to apply
 */
export async function prepareRunForVerification(
  run: LeaderboardEntry,
  getCategories: (type?: 'regular' | 'individual-level' | 'community-golds') => Promise<Category[]>,
  getPlatforms: () => Promise<Platform[]>,
  getLevels: () => Promise<Level[]>
): Promise<AutofillResult> {
  const runLeaderboardType = normalizeLeaderboardType(run.leaderboardType);
  
  // Fetch all categories (we need to check both regular and IL categories)
  const [regularCats, ilCats, communityGoldsCats] = await Promise.all([
    getCategories('regular'),
    getCategories('individual-level'),
    getCategories('community-golds'),
  ]);
  const allCategories = [...regularCats, ...ilCats, ...communityGoldsCats];
  
  const platforms = await getPlatforms();
  const levels = await getLevels();

  return autofillRunFields(run, allCategories, platforms, levels);
}

/**
 * Enhanced verification function that autofills fields before verifying
 * This combines autofill and verification into a single operation
 */
export async function verifyRunWithAutofill(
  runId: string,
  verified: boolean,
  verifiedBy: string,
  updateRunVerificationStatus: (runId: string, verified: boolean, verifiedBy?: string) => Promise<boolean>,
  updateLeaderboardEntry: (runId: string, data: Partial<LeaderboardEntry>) => Promise<boolean>,
  getRunById: (runId: string) => Promise<LeaderboardEntry | null>,
  getCategories: (type?: 'regular' | 'individual-level' | 'community-golds') => Promise<Category[]>,
  getPlatforms: () => Promise<Platform[]>,
  getLevels: () => Promise<Level[]>
): Promise<{ success: boolean; autofilled: boolean; error?: string }> {
  try {
    // Get the run first
    const run = await getRunById(runId);
    if (!run) {
      return { success: false, autofilled: false, error: "Run not found" };
    }

    // Autofill fields if verifying
    if (verified) {
      const autofillResult = await prepareRunForVerification(
        run,
        getCategories,
        getPlatforms,
        getLevels
      );

      // Apply autofill updates if any
      if (Object.keys(autofillResult.updates).length > 0) {
        await updateLeaderboardEntry(runId, autofillResult.updates);
      }

      // Verify the run
      const verifySuccess = await updateRunVerificationStatus(runId, verified, verifiedBy);
      return {
        success: verifySuccess,
        autofilled: Object.keys(autofillResult.updates).length > 0,
      };
    } else {
      // Just update verification status
      const verifySuccess = await updateRunVerificationStatus(runId, verified, verifiedBy);
      return { success: verifySuccess, autofilled: false };
    }
  } catch (error: any) {
    return {
      success: false,
      autofilled: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Batch verify multiple runs efficiently
 * Fetches all required data once and processes runs in parallel batches
 * 
 * @param runs - Array of runs to verify
 * @param verifiedBy - User who is verifying the runs
 * @param updateRunVerificationStatus - Function to update verification status
 * @param updateLeaderboardEntry - Function to update run data
 * @param getCategories - Function to get categories
 * @param getPlatforms - Function to get platforms
 * @param getLevels - Function to get levels
 * @param batchSize - Number of runs to process in parallel (default: 20)
 * @param onProgress - Optional progress callback
 * @returns Summary of the batch verification
 */
export async function batchVerifyRuns(
  runs: Array<{ id: string; [key: string]: any }>,
  verifiedBy: string,
  updateRunVerificationStatus: (runId: string, verified: boolean, verifiedBy?: string) => Promise<boolean>,
  updateLeaderboardEntry: (runId: string, data: Partial<LeaderboardEntry>) => Promise<boolean>,
  getCategories: (type?: 'regular' | 'individual-level' | 'community-golds') => Promise<Category[]>,
  getPlatforms: () => Promise<Platform[]>,
  getLevels: () => Promise<Level[]>,
  batchSize: number = 20,
  onProgress?: (processed: number, total: number) => void
): Promise<{
  successCount: number;
  errorCount: number;
  errors: string[];
}> {
  const result = {
    successCount: 0,
    errorCount: 0,
    errors: [] as string[],
  };

  if (runs.length === 0) {
    return result;
  }

  // Fetch all required data ONCE at the start
  const [regularCats, ilCats, communityGoldsCats, platforms, levels] = await Promise.all([
    getCategories('regular'),
    getCategories('individual-level'),
    getCategories('community-golds'),
    getPlatforms(),
    getLevels(),
  ]);
  
  const allCategories = [...regularCats, ...ilCats, ...communityGoldsCats];

  // Process runs in parallel batches
  const batches: Array<{ id: string; [key: string]: any }[]> = [];
  for (let i = 0; i < runs.length; i += batchSize) {
    batches.push(runs.slice(i, i + batchSize));
  }

  let totalProcessed = 0;

  // Process each batch in parallel
  for (const batch of batches) {
    await Promise.all(batch.map(async (run) => {
      try {
        if (!run.id) {
          result.errorCount++;
          result.errors.push(`Run missing ID: ${run.playerName || 'Unknown'}`);
          totalProcessed++;
          onProgress?.(totalProcessed, runs.length);
          return;
        }

        // Autofill fields using pre-fetched data (no additional API calls)
        const autofillResult = autofillRunFields(
          run as LeaderboardEntry,
          allCategories,
          platforms,
          levels
        );

        // Apply autofill updates if needed
        if (Object.keys(autofillResult.updates).length > 0) {
          const updateSuccess = await updateLeaderboardEntry(run.id, autofillResult.updates);
          if (!updateSuccess) {
            result.errorCount++;
            result.errors.push(`Failed to update run: ${run.playerName || 'Unknown'}`);
            totalProcessed++;
            onProgress?.(totalProcessed, runs.length);
            return;
          }
        }

        // Verify the run
        const verifySuccess = await updateRunVerificationStatus(run.id, true, verifiedBy);
        if (verifySuccess) {
          result.successCount++;
        } else {
          result.errorCount++;
          result.errors.push(`Failed to verify run: ${run.playerName || 'Unknown'}`);
        }
      } catch (error: any) {
        result.errorCount++;
        result.errors.push(`Error verifying ${run.playerName || 'Unknown'}: ${error.message || String(error)}`);
      } finally {
        totalProcessed++;
        onProgress?.(totalProcessed, runs.length);
      }
    }));
  }

  return result;
}

