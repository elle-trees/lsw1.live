import { Link, LinkProps } from "react-router-dom";
import { usePrefetch } from "@/hooks/usePrefetch";
import { forwardRef } from "react";

/**
 * PrefetchLink component that automatically prefetches routes and data on hover
 * 
 * This is a drop-in replacement for react-router-dom's Link component
 * that adds automatic prefetching capabilities.
 * 
 * @example
 * ```tsx
 * <PrefetchLink to="/leaderboards">Leaderboards</PrefetchLink>
 * <PrefetchLink to="/player/123" params={{ playerId: "123" }}>Player</PrefetchLink>
 * ```
 */
export interface PrefetchLinkProps extends LinkProps {
  /**
   * Optional parameters for dynamic routes
   * e.g., { playerId: "123" } for /player/:playerId
   */
  params?: Record<string, string>;
  /**
   * Whether to prefetch on hover (default: true)
   */
  prefetchOnHover?: boolean;
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ to, params, prefetchOnHover = true, ...props }, ref) => {
    const prefetch = usePrefetch(to, params);

    return (
      <Link
        ref={ref}
        to={to}
        {...(prefetchOnHover ? prefetch : {})}
        {...props}
      />
    );
  }
);

PrefetchLink.displayName = "PrefetchLink";

