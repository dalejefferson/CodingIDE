# App Builder Feature - Expo Mobile Development Environment

> **Purpose:** Comprehensive feature spec + implementation guide for adding Expo mobile app
> development to CodingIDE. Contains all research, architecture decisions, and step-by-step
> implementation instructions. A fresh session should be able to implement this without
> re-researching anything.

---

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [User Requirements](#user-requirements)
3. [Expo Technical Reference](#expo-technical-reference)
4. [Codebase Architecture Reference](#codebase-architecture-reference)
5. [Data Model Design](#data-model-design)
6. [IPC Channel Design](#ipc-channel-design)
7. [Service Layer Design](#service-layer-design)
8. [UI Component Design](#ui-component-design)
9. [Implementation Phases](#implementation-phases)
10. [Files Summary](#files-summary)
11. [Performance Optimizations](#performance-optimizations)
12. [Verification Plan](#verification-plan)

---

## 1. Feature Overview

**Simple version:** A new section in the IDE for building phone apps. Users click "App Builder"
in the sidebar, create or open Expo projects, hit Start, and scan a QR code with their phone
to see the app live. Claude builds the code from the terminal, same as web projects.

**Technical version:** A standalone Expo/React Native mobile development feature with its own
sidebar entry, data store, IPC layer, and page component. Metro dev server lifecycle is managed
via `child_process.spawn` (same pattern as `ralphService.ts`). QR codes rendered via
`qrcode.react` SVG component. Completely isolated from Ralph Loop.

---

## 2. User Requirements

- **QR Code only** - no simulators, no emulators. Users scan with Expo Go on physical phone.
- **Completely separate** from Ralph Loop - own sidebar section, own data store, own workflow
- **Both** create new apps from templates AND open existing Expo projects
- **Claude-driven** - users build apps via Claude from the terminal, same workflow as web projects
- **New sidebar button** under Ralph Loop
- **New homepage card** on the EmptyState page
- **Local JSON storage** (same pattern as all other stores)
- **Performance-optimized** - Metro managed carefully to not slow down the IDE

---

## 3. Expo Technical Reference

### 3.1 Expo CLI Commands

**Create a new project:**
```bash
npx create-expo-app <name> --template <template>
# Templates: blank, tabs, drawer
# Creates directory at current location
```

**Start dev server:**
```bash
npx expo start           # default: LAN mode, port 8081
npx expo start --lan     # explicit LAN mode
npx expo start --tunnel  # ngrok tunnel (slower, works across networks)
npx expo start --localhost  # localhost only (simulators only)
npx expo start --port 9000  # custom port
npx expo start --clear   # clear Metro cache on start
```

**Key flags for programmatic use:**
- Set `CI=1` env var for non-interactive mode (no terminal UI)
- Set `NODE_OPTIONS='--max-old-space-size=4096'` for memory cap
- Default port: **8081** (Metro bundler)
- Web dev port: **19006** (not used in our QR-only approach)

### 3.2 QR Code URL Formats

| Mode | URL Format | Example |
|------|-----------|---------|
| LAN (default) | `exp://<LAN_IP>:<PORT>` | `exp://192.168.1.5:8081` |
| Localhost | `exp://127.0.0.1:<PORT>` | `exp://127.0.0.1:8081` |
| Tunnel | `exp://<random>.ngrok.io` | `exp://abc123.ngrok.io` |
| Dev client | `exp+<slug>://expo-development-client/?url=<server>` | `exp+myapp://...` |

The `exp://` scheme maps to `http://` in Expo Go. When Expo Go opens an `exp://` URL, it
connects to that address to download the JavaScript bundle.

**Expo also provides a QR generation endpoint:**
`https://qr.expo.dev/development-client?appScheme=exp+apps-slug&url=<server_url>`

### 3.3 Metro Dev Server Output Parsing

When `npx expo start` runs, stdout contains:
```
> Metro waiting on exp://192.168.1.2:8081
> Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

> Press a | open Android
> Press i | open iOS simulator
> Press w | open web
> Press r | reload app
> Press m | toggle menu
```

**Key patterns to parse from stdout:**
```typescript
// Detect server URL (LAN mode)
const urlMatch = output.match(/Metro waiting on (exp:\/\/[\d.]+:\d+)/)

// Detect HTTP URL
const httpMatch = output.match(/(http:\/\/[\d.]+:\d+)/)

// Detect server ready
output.includes('Metro waiting on')

// Detect bundling progress
output.includes('Building JavaScript bundle')

// Detect bundle completion
output.match(/Built JavaScript bundle in \d+ms/)
```

### 3.4 Hot Module Replacement (HMR)

- Metro HMR operates over a WebSocket at path `/hot`
- The client (phone/Expo Go) establishes a persistent WebSocket connection with Metro
- When a file changes, Metro re-transforms only the changed module and sends an `update` message
- Message types: `update-start`, `update`, `update-done`, `error`
- React Fast Refresh handles hot-swapping React components while preserving state
- If a module can't be hot-swapped, a full live reload is triggered
- **No extra work needed from our IDE** - HMR happens automatically between Metro and Expo Go

### 3.5 Expo Project Files

A scaffolded Expo project contains:
```
my-app/
├── app.json          # Expo config (name, slug, version, SDK version)
├── package.json      # Dependencies (expo, react, react-native)
├── metro.config.js   # Metro bundler config
├── babel.config.js   # Babel config
├── tsconfig.json     # TypeScript config
├── App.tsx           # Entry point (or app/ directory with Expo Router)
└── node_modules/
```

**app.json example:**
```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "version": "1.0.0",
    "plugins": ["expo-router"]
  }
}
```

### 3.6 Network Considerations

- **LAN mode (default):** Phone and computer must be on same WiFi. Corporate networks
  with AP isolation will block this. Port 8081 must be open on computer's firewall.
- **Tunnel mode:** Uses `@expo/ngrok` to create public HTTPS URL. Works across networks.
  Significantly slower (200-500ms+ latency). Requires `npm install @expo/ngrok`.
- **For our QR-only approach:** LAN mode is the primary path. Tunnel mode is a fallback
  option users can enable if their network blocks LAN.

### 3.7 How Replit/Bolt Handle This

**Replit:**
1. Cloud-based IDE runs Expo dev server
2. QR code appears in console when "Start App" is clicked
3. Scan with Expo Go to preview on device
4. Web preview pane shows web version (may differ from native)
5. "Publish" creates a public QR code URL anyone can scan

**Bolt.new:**
1. Uses Expo starter template
2. AI generates React Native code from prompts
3. QR code displayed for scanning with Expo Go
4. EAS integration planned for App Store submission

**Our approach mirrors these:** QR code + Expo Go, with Claude handling the AI code generation
from the terminal instead of a chat interface.

### 3.8 QR Code Libraries

**For React renderer (recommended):**
```bash
npm install qrcode.react  # ~15KB, SVG component
```
```tsx
import { QRCodeSVG } from 'qrcode.react'
<QRCodeSVG value="exp://192.168.1.5:8081" size={256} level="M" />
```

**For Node.js main process (not needed for our approach, but available):**
```bash
npm install qrcode  # toDataURL(), toFile(), toString()
```

### 3.9 Metro Performance

- Default memory: 500MB-2GB heap depending on project size
- Default workers: ~50% of CPU cores
- **Our optimization:** Limit to 2 workers, cap at 4GB heap
- Cache locations: `~/Library/Caches/Metro`, `.expo/cache`
- Clear cache: `npx expo start --clear`
- Watchman (if installed) is significantly faster than Node.js fs.watch

---

## 4. Codebase Architecture Reference

### 4.1 Key Existing Patterns

**JSON File Stores** (reference: `src/services/ticketStore.ts`, `src/services/projectStore.ts`):
- Class with constructor accepting file path
- Lazy-load: read from disk on first access
- Debounced atomic writes: write-to-temp + rename, 500ms debounce
- `flush()` method called on app quit
- Methods return plain objects (not class instances)

**Child Process Management** (reference: `src/services/ralphService.ts`):
- `spawn()` with `{ detached: true, stdio: ['pipe','pipe','pipe'] }`
- stdout/stderr collected in truncated log (10,000 char cap)
- Graceful shutdown: SIGTERM to process group, SIGKILL after timeout
- Status callback pattern: `(id: string, status: Status, ...args) => void`

**IPC 3-Gate Validation** (reference: `src/main/ipcRouter.ts`, `src/shared/ipcContracts.ts`):
- Gate 1: Channel in `ALLOWED_CHANNELS` set
- Gate 2: Sender is known, non-destroyed BrowserWindow
- Gate 3: Payload passes channel's runtime validator
- Manual type guards (no zod)

**Component Patterns** (reference: `src/renderer/components/kanban/KanbanPage.tsx`):
- React.lazy for lazy loading page components
- React.memo for sidebar
- Per-component CSS files with BEM naming
- CSS custom properties from global.css for theming
- useCallback for all handler props

**Preload API** (reference: `src/preload/index.ts`):
- Namespaced methods: `window.electronAPI.projects.getAll()`
- All methods use `safeInvoke()` which checks allowlist
- Broadcast listeners via `ipcRenderer.on()` with cleanup return

### 4.2 How to Add a New IPC Channel (from CLAUDE.md)

1. Add channel constant to `IPC_CHANNELS` in `src/shared/ipcContracts.ts`
2. Add type contract (request/response) to `IPCContracts` interface
3. Add runtime validator to `IPC_VALIDATORS` record
4. Register handler in `src/main/ipc.ts` via `router.handle()`
5. Add method to `ElectronAPI` interface in `src/preload/index.ts`
6. Implement the preload method using `safeInvoke()`
7. Add tests for any non-void validator in `tests/ipcValidation.test.ts`

### 4.3 Existing App State Flow (in App.tsx)

```typescript
// View states (mutually exclusive with active project)
const [settingsOpen, setSettingsOpen] = useState(false)
const [kanbanOpen, setKanbanOpen] = useState(false)
// We add: const [appBuilderOpen, setAppBuilderOpen] = useState(false)

// When opening a view, clear others:
const handleOpenKanban = useCallback(() => {
  setKanbanOpen(true)
  setSettingsOpen(false)
  setActiveProjectId(null)
  // We add: setAppBuilderOpen(false)
}, [])
```

### 4.4 Sidebar Structure

```typescript
// SidebarProps includes:
interface SidebarProps {
  kanbanOpen: boolean
  onOpenKanban: () => void
  // We add:
  appBuilderOpen: boolean
  onOpenAppBuilder: () => void
}

// Sidebar action buttons (in order):
// 1. Home Page button
// 2. Ralph Loop button
// 3. App Builder button  <-- NEW
```

### 4.5 EmptyState Card Pattern

```typescript
const suggestions: SuggestionCard[] = [
  { icon: <FolderOpenIcon />, label: 'Open Existing Project', onClick: onOpenFolder },
  { icon: <PlusIcon />, label: 'Create a New Project', onClick: handleCreateClick },
  { icon: <LoopIcon />, label: 'Ralph Loop', onClick: onOpenKanban },
  // We add:
  { icon: <PhoneIcon />, label: 'Build a Mobile App', onClick: onOpenAppBuilder },
]
```

### 4.6 Critical File Paths

| File | Purpose |
|------|---------|
| `apps/desktop/src/shared/types.ts` | All domain types |
| `apps/desktop/src/shared/ipcContracts.ts` | Single source of truth for IPC |
| `apps/desktop/src/main/ipc.ts` | IPC handler registration + service init |
| `apps/desktop/src/main/ipcRalph.ts` | **Pattern reference** for ipcExpo.ts |
| `apps/desktop/src/preload/index.ts` | ElectronAPI bridge |
| `apps/desktop/src/services/ralphService.ts` | **Pattern reference** for expoService.ts |
| `apps/desktop/src/services/ticketStore.ts` | **Pattern reference** for mobileAppStore.ts |
| `apps/desktop/src/renderer/App.tsx` | Main app state + routing |
| `apps/desktop/src/renderer/components/Sidebar.tsx` | Sidebar with action buttons |
| `apps/desktop/src/renderer/components/EmptyState.tsx` | Homepage cards |
| `apps/desktop/src/renderer/components/kanban/KanbanPage.tsx` | **Pattern reference** for AppBuilderPage |
| `apps/desktop/src/renderer/hooks/useTickets.ts` | **Pattern reference** for useExpoApps.ts |
| `apps/desktop/src/renderer/styles/global.css` | CSS custom properties + theme palettes |

---

## 5. Data Model Design

### 5.1 Types (add to `src/shared/types.ts`)

```typescript
// ── App Builder / Expo ──────────────────────────────────────

export type ExpoTemplate = 'blank' | 'tabs' | 'drawer'
export const EXPO_TEMPLATES: readonly ExpoTemplate[] = ['blank', 'tabs', 'drawer'] as const

export type MobileAppStatus = 'idle' | 'starting' | 'running' | 'error' | 'stopped'
export const MOBILE_APP_STATUSES: readonly MobileAppStatus[] = [
  'idle', 'starting', 'running', 'error', 'stopped',
] as const

export interface MobileApp {
  id: string                    // UUID
  name: string                  // App name
  path: string                  // Absolute path to Expo project root
  template: ExpoTemplate        // Which template was used to scaffold
  status: MobileAppStatus       // Current Metro server state
  expoUrl: string | null        // exp://IP:PORT when Metro is running
  metroPort: number             // Metro port (default 8081)
  addedAt: number               // Unix timestamp
  lastError: string | null      // Last error message from Metro
}

export interface CreateMobileAppRequest {
  name: string
  template: ExpoTemplate
  parentDir: string             // Directory to run create-expo-app in
}

export interface AddMobileAppRequest {
  path: string                  // Path to existing Expo project
}

export interface StartExpoRequest {
  appId: string
}

export interface StopExpoRequest {
  appId: string
}

export interface ExpoStatusRequest {
  appId: string
}

export interface ExpoStatusResponse {
  status: MobileAppStatus
  expoUrl: string | null
  log: string                   // Truncated Metro output log
  lastError: string | null
}

export interface OpenMobileAppAsProjectRequest {
  appId: string
}
```

### 5.2 Store Schema

File: `{userData}/mobile-apps.json`
Format: JSON array of `MobileApp` objects (same pattern as `projects.json`, `tickets.json`)

---

## 6. IPC Channel Design

### 6.1 Channel Constants (add to `IPC_CHANNELS`)

```typescript
EXPO_GET_ALL: 'ipc:expo-get-all',
EXPO_CREATE: 'ipc:expo-create',
EXPO_ADD: 'ipc:expo-add',
EXPO_REMOVE: 'ipc:expo-remove',
EXPO_START: 'ipc:expo-start',
EXPO_STOP: 'ipc:expo-stop',
EXPO_STATUS: 'ipc:expo-status',
EXPO_OPEN_FOLDER_DIALOG: 'ipc:expo-open-folder-dialog',
EXPO_CHOOSE_PARENT_DIR: 'ipc:expo-choose-parent-dir',
EXPO_OPEN_AS_PROJECT: 'ipc:expo-open-as-project',
```

### 6.2 Contracts Table

| Channel | Request | Response |
|---------|---------|----------|
| `ipc:expo-get-all` | void | MobileApp[] |
| `ipc:expo-create` | CreateMobileAppRequest | MobileApp |
| `ipc:expo-add` | AddMobileAppRequest | MobileApp |
| `ipc:expo-remove` | string (appId) | void |
| `ipc:expo-start` | StartExpoRequest | void |
| `ipc:expo-stop` | StopExpoRequest | void |
| `ipc:expo-status` | ExpoStatusRequest | ExpoStatusResponse |
| `ipc:expo-open-folder-dialog` | void | string \| null |
| `ipc:expo-choose-parent-dir` | void | string \| null |
| `ipc:expo-open-as-project` | OpenMobileAppAsProjectRequest | Project |

### 6.3 Broadcast Event

- Channel: `'expo:status-changed'`
- Payload: `MobileApp` (the updated app object)
- Sent from main process whenever Metro status changes
- Renderer subscribes via `onStatusChanged` in preload

### 6.4 Validators (create `src/shared/expoValidators.ts`)

All manual type guards, zero dependencies:
```typescript
export function isCreateMobileAppRequest(v: unknown): v is CreateMobileAppRequest
  // checks: name is non-empty string, template is in EXPO_TEMPLATES, parentDir is non-empty string

export function isAddMobileAppRequest(v: unknown): v is AddMobileAppRequest
  // checks: path is non-empty string

export function isStartExpoRequest(v: unknown): v is StartExpoRequest
  // checks: appId is non-empty string

export function isStopExpoRequest(v: unknown): v is StopExpoRequest
  // checks: appId is non-empty string

export function isExpoStatusRequest(v: unknown): v is ExpoStatusRequest
  // checks: appId is non-empty string

export function isOpenMobileAppAsProjectRequest(v: unknown): v is OpenMobileAppAsProjectRequest
  // checks: appId is non-empty string
```

---

## 7. Service Layer Design

### 7.1 `src/services/mobileAppStore.ts` (~120 LOC)

Follow `ticketStore.ts` pattern:

```typescript
export class MobileAppStore {
  constructor(private filePath: string) {}

  getAll(): MobileApp[]
  getById(id: string): MobileApp | undefined
  create(payload: CreateMobileAppRequest, projectPath: string): MobileApp
    // generates UUID, sets status='idle', expoUrl=null, metroPort=8081, addedAt=Date.now()
  add(payload: AddMobileAppRequest): MobileApp
    // validates app.json exists at path, deduplicates by path
  remove(id: string): void
  setStatus(id: string, status: MobileAppStatus): void
  setExpoUrl(id: string, url: string | null): void
  setError(id: string, error: string | null): void
  flush(): void
    // force write pending changes to disk
}
```

Internal: lazy load from disk, dirty flag, debounced write (500ms), atomic write
(write-to-temp + rename).

### 7.2 `src/services/expoService.ts` (~250 LOC)

Follow `ralphService.ts` child process pattern:

```typescript
interface ExpoProcess {
  process: ChildProcess | null
  running: boolean
  log: string            // truncated at 10,000 chars
  expoUrl: string | null
  metroPort: number
}

type ExpoStatusCallback = (
  appId: string,
  status: MobileAppStatus,
  expoUrl: string | null,
  error: string | null,
) => void

export class ExpoService {
  private processes = new Map<string, ExpoProcess>()

  constructor(private onStatusChange: ExpoStatusCallback) {}

  async create(name: string, template: ExpoTemplate, parentDir: string): Promise<string>
    // Spawns: npx create-expo-app <name> --template <template>
    // cwd: parentDir
    // Returns: join(parentDir, name) on success
    // Throws on failure (stderr message)

  start(app: MobileApp): void
    // Guards: isRunning check, prevent duplicate starts
    // Finds available port (default 8081, auto-increment if busy)
    // Spawns: npx expo start --lan --port <port>
    // env: { ...process.env, CI: '1', NODE_OPTIONS: '--max-old-space-size=4096' }
    // detached: true (for process group kill)
    //
    // stdout parsing:
    //   - /Metro waiting on (exp:\/\/[\d.]+:\d+)/ -> extract URL, fire callback(running, url)
    //   - Append to log (truncated at 10,000 chars)
    //
    // stderr parsing:
    //   - Append to log
    //   - On critical errors -> fire callback(error, null, errorMsg)
    //
    // Process exit:
    //   - fire callback(stopped, null)
    //   - Clean up from processes map

  stop(appId: string): Promise<void>
    // SIGTERM to process group: process.kill(-pid, 'SIGTERM')
    // Wait up to 5s for exit
    // SIGKILL if still alive: process.kill(-pid, 'SIGKILL')
    // fire callback(stopped, null)

  getStatus(appId: string): ExpoStatusResponse
    // Returns current state from processes map

  isRunning(appId: string): boolean

  async stopAll(): Promise<void>
    // Iterate all running processes, stop each
    // Called on app quit from disposeIPC()
}
```

**Port availability check:**
```typescript
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => { server.close(); resolve(true) })
    server.listen(port, '0.0.0.0')
  })
}

async function findAvailablePort(start: number = 8081): Promise<number> {
  for (let port = start; port < start + 100; port++) {
    if (await isPortAvailable(port)) return port
  }
  throw new Error('No available ports')
}
```

### 7.3 `src/main/ipcExpo.ts` (~130 LOC)

Follow `ipcRalph.ts` pattern:

```typescript
export function setupExpoIPC(
  router: IPCRouter,
  mobileAppStore: MobileAppStore,
  projectStore: ProjectStore,
  getMainWindow: () => BrowserWindow | null,
): { expoService: ExpoService } {

  const expoService = new ExpoService((appId, status, expoUrl, error) => {
    // Update store
    mobileAppStore.setStatus(appId, status)
    mobileAppStore.setExpoUrl(appId, expoUrl)
    if (error) mobileAppStore.setError(appId, error)

    // Broadcast to renderer
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      const app = mobileAppStore.getById(appId)
      if (app) win.webContents.send('expo:status-changed', app)
    }
  })

  // Register all 10 handlers using router.handle()
  // ...

  return { expoService }
}
```

---

## 8. UI Component Design

### 8.1 Component Hierarchy

```
App.tsx
  |-- Sidebar (+ appBuilderOpen, + onOpenAppBuilder)
  |     |-- [Home Page] button
  |     |-- [Ralph Loop] button
  |     |-- [App Builder] button     <-- NEW
  |     |-- Projects section
  |     |-- Settings button
  |
  |-- EmptyState (+ onOpenAppBuilder, + 4th card)
  |
  |-- AppBuilderPage (React.lazy)    <-- NEW
        |-- Header (title + "New App" + "Open Existing" buttons)
        |-- App Grid
        |     |-- AppCard (x N)
        |
        |-- AppDetailPanel (selected app)
        |     |-- App info (name, path, template)
        |     |-- QRCodeDisplay (when running)
        |     |-- Start/Stop controls
        |     |-- "Open in Workspace" button
        |     |-- Metro log viewer
        |     |-- Error display
        |
        |-- CreateAppModal (when creating)
```

### 8.2 `AppBuilderPage.tsx` (~200 LOC)

```tsx
// Uses useExpoApps() hook for all state + callbacks
// Layout: header bar + two-column (grid left, detail right)
// When no app selected: detail panel shows "Select an app" placeholder
// When no apps exist: shows centered "Get Started" prompt
```

### 8.3 `AppCard.tsx` (~100 LOC)

```tsx
// Props: app: MobileApp, selected: boolean, onSelect, onRemove
// Shows: app name, template badge (blank/tabs/drawer), status dot
// Status colors: green=running, gray=idle, orange=starting, red=error
// Click: select. Right-click or delete button: remove
```

### 8.4 `AppDetailPanel.tsx` (~200 LOC)

```tsx
// Props: app: MobileApp, onStart, onStop, onOpenAsProject
// Sections:
//   1. Name + path + template
//   2. QR code (only when status='running' && expoUrl != null)
//   3. Start button (when idle/stopped/error) or Stop button (when running/starting)
//   4. "Open in Workspace" button -> creates Project, switches to workspace view
//   5. Metro log (scrollable <pre>, last ~50 lines from log string)
//   6. Error banner (when status='error', shows lastError)
```

### 8.5 `QRCodeDisplay.tsx` (~60 LOC)

```tsx
import { QRCodeSVG } from 'qrcode.react'

// Props: expoUrl: string
// Renders: 256px QR code SVG + URL text below + "Scan with Expo Go" instruction
// Centered with border, padding, themed background
```

### 8.6 `CreateAppModal.tsx` (~150 LOC)

```tsx
// Props: isOpen, onClose, onCreate
// State: name (string), template (ExpoTemplate), parentDir (string), creating (boolean)
// Fields:
//   - App name text input (with validation: non-empty, valid folder name chars)
//   - Template select (blank/tabs/drawer) with descriptions
//   - Location: shows parentDir path + "Choose Location" button
// Buttons: Cancel + Create (disabled while creating, shows loading spinner)
// Error display for scaffold failures
```

### 8.7 `useExpoApps.ts` Hook (~140 LOC)

Follow `useTickets.ts` pattern:

```typescript
export function useExpoApps() {
  const [mobileApps, setMobileApps] = useState<MobileApp[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)

  // Load on mount
  useEffect(() => {
    window.electronAPI.expo.getAll().then(apps => {
      setMobileApps(apps)
      setLoading(false)
    })
  }, [])

  // Subscribe to status broadcasts
  useEffect(() => {
    return window.electronAPI.expo.onStatusChanged((updatedApp) => {
      setMobileApps(prev => prev.map(a => a.id === updatedApp.id ? updatedApp : a))
    })
  }, [])

  // Callbacks: createApp, addApp, removeApp, startApp, stopApp, selectApp, openAsProject
  // All wrapped in useCallback
  // Optimistic updates where possible, fallback to full refresh on error

  const selectedApp = mobileApps.find(a => a.id === selectedAppId) ?? null

  return { mobileApps, loading, selectedApp, selectedAppId, ...callbacks }
}
```

### 8.8 CSS Styling

**`AppBuilderPage.css` (~200 LOC):**
```css
.app-builder { display: flex; flex-direction: column; height: 100%; }
.app-builder__header { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-lg); }
.app-builder__body { display: flex; flex: 1; overflow: hidden; }
.app-builder__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-md); padding: var(--space-lg); overflow-y: auto; flex: 1; }
.app-builder__detail { width: 380px; border-left: 1px solid var(--color-border); padding: var(--space-lg); overflow-y: auto; }
.app-builder__card { /* card styles with hover/active/selected states */ }
.app-builder__qr { display: flex; flex-direction: column; align-items: center; padding: var(--space-lg); border-radius: var(--radius-md); background: var(--color-bg-secondary); }
.app-builder__log { font-family: monospace; font-size: var(--font-size-xs); max-height: 200px; overflow-y: auto; }
/* Status dots: green (#22c55e), gray (#6b7280), orange (#f59e0b), red (#ef4444) */
```

**`CreateAppModal.css` (~80 LOC):**
- Follow `NewTicketModal.css` pattern
- Overlay + centered card + form fields + buttons

### 8.9 PhoneIcon SVG (used in Sidebar + EmptyState)

```tsx
function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="1" width="8" height="14" rx="2" />
      <line x1="7" y1="12" x2="9" y2="12" />
    </svg>
  )
}
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Data Layer + IPC)

**Goal:** Get the data pipeline working end-to-end with no UI.

1. Add types to `src/shared/types.ts` (MobileApp, ExpoTemplate, all request/response types)
2. Create `src/shared/expoValidators.ts` (manual type guards)
3. Add 10 channels + contracts + validators to `src/shared/ipcContracts.ts`
4. Create `src/services/mobileAppStore.ts` (JSON store)
5. Add `expo` namespace to `src/preload/index.ts`
6. Create `src/main/ipcExpo.ts` (handlers with store CRUD, stub expoService)
7. Wire into `src/main/ipc.ts` (init store, call setup, add dispose cleanup)
8. Create `tests/expoValidation.test.ts`
9. Run: `npm run lint && npm test && npm run typecheck`

### Phase 2: Expo Service (Process Management)

**Goal:** Metro dev server starts, stops, and reports URL.

1. Create `src/services/expoService.ts` (spawn, parse, kill)
2. Wire real service into `src/main/ipcExpo.ts`
3. Add cleanup to `disposeIPC()` (expoService.stopAll())
4. Test manually: invoke IPC, verify Metro starts, URL extracted, stop works
5. Run quality gates

### Phase 3: UI - Navigation + Page Shell

**Goal:** Navigation works, empty App Builder page renders.

1. Modify `src/renderer/App.tsx` (appBuilderOpen state, React.lazy, routing)
2. Modify `src/renderer/components/Sidebar.tsx` (PhoneIcon, new button, new props)
3. Modify `src/renderer/components/EmptyState.tsx` (4th card, onOpenAppBuilder)
4. Create `src/renderer/components/appbuilder/AppBuilderPage.tsx` (skeleton)
5. Create `src/renderer/styles/AppBuilderPage.css`
6. Run quality gates

### Phase 4: UI - Full Feature

**Goal:** Create apps, start Metro, display QR code, manage apps.

1. Create `src/renderer/hooks/useExpoApps.ts`
2. Create `src/renderer/components/appbuilder/AppCard.tsx`
3. Create `src/renderer/components/appbuilder/AppDetailPanel.tsx`
4. Create `src/renderer/components/appbuilder/QRCodeDisplay.tsx`
5. Create `src/renderer/components/appbuilder/CreateAppModal.tsx`
6. Create `src/renderer/styles/CreateAppModal.css`
7. Install dependency: `npm install qrcode.react`
8. Full end-to-end testing
9. Run quality gates

### Phase 5: Polish + Integration

**Goal:** Bridge to workspace, error handling, keyboard shortcut.

1. Implement "Open in Workspace" flow (creates Project from MobileApp path)
2. Add `Cmd+M` keyboard shortcut for App Builder toggle
3. Port conflict detection and auto-increment
4. Error state UI (missing Expo CLI, port conflicts, scaffold failures)
5. Metro config injection: write `maxWorkers: 2` to metro.config.js during scaffold
6. Final: `npm run lint && npm test && npm run bench`

---

## 10. Files Summary

### New Files (13 files, ~1,810 LOC)

| File | LOC | Purpose |
|------|-----|---------|
| `src/shared/expoValidators.ts` | ~80 | Runtime type guards |
| `src/services/mobileAppStore.ts` | ~120 | JSON store for MobileApp[] |
| `src/services/expoService.ts` | ~250 | Metro process lifecycle |
| `src/main/ipcExpo.ts` | ~130 | IPC handler registration |
| `src/renderer/components/appbuilder/AppBuilderPage.tsx` | ~200 | Main page |
| `src/renderer/components/appbuilder/AppCard.tsx` | ~100 | Grid card |
| `src/renderer/components/appbuilder/AppDetailPanel.tsx` | ~200 | Detail + QR + controls |
| `src/renderer/components/appbuilder/QRCodeDisplay.tsx` | ~60 | QR code SVG |
| `src/renderer/components/appbuilder/CreateAppModal.tsx` | ~150 | Create app modal |
| `src/renderer/styles/AppBuilderPage.css` | ~200 | Page + card + detail styles |
| `src/renderer/styles/CreateAppModal.css` | ~80 | Modal styles |
| `src/renderer/hooks/useExpoApps.ts` | ~140 | React hook for app state |
| `tests/expoValidation.test.ts` | ~100 | Validator tests |

### Modified Files (8 files)

| File | Change |
|------|--------|
| `src/shared/types.ts` | +60 LOC: MobileApp type, request/response types |
| `src/shared/ipcContracts.ts` | +40 LOC: 10 channels, contracts, validators |
| `src/preload/index.ts` | +50 LOC: expo namespace in ElectronAPI |
| `src/main/ipc.ts` | +10 LOC: store init, setupExpoIPC, dispose |
| `src/renderer/App.tsx` | +30 LOC: appBuilderOpen state, routing |
| `src/renderer/components/Sidebar.tsx` | +15 LOC: PhoneIcon, new button |
| `src/renderer/components/EmptyState.tsx` | +10 LOC: 4th card |
| `package.json` | +1 dep: qrcode.react |

### New Dependency

- `qrcode.react` ^4.0.1 (~15KB, SVG QR code React component)

---

## 11. Performance Optimizations

1. **Metro limited to 2 workers** (`maxWorkers: 2` in metro.config.js) - prevents CPU starvation
2. **Memory cap:** `NODE_OPTIONS='--max-old-space-size=4096'` - prevents OOM
3. **Log truncation** at 10,000 chars - prevents memory bloat from Metro verbose output
4. **React.lazy** for AppBuilderPage - not included in initial bundle
5. **QR as SVG** via qrcode.react - no canvas overhead, scales cleanly
6. **Push-based status updates** - process event callbacks, not polling (unlike Claude activity)
7. **Process group kill** (`detached: true` + `-pid`) - prevents orphan Metro worker processes
8. **Single Metro per app** - duplicate start prevention via isRunning() guard
9. **Debounced store writes** (500ms) - same as all other stores
10. **Port auto-increment** - prevents port conflicts between multiple running apps

---

## 12. Verification Plan

### Manual Testing Checklist

1. Click "App Builder" in sidebar -> page renders with empty state
2. Click "Build a Mobile App" on homepage -> navigates to App Builder
3. Click "New App" -> modal opens
4. Select "blank" template, name "test-app", choose location -> creates Expo project
5. Verify `app.json` exists in created directory
6. Click "Start" on the app -> Metro starts, status shows "starting" then "running"
7. QR code appears with `exp://` URL
8. Scan QR with Expo Go on phone -> app loads and renders on device
9. Edit a file in the project -> Metro hot-reloads on phone automatically
10. Click "Stop" -> Metro shuts down, QR disappears, status shows "stopped"
11. Click "Open in Workspace" -> project appears in sidebar with full terminal/Claude access
12. Click "Open Existing" -> folder dialog opens, select existing Expo project -> adds to list
13. Close IDE -> all Metro processes killed cleanly (no orphan processes)
14. Reopen IDE -> all apps still in list with "idle" status

### Automated Testing

```bash
cd apps/desktop
npm run lint        # ESLint + Prettier check
npm test            # Vitest (includes expoValidation.test.ts)
npm run typecheck   # tsc --noEmit for main + renderer
npm run bench       # benchmarks still pass (no regression)
```

### Edge Cases to Test

- Create app when Expo CLI not installed -> helpful error message
- Start app when port 8081 is in use -> auto-increments to next port
- Start same app twice -> prevented (isRunning guard)
- Stop app during "starting" phase -> kills process cleanly
- Network changes while Metro running -> QR code stays valid (LAN IP based)
- Very long app names -> truncated in UI, full path works
- Open existing non-Expo folder -> validation error (no app.json)
