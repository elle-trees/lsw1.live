# Tech Stack & Backend Improvements

This document outlines potential improvements to the backend, infrastructure, and overall tech stack beyond what's already documented in `BACKEND_IMPROVEMENTS.md`.

## 🔴 High Priority - Performance & Scalability

### 1. **Firestore Transactions for Atomic Operations**
**Current State**: Points are calculated client-side after verification, which can lead to race conditions if multiple admins verify runs simultaneously.

**Improvement**: Use Firestore transactions for:
- Run verification + point updates (atomic)
- Run claiming (prevent double-claiming)
- Category/platform reordering (prevent conflicts)

**Impact**: 
- Data consistency guarantees
- Prevents race conditions
- Better concurrent admin workflows

**Files to Modify**:
- `src/lib/data/firestore/runs.ts` - Add transaction-based verification
- `src/lib/data/firestore/points.ts` - Use transactions for point updates
- `src/lib/data/firestore/players.ts` - Transaction-based player updates

**Example Implementation**:
```typescript
import { runTransaction } from "firebase/firestore";

export const verifyRunWithTransaction = async (
  runId: string,
  verifiedBy: string
) => {
  return runTransaction(db, async (transaction) => {
    const runRef = doc(db, "leaderboardEntries", runId);
    const runDoc = await transaction.get(runRef);
    
    if (!runDoc.exists()) throw new Error("Run not found");
    
    const run = runDoc.data();
    transaction.update(runRef, { verified: true, verifiedBy });
    
    // Update player points atomically
    const playerRef = doc(db, "players", run.playerId);
    const playerDoc = await transaction.get(playerRef);
    const newPoints = await calculatePoints(...);
    transaction.update(playerRef, { 
      points: (playerDoc.data()?.points || 0) + newPoints 
    });
  });
};
```

### 2. **Query Optimization with Field Selection**
**Current State**: Queries fetch entire documents even when only specific fields are needed.

**Improvement**: Use `select()` to fetch only required fields:
- Leaderboard queries only need: `time`, `playerName`, `rank`, `category`, `platform`
- Player list queries only need: `displayName`, `points`, `uid`
- Recent runs only need: `time`, `playerName`, `date`, `category`

**Impact**:
- Reduced data transfer (30-50% reduction)
- Faster query execution
- Lower Firestore read costs

**Files to Modify**:
- `src/lib/data/firestore/leaderboards.ts`
- `src/lib/data/firestore/players.ts`
- `src/lib/data/firestore/runs.ts`

**Example**:
```typescript
const q = query(
  collection(db, "leaderboardEntries"),
  where("verified", "==", true),
  select("time", "playerName", "rank", "category", "platform"),
  orderBy("time", "asc"),
  limit(100)
);
```

### 3. **Cloud Functions for Background Processing**
**Current State**: Point recalculation, SRC imports, and notifications happen client-side.

**Improvement**: Move heavy processing to Cloud Functions:
- **Point Recalculation**: Triggered on run verification
- **SRC Import Processing**: Background job to import runs periodically
- **Notification Creation**: Automatic notifications for WRs, verifications
- **Stats Aggregation**: Pre-calculate stats instead of client-side aggregation

**Impact**:
- Better performance (client doesn't wait for processing)
- Automatic background jobs
- Reduced client-side computation
- Better scalability

**Implementation**:
Create `functions/` directory with:
- `onRunVerified.ts` - Calculate and update points
- `onRunCreated.ts` - Send notifications
- `scheduledSRCImport.ts` - Periodic SRC imports
- `aggregateStats.ts` - Pre-calculate stats

### 4. **Firestore Aggregation Queries**
**Current State**: Stats calculated client-side by fetching all runs.

**Improvement**: Use Firestore count queries and aggregation queries (requires Blaze plan):
- Count verified runs
- Sum total time
- Count runs per category/platform
- Average times

**Impact**:
- Much faster stats calculation
- Reduced data transfer
- Lower read costs

**Files to Modify**:
- `src/pages/Index.tsx` - Use count queries for stats
- `src/pages/Stats.tsx` - Use aggregation queries

### 5. **API Rate Limiting & Retry Logic**
**Current State**: No explicit rate limiting for Speedrun.com API calls.

**Improvement**: 
- Implement exponential backoff for API failures
- Add rate limiting (SRC API has limits)
- Cache API responses where possible
- Queue API requests to avoid bursts

**Impact**:
- More reliable SRC imports
- Better error handling
- Prevents API bans

**Files to Modify**:
- `src/lib/speedruncom.ts` - Add rate limiting wrapper
- `src/lib/speedruncom/importService.ts` - Add retry logic

**Example**:
```typescript
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequest = 0;
  private minInterval = 100; // 100ms between requests

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        const now = Date.now();
        const wait = Math.max(0, this.minInterval - (now - this.lastRequest));
        await new Promise(r => setTimeout(r, wait));
        this.lastRequest = Date.now();
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }
}
```

## 🟡 Medium Priority - Architecture & Code Quality

### 6. **Enhanced Error Logging & Monitoring**
**Current State**: Basic console logging, no centralized error tracking.

**Improvement**: 
- Integrate error tracking service (Sentry, LogRocket, or Firebase Crashlytics)
- Structured logging with context
- Error aggregation and alerting
- Performance monitoring

**Impact**:
- Better debugging
- Proactive issue detection
- User error reporting

**Implementation**:
```typescript
// src/lib/monitoring.ts
import * as Sentry from "@sentry/react";

export const initMonitoring = () => {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
    });
  }
};

export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(error, context);
  if (import.meta.env.PROD) {
    Sentry.captureException(error, { extra: context });
  }
};
```

### 7. **Optimistic Updates**
**Current State**: UI waits for server confirmation before updating.

**Improvement**: Update UI immediately, rollback on error:
- Run verification
- Run claiming
- Profile updates
- Category/platform reordering

**Impact**:
- Perceived performance improvement
- Better UX (instant feedback)

**Files to Modify**:
- `src/pages/Admin.tsx` - Optimistic verification
- `src/pages/UserSettings.tsx` - Optimistic profile updates
- `src/pages/PlayerDetails.tsx` - Optimistic run claiming

### 8. **Server-Side Caching for API Routes**
**Current State**: Twitch API routes have no caching.

**Improvement**: Add caching to Vercel serverless functions:
- Cache Twitch status responses (30-60 seconds)
- Cache SRC API responses where appropriate
- Use Vercel's edge caching

**Impact**:
- Reduced API calls
- Faster response times
- Lower costs

**Files to Modify**:
- `api/twitch/status.ts` - Add cache headers
- `api/twitch/viewercount.ts` - Add caching
- `api/twitch/uptime.ts` - Add caching

**Example**:
```typescript
export async function GET(request: Request) {
  // ... existing code ...
  
  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      // ... other headers
    },
  });
}
```

### 9. **Database Indexing Optimization**
**Current State**: Many indexes exist, but could be optimized.

**Improvement**:
- Review query patterns and optimize indexes
- Add composite indexes for common filter combinations
- Remove unused indexes
- Use index hints where beneficial

**Impact**:
- Faster queries
- Lower costs
- Better scalability

**Files to Review**:
- `firestore.indexes.json` - Review and optimize
- Monitor Firestore usage dashboard for slow queries

### 10. **Pagination with Cursors**
**Current State**: Some queries use `limit()` but no cursor-based pagination.

**Improvement**: Implement cursor-based pagination for:
- Leaderboards (especially large ones)
- Player runs list
- Recent runs
- Admin unverified runs list

**Impact**:
- Better performance for large datasets
- Consistent pagination
- Lower memory usage

**Files to Modify**:
- `src/lib/data/firestore/leaderboards.ts`
- `src/lib/data/firestore/runs.ts`
- `src/components/Pagination.tsx` - Support cursor-based pagination

## 🟢 Low Priority - Nice to Have

### 11. **GraphQL API Layer** (Optional)
**Current State**: Direct Firestore access from client.

**Improvement**: Add GraphQL API layer:
- Better query control
- Reduced over-fetching
- Type-safe queries
- Easier API versioning

**Impact**:
- More flexible data fetching
- Better developer experience
- Easier to add new features

**Note**: This is a significant architectural change and may not be necessary for current scale.

### 12. **CDN for Static Assets**
**Current State**: Assets served from Vercel.

**Improvement**: Use CDN (Cloudflare, CloudFront) for:
- Static assets
- Images
- Fonts

**Impact**:
- Faster global load times
- Better caching
- Lower bandwidth costs

### 13. **Database Connection Pooling**
**Current State**: Direct Firestore SDK usage (handled by Firebase).

**Improvement**: 
- Monitor connection usage
- Optimize Firestore connection settings
- Consider connection pooling if using other databases

**Note**: Firestore SDK handles this automatically, but worth monitoring.

### 14. **Request Deduplication**
**Current State**: Multiple components might fetch the same data simultaneously.

**Improvement**: Implement request deduplication:
- Cache in-flight requests
- Share results across components
- Use React Query's built-in deduplication

**Impact**:
- Reduced redundant requests
- Lower costs
- Faster page loads

**Implementation**: Already partially handled by React Query, but could be enhanced.

### 15. **WebSocket for Real-time Updates** (Alternative)
**Current State**: Using Firestore real-time listeners.

**Improvement**: Consider WebSocket for:
- Very high-frequency updates
- Custom real-time features
- Lower latency for specific use cases

**Note**: Firestore listeners are likely sufficient, but WebSocket could be useful for custom features.

**Impact**:
- Lower latency for specific use cases
- More control over real-time updates

## 🔧 Infrastructure Improvements

### 16. **Environment Variable Validation**
**Current State**: Basic checks in `firebase.ts`.

**Improvement**: Validate all environment variables at startup:
- Use a schema validator (Zod)
- Fail fast with clear error messages
- Document required variables

**Files to Modify**:
- `src/lib/firebase.ts` - Add validation
- Create `src/lib/env.ts` - Centralized env validation

### 17. **Health Check Endpoint**
**Current State**: No health check endpoint.

**Improvement**: Add health check API route:
- Check Firebase connection
- Check external API availability
- Return service status

**Impact**:
- Better monitoring
- Easier debugging
- Uptime monitoring integration

**Implementation**:
```typescript
// api/health.ts
export async function GET() {
  const checks = {
    firebase: await checkFirebase(),
    twitch: await checkTwitchAPI(),
    timestamp: Date.now(),
  };
  
  const healthy = Object.values(checks).every(c => c === true);
  
  return new Response(JSON.stringify(checks), {
    status: healthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### 18. **API Versioning**
**Current State**: No API versioning.

**Improvement**: Add versioning to API routes:
- `/api/v1/twitch/status`
- Easier to maintain backward compatibility
- Gradual migration path

**Impact**:
- Better API evolution
- Easier to deprecate old endpoints

### 19. **Request/Response Logging Middleware**
**Current State**: Basic error logging.

**Improvement**: Add structured logging for API routes:
- Request/response logging
- Performance metrics
- Error tracking

**Impact**:
- Better debugging
- Performance insights
- Security auditing

### 20. **Database Backup Strategy**
**Current State**: Relying on Firebase backups.

**Improvement**: 
- Document backup strategy
- Set up automated exports
- Test restore procedures
- Version control for critical data

**Impact**:
- Data safety
- Disaster recovery
- Compliance

## 📊 Monitoring & Analytics

### 21. **Performance Monitoring**
**Current State**: Basic Vercel Analytics.

**Improvement**: Add detailed performance monitoring:
- Core Web Vitals tracking
- Firestore query performance
- API response times
- Error rates

**Tools**: 
- Vercel Analytics (already in use)
- Firebase Performance Monitoring
- Custom metrics dashboard

### 22. **Usage Analytics**
**Current State**: Basic analytics.

**Improvement**: Track:
- Most viewed leaderboards
- Popular categories
- User engagement metrics
- Feature usage

**Impact**:
- Data-driven decisions
- Better UX improvements

## 🔒 Security Improvements

### 23. **Firestore Security Rules Optimization**
**Current State**: Comprehensive rules, but could be optimized.

**Improvement**:
- Add request validation
- Optimize for common query patterns
- Add rate limiting rules (if supported)
- Review and tighten permissions

**Files to Modify**:
- `firestore.rules` - Optimize and add validation

### 24. **Input Validation & Sanitization**
**Current State**: Basic validation.

**Improvement**: 
- Add Zod schemas for all inputs
- Sanitize user inputs
- Validate file uploads
- Rate limit user actions

**Impact**:
- Better security
- Data integrity
- Prevent abuse

### 25. **CORS Configuration**
**Current State**: Permissive CORS (`*`).

**Improvement**: 
- Restrict CORS to specific origins
- Use environment variables for allowed origins
- Add CORS to all API routes

**Files to Modify**:
- `api/twitch/status.ts` - Restrict CORS
- Other API routes

## 🚀 Deployment & DevOps

### 26. **CI/CD Pipeline Enhancements**
**Current State**: Basic Vercel deployment.

**Improvement**:
- Add automated testing
- Pre-deployment checks
- Staging environment
- Automated rollback

**Impact**:
- Fewer production bugs
- Faster deployments
- Better quality assurance

### 27. **Feature Flags**
**Current State**: No feature flags.

**Improvement**: Implement feature flags for:
- Gradual feature rollouts
- A/B testing
- Quick feature toggles

**Tools**: 
- LaunchDarkly
- Firebase Remote Config
- Custom implementation

### 28. **Database Migrations**
**Current State**: Manual schema changes.

**Improvement**: 
- Version control for schema changes
- Migration scripts
- Rollback procedures
- Data transformation scripts

**Impact**:
- Safer schema changes
- Better version control
- Easier collaboration

## 📝 Documentation

### 29. **API Documentation**
**Current State**: No API documentation.

**Improvement**: 
- Document all API endpoints
- Add OpenAPI/Swagger spec
- Document request/response formats
- Add examples

**Impact**:
- Easier integration
- Better developer experience
- Reduced support burden

### 30. **Architecture Documentation**
**Current State**: Basic README.

**Improvement**: 
- Document system architecture
- Data flow diagrams
- Component relationships
- Deployment architecture

**Impact**:
- Easier onboarding
- Better maintenance
- Clearer understanding

## 🎯 Priority Recommendations

### Immediate (Next Sprint)
1. **Firestore Transactions** (#1) - Critical for data consistency
2. **Query Optimization** (#2) - Quick win, significant cost savings
3. **API Rate Limiting** (#5) - Prevents issues with SRC API

### Short Term (Next Month)
4. **Cloud Functions** (#3) - Better architecture, scalability
5. **Error Logging** (#6) - Better debugging and monitoring
6. **Optimistic Updates** (#7) - Better UX

### Medium Term (Next Quarter)
7. **Aggregation Queries** (#4) - Performance improvement
8. **Pagination** (#10) - Better scalability
9. **Health Checks** (#17) - Better monitoring

### Long Term (Future)
10. **GraphQL** (#11) - If needed for scale
11. **Feature Flags** (#27) - For advanced features
12. **API Documentation** (#29) - For public API

## 📈 Expected Impact Summary

| Improvement | Performance | Cost Savings | UX | Priority |
|------------|-------------|--------------|----|----------| 
| Transactions | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | High |
| Query Optimization | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | High |
| Cloud Functions | ⭐⭐ | ⭐ | ⭐⭐⭐ | High |
| Aggregation Queries | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | Medium |
| Rate Limiting | ⭐⭐ | ⭐ | ⭐⭐⭐ | High |
| Error Logging | ⭐ | ⭐ | ⭐⭐⭐ | Medium |
| Optimistic Updates | ⭐ | ⭐ | ⭐⭐⭐ | Medium |
| Pagination | ⭐⭐ | ⭐⭐ | ⭐⭐ | Medium |

## 🔗 Related Documentation

- [BACKEND_IMPROVEMENTS.md](./BACKEND_IMPROVEMENTS.md) - Already implemented improvements
- [README.md](./README.md) - Project overview
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

