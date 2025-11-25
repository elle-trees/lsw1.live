# Codebase Overhaul TODO

## Executive Summary

This document outlines critical issues, compatibility problems, and areas requiring refactoring in the lsw1.dev codebase. The project is a React + Vite speedrunning leaderboard platform that needs modernization and cleanup.

---

## 🔴 Critical Issues (Must Fix)

### 1. **UploadThing API Route Incompatibility**
**Status:** 🔴 Critical  
**Location:** `api/uploadthing/index.ts`  
**Issue:** Using `uploadthing/next` (Next.js-specific) in a Vite project. This will fail in production on Vercel.

**Fix Required:**
- Replace `uploadthing/next` with `uploadthing` core package
- Use Vercel serverless function compatible handler
- Update type imports in `src/lib/uploadthing.ts`

**Files to Update:**
- `api/uploadthing/index.ts` - Replace Next.js imports with Vercel-compatible handlers
- `src/lib/uploadthing.ts` - Update type imports

---

### 2. **TanStack Router Version Mismatch**
**Status:** 🔴 Critical  
**Location:** `package.json`  
**Issue:** 
- `@tanstack/router` is at beta version `0.0.1-beta.53`
- `@tanstack/router-vite-plugin` and `@tanstack/router-devtools` are at `1.139.3`
- This version mismatch can cause runtime errors and type issues

**Fix Required:**
- Upgrade `@tanstack/router` to stable version matching other TanStack packages
- Or downgrade router-vite-plugin and devtools to match router version
- Verify all TanStack Router APIs are compatible

**Recommended:** Upgrade to latest stable versions across all TanStack packages

---

### 3. **Unused Dependencies**
**Status:** 🟡 Medium  
**Location:** `package.json`  
**Issue:** 
- `@tanstack/start` (v1.120.20) - Full-stack framework, not used in this SPA
- `react-router-dom` (v6.26.2) - Not used (project uses TanStack Router)

**Fix Required:**
- Remove `@tanstack/start` and all its transitive dependencies
- Remove `react-router-dom` 
- Run `npm prune` to clean up unused packages
- Update README.md to reflect actual routing library (TanStack Router, not React Router)

---

### 4. **TypeScript Configuration Too Permissive**
**Status:** 🟡 Medium  
**Location:** `tsconfig.json`, `tsconfig.app.json`  
**Issue:** 
- `strict: false`
- `noImplicitAny: false`
- `strictNullChecks: false`
- `noUnusedLocals: false`
- `noUnusedParameters: false`

**Fix Required:**
- Gradually enable strict mode
- Start with `strictNullChecks: true`
- Enable `noImplicitAny: true`
- Enable `noUnusedLocals: true` and `noUnusedParameters: true`
- Fix type errors incrementally

**Approach:** Enable one strict check at a time, fix errors, then move to next

---

## 🟠 Architecture & Compatibility Issues

### 5. **Server Configuration Confusion**
**Status:** 🟠 Medium  
**Location:** `server.js`, `vercel.json`  
**Issue:** 
- Custom Node.js server (`server.js`) exists but Vercel uses serverless functions
- Server.js is for static file serving, but Vercel handles this automatically
- Unclear deployment strategy

**Fix Required:**
- Document deployment strategy (Vercel vs self-hosted)
- If using Vercel only, remove `server.js` and update `package.json` scripts
- If supporting both, create separate deployment configs
- Update README with deployment instructions

---

### 6. **API Routes Structure**
**Status:** 🟠 Medium  
**Location:** `api/` directory  
**Issue:**
- Twitch API routes use modern Fetch API (good)
- UploadThing route uses Next.js patterns (bad - see issue #1)
- Inconsistent error handling patterns

**Fix Required:**
- Standardize API route patterns
- Add consistent error handling
- Add request validation
- Add rate limiting considerations
- Document API endpoints

---

### 7. **TanStack Router vs React Router Documentation**
**Status:** 🟡 Low  
**Location:** `README.md`  
**Issue:** README states "Routing: React Router" but project uses TanStack Router

**Fix Required:**
- Update README.md tech stack section
- Document TanStack Router usage
- Update any routing-related documentation

---

## 🟡 Code Quality & Modernization

### 8. **Lazy Loading Pattern Inconsistency**
**Status:** 🟡 Medium  
**Location:** `src/lib/db.ts`  
**Issue:** All database functions use dynamic imports (`await import()`), which is good for code splitting but creates inconsistent patterns

**Fix Required:**
- Evaluate if lazy loading is necessary for all functions
- Consider using React.lazy() for component-level code splitting instead
- Document the lazy loading strategy

---

### 9. **Error Handling Patterns**
**Status:** 🟡 Medium  
**Location:** Throughout codebase  
**Issue:** Inconsistent error handling - some functions have try/catch, others use silent failures

**Fix Required:**
- Standardize error handling patterns
- Create error boundary utilities
- Add error logging service
- Replace silent failures with proper error handling

---

### 10. **Type Safety Improvements**
**Status:** 🟡 Medium  
**Location:** Throughout codebase  
**Issue:** 
- Many `any` types
- Optional chaining used without null checks
- Type assertions without validation

**Fix Required:**
- Audit and replace `any` types
- Add runtime type validation (Zod schemas)
- Improve type guards
- Add stricter type checking

---

### 11. **Environment Variable Management**
**Status:** 🟡 Low  
**Location:** `src/lib/firebase.ts`, API routes  
**Issue:** 
- No validation of environment variables at build time
- Missing env vars cause runtime errors
- No documentation of required env vars

**Fix Required:**
- Add environment variable validation
- Create `.env.example` file
- Document all required environment variables
- Add build-time checks for missing vars

---

## 🔵 Performance & Optimization

### 12. **Bundle Size Optimization**
**Status:** 🔵 Low  
**Location:** `vite.config.ts`  
**Issue:** 
- Manual chunk splitting is complex
- Some large dependencies could be lazy loaded
- Recharts is excluded from pre-bundling but could be optimized further

**Fix Required:**
- Review and optimize manual chunks
- Consider dynamic imports for heavy components (Recharts, Admin panel)
- Analyze bundle size with visualizer
- Optimize vendor chunks

---

### 13. **PWA Configuration**
**Status:** 🔵 Low  
**Location:** `vite.config.ts`  
**Issue:** 
- PWA disabled in dev mode (good)
- Workbox configuration could be optimized
- Missing offline fallback strategy

**Fix Required:**
- Review PWA manifest completeness
- Add offline fallback pages
- Optimize cache strategies
- Test PWA functionality

---

## 🟢 Future Enhancements

### 14. **Multi-Game Support Architecture**
**Status:** 🟢 Future  
**Location:** Throughout codebase  
**Issue:** Codebase is hardcoded for single game (Lego Star Wars)

**Fix Required:**
- Design multi-game architecture
- Abstract game-specific logic
- Create game configuration system
- Update database schema for multi-game support
- Refactor components to be game-agnostic

---

### 15. **API Documentation**
**Status:** 🟢 Future  
**Location:** Missing  
**Issue:** No API documentation exists

**Fix Required:**
- Document all API endpoints
- Create OpenAPI/Swagger spec
- Add API versioning strategy
- Document rate limits and authentication

---

### 16. **Testing Infrastructure**
**Status:** 🟢 Future  
**Location:** Missing  
**Issue:** No tests found in codebase

**Fix Required:**
- Set up testing framework (Vitest)
- Add unit tests for utilities
- Add integration tests for API routes
- Add E2E tests for critical flows
- Set up CI/CD with test runs

---

### 17. **Accessibility Audit**
**Status:** 🟢 Future  
**Location:** Throughout codebase  
**Issue:** No accessibility testing or ARIA labels visible

**Fix Required:**
- Run accessibility audit (axe, Lighthouse)
- Add ARIA labels where needed
- Ensure keyboard navigation
- Test with screen readers
- Fix contrast issues

---

### 18. **Internationalization (i18n)**
**Status:** 🟢 Future  
**Location:** Missing  
**Issue:** No i18n support

**Fix Required:**
- Evaluate i18n library (react-i18next, formatjs)
- Extract all user-facing strings
- Create translation files
- Add language switcher
- Support RTL languages if needed

---

## 📋 Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. ✅ Fix UploadThing API route incompatibility (#1)
2. ✅ Resolve TanStack Router version mismatch (#2)
3. ✅ Remove unused dependencies (#3)
4. ✅ Update README routing documentation (#7)

### Phase 2: Type Safety & Quality (Week 2-3)
5. ✅ Enable TypeScript strict mode gradually (#4)
6. ✅ Standardize error handling (#9)
7. ✅ Improve type safety (#10)
8. ✅ Add environment variable validation (#11)

### Phase 3: Architecture Cleanup (Week 4)
9. ✅ Clarify server/deployment strategy (#5)
10. ✅ Standardize API routes (#6)
11. ✅ Review lazy loading patterns (#8)

### Phase 4: Optimization (Week 5)
12. ✅ Optimize bundle size (#12)
13. ✅ Enhance PWA configuration (#13)

### Phase 5: Future Enhancements (Ongoing)
14. ⏳ Multi-game support architecture (#14)
15. ⏳ API documentation (#15)
16. ⏳ Testing infrastructure (#16)
17. ⏳ Accessibility audit (#17)
18. ⏳ Internationalization (#18)

---

## 🔧 Quick Wins (Can Do Immediately)

1. **Remove unused dependencies:**
   ```bash
   npm uninstall @tanstack/start react-router-dom
   npm prune
   ```

2. **Update README.md:**
   - Change "React Router" to "TanStack Router"
   - Update tech stack section

3. **Create .env.example:**
   - Document all required environment variables
   - Add to repository

4. **Fix UploadThing imports:**
   - Replace `uploadthing/next` with `uploadthing`
   - Update API route handler

---

## 📝 Notes

- The codebase is generally well-structured but needs modernization
- Firebase integration is solid
- UI components (shadcn/ui) are well-implemented
- Real-time features (Firestore subscriptions) are properly implemented
- The main issues are around dependency management and type safety

---

## 🚀 Getting Started

1. Start with Phase 1 critical fixes
2. Test thoroughly after each fix
3. Update this document as issues are resolved
4. Create separate branches for each phase
5. Run full test suite before merging (once tests exist)

---

**Last Updated:** 2024-12-19  
**Status:** Analysis Complete - Ready for Implementation

