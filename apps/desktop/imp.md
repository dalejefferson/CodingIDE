# App Builder Enhancement Plan

## Simple Version
Five upgrades to the App Builder:
1. **Bundled templates (instant creation)** — The IDE ships with pre-built Expo template folders (blank, tabs, drawer) already inside it. Creating an app is always a fast filesystem copy — never downloads anything. Every app creation is instant (~2-5 seconds).
2. **PRD wizard** — "New App" modal becomes a 2-step wizard. Step 1: name/template/location. Step 2: write or generate a PRD, upload UI/UX reference images, pick a color palette.
3. **API key sharing** — Wizard uses the same OpenAI/Claude API key from Settings for PRD generation.
4. **iPhone preview frame** — A live web preview of the running app inside an iPhone-shaped CSS frame, with a device selector to toggle between iPhone sizes (SE, 15, 15 Pro Max, etc.).
5. **Live sync** — Code changes update both the iPhone frame in the IDE and your real phone simultaneously via Metro HMR.

---

## Technical Version

### Feature 1: Bundled Templates (Instant Creation)

**How it works:**
- Templates are pre-built and stored inside the IDE's resources at `apps/desktop/resources/expo-templates/{blank|tabs|drawer}/`
- These are checked into the repo and bundled with the app during `electron-builder` packaging
- Each template contains the full Expo project structure INCLUDING `node_modules` (stored as a tar.gz archive to keep git manageable — extracted on first IDE launch to `{userData}/expo-templates/`)
- On create: `fs.cp` recursive copy from `{userData}/expo-templates/{template}/` to `{parentDir}/{name}/` → update `package.json`/`app.json` name/slug fields
- **No `npx create-expo-app` is ever called.** Every creation is a fast copy (~2-5s)
- The `ExpoService.create()` method is replaced entirely — no more `spawn('npx', ['create-expo-app', ...])`

**Bootstrap flow (one-time on first IDE launch):**
1. IDE starts → checks if `{userData}/expo-templates/blank/` exists
2. If not: extracts `resources/expo-templates/blank.tar.gz` → `{userData}/expo-templates/blank/` (and same for tabs, drawer)
3. This happens in the background during startup, user sees "Preparing templates..." status
4. Subsequent launches skip extraction (templates already exist)

**Template generation (build-time):**
- A build script (`scripts/generate-templates.sh`) runs `create-expo-app` for each template type, tars the result (excluding `.git`), and places it in `resources/expo-templates/`
- This script runs during CI/CD or manually by the developer, NOT by end users
- Templates are version-pinned (Expo SDK version stored in a manifest)

**Update mechanism:**
- A "Refresh Templates" button in the App Builder header re-extracts from bundled archives (or downloads fresh ones if we later add an update check)
- `EXPO_REFRESH_TEMPLATE_CACHE` IPC channel triggers re-extraction

**New service:** `services/templateCache.ts` (~200 LOC)
- `ensureExtracted()` — extracts tar.gz archives on first launch
- `createFromTemplate(template, targetDir, name)` — copies template to target, updates names
- `refreshTemplates()` — re-extracts all templates from archives
- `getStatus()` — returns which templates are ready

**New IPC channels (3):**
- `EXPO_TEMPLATE_STATUS` — returns readiness info for all templates
- `EXPO_REFRESH_TEMPLATES` — re-extracts templates from bundled archives
- `EXPO_ENSURE_TEMPLATES` — triggers extraction if not yet done (called on app startup)

### Feature 2: PRD Wizard with Images + Palettes

**CreateAppModal becomes a 2-step wizard:**
- **Step 1** (existing): Name, Template (with "Cached" badge), Location → "Next" or "Create without PRD"
- **Step 2** (new): PRD textarea + "Generate PRD" button, image upload area (drag-drop + file picker, max 10), color palette grid → "Back", "Skip", or "Create App"

**PRD storage:** Files saved to `{appPath}/.prd/`
- `prd.md` — PRD markdown content
- `palette.json` — selected palette data
- `images/` — copied reference images

**Color palettes:** 10 mobile-friendly palettes (Ocean, Sunset, Forest, Midnight, Coral, Lavender, Arctic, Ember, Mint, Slate) each with primary/secondary/accent/background/surface/text colors. Defined in `shared/mobilePalettes.ts`.

**PRD generation:** New `services/mobilePrdService.ts` with mobile-focused system prompt (React Native/Expo context, screen-by-screen requirements). Same dual-provider pattern as existing `prdService.ts`.

**New IPC channels (4):**
- `EXPO_GENERATE_PRD` — generates PRD from app description using API key
- `EXPO_API_KEY_STATUS` — checks if OpenAI/Claude keys are configured
- `EXPO_SAVE_PRD` — saves PRD + palette to app's `.prd/` dir
- `EXPO_COPY_PRD_IMAGES` — copies images to app's `.prd/images/`

### Feature 3: API Key Integration

The existing `SettingsStore` (`getClaudeKey`/`getOpenAIKey`) is reused directly. The `EXPO_GENERATE_PRD` handler reads from `settingsStore` using the same Claude-preferred fallback pattern as `ipcRalph.ts`. Step 2 shows a warning + disables "Generate PRD" if no key is configured.

### Feature 4: iPhone Preview Frame

**How it works:**
- When user clicks "Start" on an app, Metro is spawned with BOTH `--lan` (for real phone) and `--web` (for IDE preview) on separate ports
- ExpoService tracks two ports per app: `metroPort` (native, e.g. 8081) and `webPort` (web, e.g. 19006)
- A `<webview>` tag (already enabled via `webviewTag: true` in `windowManager.ts`) embeds `http://localhost:{webPort}` inside an iPhone-shaped CSS frame
- CSP already allows this: `frame-src 'self' https: http:;`

**iPhone device selector:**
- Dropdown in the preview area to toggle aspect ratios:
  - iPhone SE (375x667, 4.7")
  - iPhone 14 (390x844, 6.1")
  - iPhone 15 Pro (393x852, 6.1")
  - iPhone 15 Pro Max (430x932, 6.7")
  - iPhone 16 (same as 15 Pro)
  - iPad Mini (744x1133, 8.3")
- Frame is pure CSS: rounded corners, notch/dynamic island, status bar area, home indicator
- The `<webview>` inside resizes to match the selected device's viewport

**Split view toggle:**
- In `AppDetailPanel`, a toggle button switches between "QR Code" view and "Preview" view
- QR Code view: existing QR code + URL + hint (for scanning with phone)
- Preview view: iPhone frame with embedded web app + device selector dropdown
- Both views only appear when `status === 'running'`

**Changes to ExpoService:**
- `start()` spawns TWO processes: `npx expo start --lan --port {metroPort}` AND `npx expo start --web --port {webPort}`
- Actually, Expo supports running both platforms from ONE process. The correct approach:
  - Spawn: `npx expo start --lan --web --port {metroPort}`
  - Metro serves native bundles on `metroPort` and web on a separate auto-assigned port (typically metroPort + 1 or 19006)
  - Parse stdout for BOTH the `exp://` URL and the web URL (`http://localhost:XXXX`)
  - Store both URLs on the `MobileApp` object

**New/modified types:**
- `MobileApp` gains `webUrl: string | null` field
- `ExpoStatusResponse` gains `webUrl: string | null` field
- New: `IPhoneDevice` interface with `id`, `name`, `width`, `height` fields
- New: `IPHONE_DEVICES` constant array

**New components:**
- `IPhoneFrame.tsx` (~150 LOC) — CSS phone frame with `<webview>` inside, device selector dropdown
- `DeviceSelector.tsx` (~60 LOC) — Dropdown for choosing iPhone model

### Feature 5: Live Edit + Preview (Mobile Apps as Project Tabs)

**The problem:** Currently, mobile apps live in a separate global view (`AppBuilderPage`) disconnected from the project tab system. To edit code you must "Open as Project" which creates a regular `ProjectWorkspace` with no iPhone preview. The code editor and preview are never visible simultaneously, and switching between projects loses the mobile app's state.

**Simple version:** Mobile apps become real project tabs, just like your SaaS projects. Each tab remembers its state — if you have a code editor open with an iPhone preview on the right showing your running app, then switch to a SaaS project with a browser open, then switch back, everything is exactly where you left it. All tabs coexist, each with their own ports and running servers.

**Technical version:**

**Mobile apps as project tabs:**
- When a mobile app is created or opened, it's added to the `Project` list with a new `type: 'mobile'` flag
- It shows up as a tab in `ProjectTabs` alongside regular projects
- Clicking the tab renders a `MobileWorkspace` instead of a `ProjectWorkspace`
- The `MobileWorkspace` stays mounted (hidden with CSS) when you switch to another tab — same pattern as `ProjectWorkspace` (line 352-363 of `App.tsx`)
- This means Metro keeps running, the `<webview>` stays alive, and HMR continues flowing

**MobileWorkspace layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  File Explorer  │      Code Editor       │    iPhone Preview     │
│  (FileTree)     │   (CodeViewer)         │   (IPhoneFrame)       │
│                 │                         │   ┌─────────────┐    │
│  app/           │  // App.tsx             │   │  ┌───────┐  │    │
│  ├─ App.tsx  ←  │  export default...     │   │  │       │  │    │
│  ├─ app.json    │                         │   │  │  app  │  │    │
│  └─ ...         │                         │   │  │       │  │    │
│                 │                         │   │  └───────┘  │    │
│                 │                         │   └─────────────┘    │
│                 │                         │   [iPhone 15 Pro ▼]  │
│                 │                         │   [QR Code] [Preview]│
└──────────────────────────────────────────────────────────────────┘
```

- **Left panel**: `FileTree` component (already exists)
- **Middle panel**: `CodeViewer` component (already exists) — atomic disk writes
- **Right panel**: `IPhoneFrame` component (new) — `<webview>` + device selector + QR Code toggle

**State persistence across tab switches:**
- `MobileWorkspace` stays mounted (hidden) like `ProjectWorkspace` does today
- Metro process continues running in the background
- `<webview>` is not destroyed — app state (scroll, navigation) preserved
- Selected file, explorer open/closed state preserved in component state
- Metro port registered in the existing `portRegistryRef` in `App.tsx`
- HMR continues pushing to phone even when tab is in background

**Project type differentiation:**
- `Project` interface gets a new optional field: `type?: 'standard' | 'mobile'`
- `MobileApp` gets a `projectId: string | null` field linking it to the project tab
- `App.tsx` checks `project.type` to decide whether to render `ProjectWorkspace` or `MobileWorkspace`
- `ProjectTabs` shows a phone icon on mobile project tabs to visually distinguish them

**Port awareness:**
- Metro ports (native + web) are registered in the existing `portRegistryRef`
- Each mobile project tracks both `metroPort` and `webPort` in its `MobileApp` record
- Port conflicts between mobile and SaaS projects are caught by the existing port registry
- Toast notification if a port collision is detected

**Auto-start Metro:** When `MobileWorkspace` mounts for an app that isn't running yet, auto-trigger `startApp(appId)`. Preview shows a loading skeleton until Metro is ready.

**HMR flow (automatic, no extra code needed):**
1. User edits a file in `CodeViewer` → saves (Cmd+S)
2. `fileOpsService.atomicWrite()` writes to disk via `fs.writeFileSync()`
3. Metro's file watcher detects the change
4. Metro pushes HMR update to ALL connected clients simultaneously
5. The `<webview>` (web client) re-renders in the iPhone frame
6. Expo Go on the phone (native client) re-renders too
7. Green pulse on iPhone frame border confirms the update

**Navigation:**
- From `AppBuilderPage`: "Edit & Preview" button on an app card adds it as a project tab and switches to it
- From `AppDetailPanel`: "Edit & Preview" button does the same
- Cmd+M toggles to the App Builder grid (for creating/managing apps)
- Project tabs are the primary way to switch between ALL projects (mobile + standard)

**App Builder grid remains for management:**
- The `AppBuilderPage` grid view is still accessible via Cmd+M or sidebar
- It's used for: creating new apps (wizard), adding existing apps, seeing all app statuses at a glance, removing apps
- But once you want to work on an app, you open it as a tab

---

## Implementation Order

| Step | File | Action |
|------|------|--------|
| **Phase A: Shared types + definitions** | | |
| 1 | `src/shared/types.ts` | Add `TemplateStatus`, `MobileAppPRDConfig`, `MobileAppPalette`, `IPhoneDevice`, request/response types; extend `MobileApp` with `hasPRD?`, `webUrl`, `projectId`; extend `Project` with `type?: 'standard' \| 'mobile'` + `mobileAppId?: string`; extend `CreateMobileAppRequest` with optional PRD fields; add `IPHONE_DEVICES` constant |
| 2 | `src/shared/mobilePalettes.ts` | **NEW** — 10 palette definitions with swatch arrays |
| 3 | `src/shared/expoValidators.ts` | Add validators for new request types; update `isCreateMobileAppRequest` for optional fields |
| 4 | `src/shared/ipcContracts.ts` | Add 7 new channel constants, type contracts, validator registry entries |
| **Phase B: Build tooling + main-process services** | | |
| 5 | `scripts/generate-templates.sh` | **NEW** — Build script that runs `create-expo-app` for each template type, tars results to `resources/expo-templates/` |
| 6 | `resources/expo-templates/` | **NEW** — Directory with `blank.tar.gz`, `tabs.tar.gz`, `drawer.tar.gz` (generated by script, gitignored except manifest) |
| 7 | `src/services/templateCache.ts` | **NEW** — `TemplateCacheService` class (extract tar.gz on first launch, copy from extracted templates) |
| 8 | `src/services/mobilePrdService.ts` | **NEW** — `generateMobileAppPRD()` with mobile-focused prompt |
| 9 | `src/services/expoService.ts` | Replace `create()` to use `templateCache.createFromTemplate()` instead of spawning `npx create-expo-app`; update `start()` to also launch web bundler (`--web`), parse web URL from stdout, track `webUrl` |
| **Phase C: IPC wiring** | | |
| 10 | `src/main/ipcExpo.ts` | Template-based create logic, 7 new handlers, accept `settingsStore` + `templateCache` params, broadcast `webUrl` in status changes |
| 11 | `src/main/ipc.ts` | Instantiate `TemplateCacheService`, call `ensureExtracted()` on startup, pass to `setupExpoIPC` with `settingsStore` |
| 12 | `src/preload/index.ts` | Add 7 new methods to `expo` namespace |
| **Phase D: Renderer hooks + state** | | |
| 13 | `src/renderer/hooks/useExpoApps.ts` | Add template status, API key status, PRD generation, update `createApp` signature, track `webUrl` |
| **Phase E: Wizard UI (Features 1-3)** | | |
| 14 | `src/renderer/components/appbuilder/CreateAppStep1.tsx` | **NEW** — Extracted step 1 form (templates always ready, no "Cached" badge needed) |
| 15 | `src/renderer/components/appbuilder/MobilePaletteGrid.tsx` | **NEW** — Palette selection grid |
| 16 | `src/renderer/components/appbuilder/ImageUploadArea.tsx` | **NEW** — Drag-drop + file picker, thumbnails |
| 17 | `src/renderer/components/appbuilder/CreateAppStep2.tsx` | **NEW** — PRD textarea, generate button, images, palettes |
| 18 | `src/renderer/components/appbuilder/CreateAppModal.tsx` | Refactor to wizard orchestrator (step state machine) |
| **Phase F: iPhone Preview + Mobile Workspace (Features 4-5)** | | |
| 19 | `src/renderer/components/appbuilder/DeviceSelector.tsx` | **NEW** — Dropdown for iPhone model selection |
| 20 | `src/renderer/components/appbuilder/IPhoneFrame.tsx` | **NEW** — CSS phone frame with `<webview>` + device selector + HMR pulse indicator |
| 21 | `src/renderer/components/appbuilder/MobileWorkspace.tsx` | **NEW** — Three-panel layout: FileTree (left) + CodeViewer (middle) + IPhoneFrame (right); auto-starts Metro on mount; stays mounted when tab is hidden |
| 22 | `src/renderer/components/appbuilder/AppDetailPanel.tsx` | Add split-view toggle (QR Code / Preview), "Edit & Preview" button (opens as project tab), PRD badge |
| 23 | `src/renderer/components/ProjectTabs.tsx` | Show phone icon on mobile project tabs to distinguish from standard projects |
| 24 | `src/renderer/App.tsx` | Render `MobileWorkspace` for `type: 'mobile'` project tabs (same mounted-but-hidden pattern as `ProjectWorkspace`); register Metro ports in `portRegistryRef`; "Edit & Preview" adds mobile app as project tab |
| **Phase G: Page + card updates** | | |
| 25 | `src/renderer/components/appbuilder/AppBuilderPage.tsx` | Pass new props through to modal; "Edit & Preview" button on app cards adds as project tab |
| 26 | `src/renderer/components/appbuilder/AppCard.tsx` | Small PRD indicator when `hasPRD` |
| **Phase H: Styles** | | |
| 27 | `src/renderer/styles/CreateAppModal.css` | Wizard styles, palette grid, image upload, step indicator |
| 28 | `src/renderer/styles/IPhoneFrame.css` | **NEW** — iPhone frame CSS (bezel, notch/dynamic island, rounded corners, status bar, home indicator), device-specific sizes, HMR pulse animation |
| 29 | `src/renderer/styles/MobileWorkspace.css` | **NEW** — Three-panel layout (file tree, editor, preview), resizable panels |
| **Phase I: Tests + quality** | | |
| 30 | `tests/expoValidation.test.ts` | Tests for all new validators |
| 31 | `tests/templateCache.test.ts` | **NEW** — Cache service unit tests |
| 32 | Run `npm run lint && npm test && npm run bench` | Quality gates |

## New Files (16)

| File | LOC | Purpose |
|------|-----|---------|
| `scripts/generate-templates.sh` | ~50 | Build script: runs `create-expo-app` for each template, tars to `resources/` |
| `resources/expo-templates/` | — | Directory with `blank.tar.gz`, `tabs.tar.gz`, `drawer.tar.gz` + manifest |
| `services/templateCache.ts` | ~200 | Extract bundled templates on first launch, copy to create apps |
| `services/mobilePrdService.ts` | ~130 | Mobile PRD generation |
| `shared/mobilePalettes.ts` | ~120 | Palette definitions |
| `components/appbuilder/CreateAppStep1.tsx` | ~120 | Wizard step 1 |
| `components/appbuilder/CreateAppStep2.tsx` | ~250 | Wizard step 2 |
| `components/appbuilder/MobilePaletteGrid.tsx` | ~100 | Palette grid |
| `components/appbuilder/ImageUploadArea.tsx` | ~150 | Image upload |
| `components/appbuilder/DeviceSelector.tsx` | ~60 | iPhone model dropdown |
| `components/appbuilder/IPhoneFrame.tsx` | ~150 | CSS phone frame + webview |
| `components/appbuilder/MobileWorkspace.tsx` | ~180 | Unified 3-panel layout: FileTree + CodeViewer + IPhoneFrame |
| `styles/IPhoneFrame.css` | ~180 | Phone frame styles + animations |
| `styles/MobileWorkspace.css` | ~100 | Three-panel layout, resizable panels |
| `tests/templateCache.test.ts` | ~100 | Cache tests |

## Modified Files (16)

| File | Changes |
|------|---------|
| `shared/types.ts` | +~120 LOC (new types, `IPhoneDevice`, `webUrl`/`projectId` on MobileApp, `type`/`mobileAppId` on Project) |
| `shared/ipcContracts.ts` | +~45 LOC (7 channels + contracts + validators) |
| `shared/expoValidators.ts` | +~50 LOC (new validators) |
| `services/expoService.ts` | Replace `create()` to use template copy; update `start()` for web bundler + `webUrl` parsing |
| `services/mobileAppStore.ts` | +~10 LOC (setProjectId method, webUrl persistence) |
| `main/ipcExpo.ts` | +~80 LOC (template-based create, 7 new handlers, new params) |
| `main/ipc.ts` | +~8 LOC (instantiate templateCache, call `ensureExtracted()`, pass to setup) |
| `preload/index.ts` | +~28 LOC (7 new API methods) |
| `hooks/useExpoApps.ts` | +~50 LOC (template status, PRD state, webUrl tracking) |
| `components/appbuilder/CreateAppModal.tsx` | Refactored to wizard orchestrator |
| `components/appbuilder/AppBuilderPage.tsx` | +~15 LOC (pass new props, "Edit & Preview" adds app as project tab) |
| `components/appbuilder/AppDetailPanel.tsx` | +~60 LOC (split-view toggle, "Edit & Preview" button, PRD badge) |
| `components/appbuilder/AppCard.tsx` | +~5 LOC (PRD indicator) |
| `components/ProjectTabs.tsx` | +~10 LOC (phone icon for mobile project tabs) |
| `App.tsx` | +~40 LOC (render MobileWorkspace for mobile tabs, register Metro ports, "Edit & Preview" handler) |
| `styles/CreateAppModal.css` | +~120 LOC (wizard, palette, image styles) |
| `tests/expoValidation.test.ts` | +~80 LOC (new validator tests) |

## Key Architecture Decisions

1. **Bundled templates, not downloaded**: Templates are pre-built at development time via `scripts/generate-templates.sh`, stored as `.tar.gz` archives in `resources/expo-templates/`, and extracted to `{userData}/expo-templates/` on first IDE launch. End users never run `create-expo-app`. Every app creation is a fast filesystem copy.
2. **Single Metro process for both web + native**: `npx expo start --lan --web --port {port}` serves both platforms. Web URL parsed from stdout alongside `exp://` URL.
3. **`<webview>` tag (not iframe)**: Electron's webview provides better isolation, doesn't inherit parent CSP, and has APIs for reload/zoom. Already enabled (`webviewTag: true`).
4. **iPhone frame is pure CSS**: No images or SVGs for the phone bezel — just CSS border-radius, box-shadow, and pseudo-elements for the notch/dynamic island. Each device preset changes width/height/border-radius values.
5. **HMR sync is automatic**: Metro pushes to all clients simultaneously. Web preview and Expo Go on phone both receive the same updates. No custom sync code needed.
6. **MobileWorkspace reuses existing components**: `FileTree` and `CodeViewer` are composed into the new `MobileWorkspace` layout — no reimplementation. `CodeViewer` already does atomic disk writes via `fileOpsService`, which Metro's file watcher detects for HMR.
7. **Mobile apps are project tabs**: Mobile apps join the project tab system as `type: 'mobile'` projects. `App.tsx` renders `MobileWorkspace` (instead of `ProjectWorkspace`) for mobile tabs. Both workspace types stay mounted when hidden — Metro processes, webviews, and terminal sessions all persist across tab switches. This follows the exact same pattern `ProjectWorkspace` already uses (hidden with CSS class, not unmounted).
8. **Port registry covers all project types**: The existing `portRegistryRef` in `App.tsx` tracks ports for both standard projects (dev servers) and mobile projects (Metro native port + web preview port). Cross-project port conflicts trigger toast notifications.

## Verification

1. **Instant app creation**: Click "New App" → fill in name/template/location → "Create App" → app appears in grid within a few seconds (no network download). Repeat — same speed every time.
2. **Template extraction**: On first IDE launch, check `{userData}/expo-templates/blank/` is populated from the bundled archive. Verify `package.json` and `node_modules/` exist.
3. **Wizard flow**: Click "New App" → Step 1 → "Next" → Step 2 shows PRD/images/palette → generate PRD → upload images → pick palette → "Create App". Verify `.prd/` folder created with `prd.md`, `palette.json`, and `images/`.
4. **Skip flow**: "New App" → Step 1 → "Create without PRD" → app created normally without `.prd/`.
5. **API key warning**: Remove API keys from Settings → wizard Step 2 → "Generate PRD" disabled, warning shown.
6. **Mobile app as project tab**: Click "Edit & Preview" on an app card → new tab appears with phone icon → tab shows `MobileWorkspace` with file tree (left), code editor (middle), iPhone preview (right).
7. **Live edit + preview**: Edit `App.tsx` in the editor → save (Cmd+S) → iPhone frame in IDE updates live → real phone (connected via QR) also updates simultaneously.
8. **State persistence across tab switches**: Open a mobile app tab (with Metro running + preview visible) → switch to a SaaS project tab (with browser open) → switch back to the mobile tab → everything is exactly where you left it (open file, iPhone frame still showing app, Metro still running).
9. **Port awareness**: Start Metro on port 8081 for one mobile app → start another mobile app → it auto-picks port 8082 → port registry shows both. If a SaaS project tries to use 8081, toast notification warns about the conflict.
10. **Auto-start Metro**: Open mobile workspace for an app that isn't running → Metro auto-starts → preview shows loading skeleton → once ready, iPhone frame renders the app.
11. **Device selector**: Cycle through SE, 14, 15 Pro, 15 Pro Max, iPad Mini — frame resizes correctly.
12. **HMR indicator**: Save a file → brief green pulse on iPhone frame border confirms update pushed.
13. **Quality gates**: `cd apps/desktop && npm run lint && npm test && npm run bench`
