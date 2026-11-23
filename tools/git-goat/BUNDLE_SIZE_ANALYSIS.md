# Production Bundle Size Analysis

**Measured:** 2026-11-22, using Vite 7.3.8 production build and a temporary Rollup `generateBundle` statistics hook. No dependency or application-code changes were made for this analysis.

## Baseline

| Asset | Minified bytes | gzip bytes |
|---|---:|---:|
| JavaScript (`index-pu5QorUl.js`) | 254,981 (254.98 kB) | 79,894 (79.89 kB) |
| CSS (`index-GDbeFQGU.css`) | 17,977 (17.98 kB) | 5,278 (5.28 kB) |
| Combined | 272,958 (272.96 kB) | 85,172 (85.17 kB) |

There is currently one JS chunk and one CSS asset. The build transformed 1,579 modules. Gzip figures above were measured directly from the emitted files; they may differ slightly from rounded Vite console output.

## Module observations

Rollup's rendered-module statistics show the largest individual contributors are the React DOM client runtime (about 644.6 kB before final minification), the application entry (`src/client/main.tsx`, about 33.5 kB before final minification), React runtime (about 19.2 kB), and shared guidance logic (about 11.4 kB). These are pre-minification module figures and must not be added as though they were final compressed transfer sizes. The emitted JS is 255.0 kB minified / 79.9 kB gzip.

The icon import is from `lucide-react` named exports; the build includes only the icon modules referenced by the app, so tree-shaking is already active. No unusually large image/font/media asset appears in the production output.

## Optimization opportunities

1. **Defer post-scan workflow UI.** The app is currently delivered as one JS chunk, including scan-result remediation and workflow behavior. If first-load performance becomes a product concern, split the result/remediation UI into a lazy-loaded component loaded after a successful scan. This should reduce the initial JS transfer at the cost of a second request when results are shown; measure before/after because the total bytes may stay similar.
2. **Keep imports selective.** Continue importing specific `lucide-react` icons and avoid namespace/default imports that could prevent tree-shaking. Current output already includes only referenced icon modules, so replacing the icon library is not justified by this baseline alone.
3. **Avoid adding heavy client dependencies.** Keep scanning and repository processing on the server. Any future markdown, charting, editor, or syntax-highlighting dependency should be checked for tree-shakeable ESM and dynamic loading where appropriate.
4. **Track transfer-size regressions.** Capture the JS/CSS raw and gzip sizes in CI or a release checklist and set a budget after collecting a few baseline builds. This single measurement is not enough to choose a meaningful threshold.

## Assessment and verification

At roughly 80 kB gzip for JavaScript plus 5.3 kB gzip for CSS, the current client bundle is moderate for a React single-page app. There is no urgent size issue evident from this baseline; code-splitting is the clearest optional improvement if reducing initial load is important. A bundle-size reduction has not been claimed because no application optimization was implemented.

Verified with `pnpm exec vite build`: 1,579 modules transformed and the production build completed successfully. The temporary source map and stats configuration were not committed; generated `dist/` files remain ignored.
