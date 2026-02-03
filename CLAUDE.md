# CodingIDE — Project Context

macOS-only Electron + TypeScript + React desktop IDE.

## Repo Layout

```
CodingIDE/
└── apps/desktop/          ← Electron app (this is the active package)
    ├── src/
    │   ├── main/          ← Electron main process (Node.js)
    │   │   ├── index.ts        App lifecycle, singleton lock, security setup
    │   │   ├── ipc.ts          Handler registration (uses IPCRouter)
    │   │   ├── ipcRouter.ts    Validated IPC router (3-gate: allowlist, sender, payload)
    │   │   └── windowManager.ts BrowserWindow creation + hardenSession()
    │   ├── preload/       ← Bridge between main and renderer
    │   │   └── index.ts        contextBridge.exposeInMainWorld — typed ElectronAPI only
    │   ├── renderer/      ← React app (browser context)
    │   │   ├── index.html      CSP meta tag, entry point
    │   │   ├── main.tsx        React 18 createRoot
    │   │   ├── App.tsx         Hello window with IPC ping demo
    │   │   ├── styles/         CSS files
    │   │   └── vite-env.d.ts   Vite client types
    │   ├── services/      ← Main-process services (NO renderer imports)
    │   │   └── logger.ts       In-memory logger with levels
    │   └── shared/        ← Code shared across all processes
    │       ├── ipcContracts.ts SINGLE SOURCE OF TRUTH for IPC channels, types, validators
    │       └── types.ts        AppInfo, WindowState, LogLevel, LogEntry
    ├── tests/             ← Vitest unit tests
    ├── bench/             ← Benchmark runner (node script)
    └── build/             ← macOS build resources (entitlements plist)
```

## Commands

All commands run from `apps/desktop/`:

```bash
npm run dev        # electron-vite dev (HMR renderer, restart main)
npm run build      # electron-vite build
npm run build:mac  # build + electron-builder for macOS
npm run lint       # eslint + prettier --check
npm run lint:fix   # eslint --fix + prettier --write
npm run test       # vitest run
npm run test:watch # vitest (watch mode)
npm run bench      # node bench/runner.js
npm run typecheck  # tsc --noEmit for main + renderer tsconfigs
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Electron 28 |
| Bundler | electron-vite 2 (Vite 5 under the hood) |
| Renderer UI | React 18 + TypeScript |
| Linting | ESLint 9 flat config + typescript-eslint 8 + Prettier 3 |
| Testing | Vitest 1.x |
| Packaging | electron-builder (macOS DMG/ZIP) |
| Node | >=18 |

## Architecture Rules

1. **Renderer must never do heavy work.** File I/O, git, DB, indexing, parsing — all belong in `src/services/` or `src/main/`, invoked via IPC.
2. **Strict Electron security defaults:**
   - `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
   - No raw `ipcRenderer` exposed to renderer — only named methods via `contextBridge`
   - `will-navigate` blocked, `<webview>` blocked, all permission requests denied
   - CSP in index.html: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'`
3. **Typed preload API only.** `window.electronAPI` has named methods. No generic invoke.
4. **IPC flows through IPCRouter** (`src/main/ipcRouter.ts`) with 3-gate validation:
   - Gate 1: Channel must be in `ALLOWED_CHANNELS` set
   - Gate 2: Sender must be a known, non-destroyed `BrowserWindow`
   - Gate 3: Payload must pass the channel's runtime validator
5. **Single source of truth for IPC:** `src/shared/ipcContracts.ts` defines channels, TypeScript contracts, runtime validators, and helpers. When adding a new IPC channel, add all three (channel constant, type contract, validator) or it won't compile.
6. **Validation approach:** Manual type guards (zero dependencies). Switch to zod when payloads grow complex enough to warrant a schema library.
7. **File size:** Target 200–300 LOC per file. Split if >300.
8. **Large lists must be virtualized.** Cap terminal scrollback. Paginate chat.
9. **Quality gates:** After each task, `npm run lint && npm test && npm run bench` must pass. Fix failures before moving on.

## How to Add a New IPC Channel

1. Add channel constant to `IPC_CHANNELS` in `src/shared/ipcContracts.ts`
2. Add type contract (request/response) to `IPCContracts` interface
3. Add runtime validator to `IPC_VALIDATORS` record
4. Register handler in `src/main/ipc.ts` via `router.handle()`
5. Add method to `ElectronAPI` interface in `src/preload/index.ts`
6. Implement the preload method using `safeInvoke()`
7. Add tests for any non-void validator in `tests/ipcValidation.test.ts`

## Theme System

Two-tier theme with global default + optional per-project override.

| Concept | Details |
|---------|---------|
| `ThemeId` | `'light' \| 'dark'` — defined in `shared/types.ts` |
| Global theme | Persisted in `{userData}/theme.json` via `ThemeStore` |
| Per-project override | Optional `theme?: ThemeId` on `Project` — persisted in `projects.json` |
| Effective theme | `project.theme ?? globalTheme` — resolved in `useTheme` hook |
| CSS mechanism | `.dark` class toggled on `<html>` overrides `:root` custom properties |

### T-key Behavior

- **Project focused with override:** cycles that project's theme (`light → dark → light`)
- **Otherwise:** cycles the global theme
- Ignored when focus is in an input/textarea/contentEditable

### Sidebar Theme Badge

Each project row shows a theme badge (☀/🌙):
- **Dimmed (35% opacity):** project inherits global theme
- **Full opacity:** project has a per-project override

Hover tooltip explains current theme source and T-key action.

### IPC Channels

- `ipc:get-global-theme` — returns persisted global `ThemeId`
- `ipc:set-global-theme` — persists a new global `ThemeId`
- `ipc:set-project-theme` — sets or clears (`null`) a project's theme override

### Key Files

- `src/shared/types.ts` — `ThemeId`, `THEME_IDS`, `SetProjectThemeRequest`
- `src/services/themeStore.ts` — Global theme persistence (atomic JSON)
- `src/renderer/hooks/useTheme.ts` — Theme resolution + cycling logic
- `src/renderer/styles/global.css` — `.dark` class with dark palette

## Path Aliases

Configured in `tsconfig.json` and `electron.vite.config.ts`:

- `@shared/*` → `src/shared/*`
- `@services/*` → `src/services/*`

## Key Files

- `electron.vite.config.ts` — Bundler config (main/preload/renderer sections)
- `eslint.config.mjs` — ESLint 9 flat config
- `tsconfig.json` — Base TS (main/preload/services/shared), strict mode
- `tsconfig.renderer.json` — Extends base, adds DOM + JSX for React
- `vitest.config.ts` — Test config with path aliases

## Current Test Coverage

- `tests/ipcContracts.test.ts` — Channel definitions, uniqueness, naming, type compilation, validator/allowlist completeness
- `tests/ipcValidation.test.ts` — isVoid, isString, isNonEmptyString, isThemeId, isSetProjectThemeRequest, isAllowedChannel, validatePayload, registry integrity
- `tests/logger.test.ts` — All log levels, context, timestamps, cap, clear, immutable copies

## Style

- Prettier: no semicolons, single quotes, trailing commas, 100 char width, LF endings
- ESLint: typescript-eslint recommended, react-hooks, react-refresh, no-explicit-any warn
