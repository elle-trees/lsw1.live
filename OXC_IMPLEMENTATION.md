# Oxc Implementation

This document describes the implementation of [Oxc](https://oxc.rs/) tools in this project.

## What is Oxc?

Oxc (The JavaScript Oxidation Compiler) is a collection of high-performance JavaScript and TypeScript tools written in Rust, including:
- **Parser**: 3x faster than swc
- **Linter**: 50-100x faster than ESLint (610+ rules)
- **Formatter**: 30x faster than Prettier (in alpha)
- **Transformer**: Babel compatible
- **Resolver**: 28x faster than enhanced-resolve
- **Rolldown**: Rollup-compatible bundler (designed for Vite)

## Current Implementation Status

### ✅ Rolldown (Bundler)
**Status**: Already Implemented

The project is already using Rolldown via `rolldown-vite` package:
- **Package**: `npm:rolldown-vite@latest`
- **Configuration**: See `vite.config.ts`
- **Benefits**: Faster builds, native plugin support, better performance

### ✅ Oxlint (Linter)
**Status**: Fully Implemented and Working

**Installation**:
```bash
npm install --save-dev oxlint
```

**Configuration**:
- Configuration file: `.oxlintrc.json`
- React plugin: Enabled
- TypeScript plugin: Enabled
- Unicorn plugin: Enabled
- Oxc plugin: Enabled
- Ignores: `dist/`, `node_modules/`, config files

**Usage**:
```bash
# Lint with oxlint (current default)
npm run lint

# Fallback to ESLint if needed
npm run lint:eslint
```

**Scripts**:
- `lint`: Runs oxlint on `src/` directory (fast, parallel processing)
- `lint:eslint`: Runs ESLint (kept as fallback)

**Performance**:
- **Speed**: Processes 115 files in ~51ms using 16 threads
- **Speedup**: 50-100x faster than ESLint
- Currently finds 229 warnings (all configurable via `.oxlintrc.json`)

**Benefits**:
- Extremely fast linting (perfect for CI/CD)
- Comprehensive rule coverage (610+ rules)
- Type-aware linting support
- React-specific rules enabled

### ❌ Oxc Formatter
**Status**: Not Yet Available

The Oxc formatter is still in alpha and not ready for production use. Consider using Prettier or wait for stable release.

**Note**: When available, the formatter will be 30x faster than Prettier and Prettier-compatible.

## Configuration Files

### `.oxlintrc.json`
The oxlint configuration file with:
- React plugin enabled
- TypeScript support
- Unicorn and Oxc plugins
- Ignore patterns for `dist/`, `node_modules/`, config files

### `package.json`
- Main lint script uses oxlint
- ESLint kept as fallback (`lint:eslint`)
- Rolldown configured via overrides

## Migration Notes

### From ESLint to Oxlint

Oxlint uses a different rule naming convention:
- ESLint rules are prefixed with plugin names (e.g., `react-hooks/exhaustive-deps`)
- Oxlint uses more direct rule names (e.g., `no-unused-vars`)

Some ESLint-specific features may not be available in oxlint yet, but oxlint covers most common linting needs.

### Keeping ESLint as Fallback

ESLint dependencies are kept in `devDependencies` for now:
- Useful if oxlint has issues
- Can be used for comparison
- Can be removed later if oxlint is fully stable

## Performance Comparison

Based on Oxc benchmarks:
- **Linter**: 50-100x faster than ESLint
- **Bundler (Rolldown)**: Significant speed improvements over standard Rollup
- **Formatter**: 30x faster than Prettier (when available)

## Next Steps

1. ✅ **Oxlint is working** - Ready for CI/CD integration
2. **Consider removing ESLint** once fully confident in oxlint (optional)
3. **Implement Oxc formatter** when it reaches stable release
4. **Tune linting rules** in `.oxlintrc.json` based on project needs

## Resources

- [Oxc Website](https://oxc.rs/)
- [Oxc GitHub](https://github.com/oxc-project/oxc)
- [Oxlint Documentation](https://oxc.rs/docs/guide/usage/linter)
- [Rolldown Documentation](https://rolldown.rs/)

