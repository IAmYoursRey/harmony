# GeoSense Lint Baseline

## Current Lint Configuration
The `eslint.config.js` was modified during the previous recovery phase to disable strict typing rules.

| Rule | Previous state | Current state | Why disabled | Violations Count | Legitimate? |
|------|----------------|---------------|--------------|------------------|-------------|
| `@typescript-eslint/no-explicit-any` | `warn`/`error` (default) | `off` | To pass build during architecture recovery. | ~16 | Yes. Real typings should be used. |
| `@typescript-eslint/no-unused-vars` | `warn`/`error` (default) | `off` | To pass build during architecture recovery. | ~60+ | Yes. Dead variables should be removed. |
| `react-hooks/exhaustive-deps` | `warn` (default) | `warn` | Was not disabled, but flagged 2 warnings. | 2 | Yes. Missing dependency arrays. |
| `react-refresh/only-export-components`| `warn` (default) | `warn` | Was not disabled. | 9 | Yes. Exporting non-components. |

## Next Steps
We will restore `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars` to `warn` or `error` and resolve the underlying violations instead of hiding them.
