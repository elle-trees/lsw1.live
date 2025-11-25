import { Link, LinkProps } from "@tanstack/react-router";
import { usePrefetch } from "@/hooks/usePrefetch";
import { forwardRef } from "react";

/**
 * PrefetchLink component that automatically prefetches routes and data on hover
 * 
 * This is a drop-in replacement for TanStack Router's Link component
 * that adds automatic prefetching capabilities.
 * 
 * @example
 * ```tsx
 * <PrefetchLink to="/leaderboards">Leaderboards</PrefetchLink>
 * <PrefetchLink to="/player/$playerId" params={{ playerId: "123" }}>Player</PrefetchLink>
 * ```
 */
export interface PrefetchLinkProps extends Omit<LinkProps, 'to'> {
  /**
   * The route path to navigate to (TanStack Router format)
   * e.g., "/leaderboards" or "/player/$playerId"
   */
  to: string;
  /**
   * Optional parameters for dynamic routes
   * e.g., { playerId: "123" } for /player/$playerId
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
        params={params}
        {...(prefetchOnHover ? prefetch : {})}
        {...props}
      />
    );
  }
);

PrefetchLink.displayName = "PrefetchLink";

