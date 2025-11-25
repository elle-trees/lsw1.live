import { useRef, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { prefetchRouteAndData } from "@/lib/prefetch";

/**
 * Comprehensive prefetch hook for routes and data
 * 
 * This hook provides prefetching capabilities that:
 * 1. Prefetch route chunks (JavaScript bundles) on hover
 * 2. Prefetch page data (Firestore queries, etc.) on hover
 * 3. Work with both static and dynamic routes
 * 
 * @param to - The route path to prefetch (TanStack Router format)
 * @param params - Optional parameters for dynamic routes (e.g., { playerId: "123" })
 * @returns Event handlers for mouse enter
 */
export function usePrefetch(
  to: string,
  params?: Record<string, string>
) {
  const router = useRouter();
  const hasPrefetched = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (!hasPrefetched.current && typeof document !== "undefined") {
      // Build the href from the route
      let href = to;
      if (params) {
        // Replace route params in the path
        Object.entries(params).forEach(([key, value]) => {
          href = href.replace(`$${key}`, value);
        });
      }
      // Prefetch both route and data
      prefetchRouteAndData(href, to, params);
      hasPrefetched.current = true;
    }
  }, [to, params]);

  return {
    onMouseEnter: handleMouseEnter,
    prefetch: () => {
      if (!hasPrefetched.current) {
        let href = to;
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            href = href.replace(`$${key}`, value);
          });
        }
        prefetchRouteAndData(href, to, params);
        hasPrefetched.current = true;
      }
    },
  };
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use usePrefetch instead
 */
export function usePrefetchOnHover(to: string) {
  return usePrefetch(to);
}

/**
 * Hook to prefetch data for visible items (e.g., in a list)
 * Useful for prefetching player/run details when they're visible in the viewport
 */
export function usePrefetchVisible(
  _items: Array<{ id: string; type: "player" | "run" }>
) {
  const prefetchedIds = useRef<Set<string>>(new Set());

  const prefetchItem = useCallback((item: { id: string; type: "player" | "run" }) => {
    if (prefetchedIds.current.has(item.id)) return;

    const prefetchFn = async () => {
      if (item.type === "player") {
        const { getPlayerByUid } = await import("@/lib/db/players");
        const { getPlayerRuns } = await import("@/lib/db/runs");
        await Promise.all([
          getPlayerByUid(item.id).catch(() => null),
          getPlayerRuns(item.id).catch(() => null),
        ]);
      } else if (item.type === "run") {
        const { getLeaderboardEntryById } = await import("@/lib/db/runs");
        await getLeaderboardEntryById(item.id).catch(() => null);
      }
    };

    prefetchFn();
    prefetchedIds.current.add(item.id);
  }, []);

  return { prefetchItem };
}
