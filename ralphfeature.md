# Ralph Loop Kanban Board Integration Plan

## Simple Version
Right now the "Ralph Loop" button in CodingIDE is just a label that does nothing. We're turning it into a full Kanban board page -- like a wall of sticky notes organized in columns (Backlog, Up Next, In Review, In Progress, Testing, Completed). You drag tickets between columns. When a ticket hits "In Progress," Claude goes to work writing code in the background, and you see a cool swirling animation showing it's working. You can click "Watch Live" to peek at what it's doing. When it finishes, the ticket moves to "Testing" and you can click it to open the finished code right in your project tabs -- with a little badge so you remember it came from Ralph Loop.

## Technical Version
Integrates ralphblaster's Kanban workflow into CodingIDE's Electron IPC architecture. Adds 14 new IPC channels, 4 main-process services, 8 renderer components, 2 custom hooks, and modifies 9 existing files. Uses OpenAI API for PRD generation, Claude CLI for execution, and bridges completed tickets into existing project tabs via `projectStore.add()`.

---

## User Decisions

- **PRD generation**: OpenAI API key (stored in Settings page)
- **Project tabs**: Completed tickets open in the same project list with a "Ralph Loop" origin badge
- **Execution**: Background process with animated status indicator + "Watch Live" button to open terminal view
- **Font awareness**: When user changes fonts, the Kanban board and all ticket UI respects the change immediately
- **Drag & drop quality**: Must be butter-smooth with no glitches -- proper `will-change`, GPU-accelerated transforms, zero layout thrash
- **Worktree location**: User picks the folder in Finder where the worktree is created BEFORE Ralph executes

---

## Phase 1: Data Layer Foundation

### New Types (`src/shared/types.ts`)
Add Kanban types: `TicketStatus`, `TicketType`, `TicketPriority`, `Ticket`, `PRD`, `HistoryEvent`, plus request/response interfaces for all IPC channels.

```
TicketStatus: 'backlog' | 'up_next' | 'in_review' | 'in_progress' | 'in_testing' | 'completed'
VALID_TRANSITIONS: backlog->up_next, up_next->in_review|backlog, in_review->in_progress|backlog, in_progress->in_testing, in_testing->completed|in_progress
```

Ticket links to CodingIDE's existing `Project.id` via `projectId` field. Also stores `worktreeBasePath` (user-chosen Finder location) on the ticket.

### New Service: `src/services/ticketStore.ts` (~200 LOC)
JSON persistence at `{userData}/tickets.json`. Follows `projectStore.ts` pattern: atomic write-to-temp + rename. Methods: `getAll()`, `create()`, `update()`, `delete()`, `transition()`, `reorder()`.

### New Validators: `src/shared/ticketValidators.ts` (~150 LOC)
Runtime type guards for all ticket IPC payloads. Keeps `ipcContracts.ts` from exceeding 300 LOC.

### New IPC Channels (14 total, added to `src/shared/ipcContracts.ts`)

| Channel | Request | Response |
|---------|---------|----------|
| `ipc:ticket-get-all` | void | `Ticket[]` |
| `ipc:ticket-create` | `CreateTicketRequest` | `Ticket` |
| `ipc:ticket-update` | `UpdateTicketRequest` | void |
| `ipc:ticket-delete` | string | void |
| `ipc:ticket-transition` | `TransitionTicketRequest` | void |
| `ipc:ticket-reorder` | `ReorderTicketRequest` | `Ticket[]` |
| `ipc:prd-generate` | `GeneratePRDRequest` | `PRD` |
| `ipc:prd-approve` | `ApprovePRDRequest` | void |
| `ipc:prd-reject` | `ApprovePRDRequest` | void |
| `ipc:ralph-execute` | `RalphExecuteRequest` | void |
| `ipc:ralph-status` | `RalphStatusRequest` | `RalphStatusResponse` |
| `ipc:ralph-stop` | `RalphStopRequest` | void |
| `ipc:ralph-choose-worktree-dir` | void | `string \| null` |
| `ipc:ticket-open-as-project` | `OpenTicketAsProjectRequest` | `Project` |

The new `ipc:ralph-choose-worktree-dir` channel opens a native Finder folder picker dialog (`dialog.showOpenDialog({ properties: ['openDirectory'] })`) so the user can choose where the worktree gets created before Ralph executes.

### Preload API (`src/preload/index.ts`)
Add three new namespaces to `ElectronAPI`: `tickets`, `prd`, `ralph` -- each with typed methods using `safeInvoke()`.

### Handler Registration
- `src/main/ipc.ts`: Register ticket CRUD handlers
- `src/main/ipcRalph.ts` (new, ~150 LOC): Extract Ralph + PRD handlers to keep `ipc.ts` under 300 LOC

### Tests
Add validator tests to `tests/ipcValidation.test.ts` for all 14 new channels.

### Verify
```bash
cd apps/desktop && npm run lint && npm test && npm run typecheck
```

---

## Phase 2: Basic Kanban UI

### Install dependency
```bash
cd apps/desktop && npm install @hello-pangea/dnd
```

### New Components (all in `src/renderer/components/kanban/`)

**KanbanPage.tsx** (~150 LOC) -- Top-level page with:
- Header: "Ralph Loop" title + "New Ticket" button + project filter dropdown
- KanbanBoard
- Conditional modals (NewTicketModal, TicketDetailModal)

**KanbanBoard.tsx** (~80 LOC) -- `DragDropContext` wrapper, maps `COLUMN_ORDER` to columns.

**KanbanColumn.tsx** (~120 LOC) -- `Droppable` zone per status. Column header with count badge. Quick-add input for Backlog column.

**TicketCard.tsx** (~150 LOC) -- `Draggable` card showing: title, project tag, type badge, priority dot, PRD status, Ralph status badge.

### Font Awareness
All Kanban components inherit the app's `--font-sans` CSS custom property. When the user changes fonts in Settings, the board/cards/modals update instantly because they use `font-family: var(--font-sans)` inherited from `<html>`. No extra wiring needed -- the existing font system in `useTheme` sets `--font-sans` on the document root and all new CSS uses `inherit` or `var(--font-sans)` explicitly. The plan is to ensure:
- Every text element in KanbanBoard.css uses `font-family: inherit` (not hardcoded fonts)
- Modal inputs and textareas use `font-family: var(--font-sans)` to match
- Card titles, column headers, badges all flow from the root font variable

### New Hook: `src/renderer/hooks/useTickets.ts` (~200 LOC)
Manages ticket CRUD via `window.electronAPI.tickets.*`. Listens for `ticket:status-changed` broadcasts.

### New CSS: `src/renderer/styles/KanbanBoard.css` (~300 LOC)
Uses CodingIDE's CSS custom properties (`var(--color-bg-secondary)`, `var(--color-accent)`, etc.) for automatic palette compatibility across all 14 themes. All typography uses `font-family: inherit` to respect the active font selection.

### Modified Files

**`App.tsx`** -- Add `kanbanOpen` state. Navigation becomes:
```
settingsOpen ? SettingsPage
: kanbanOpen ? KanbanPage
: activeProject ? ProjectWorkspace
: EmptyState
```

**`Sidebar.tsx`** -- Add "Ralph Loop" button in `sidebar-actions` section (between Home and Automations). New prop: `onOpenKanban`. Active state when `kanbanOpen` is true.

**`EmptyState.tsx`** -- Wire Ralph Loop button's `onClick` to new `onOpenKanban` prop.

### Verify
Open the app, click Ralph Loop button in sidebar or empty state, see the Kanban board with 6 empty columns. Change font in Settings, confirm board text updates.

---

## Phase 3: Smooth Drag & Drop + Ticket CRUD

### Drag & Drop Performance Requirements

The drag-and-drop MUST be butter-smooth. Here's the specific implementation approach:

**GPU-accelerated transforms only:**
```css
.ticket-card {
  will-change: transform;
  transform: translateZ(0); /* Force GPU layer */
}
.ticket-card[data-rfd-draggable-context-id] {
  /* While dragging - no layout-triggering properties */
  transition: transform 0.15s cubic-bezier(0.2, 0, 0, 1),
              box-shadow 0.15s ease;
}
```

**Zero layout thrash:**
- Cards use fixed `min-height` to prevent reflow when neighbors move
- Column drop zones use `min-height: 100%` so they never collapse during drag
- Placeholder element (the space where a card will land) uses `height` from `@hello-pangea/dnd`'s provided snapshot, not calculated on the fly

**Smooth visual feedback:**
- Dragged card: `transform: scale(1.03) rotate(1.5deg)` + elevated `box-shadow` -- subtle, not jarring
- Target column: thin accent-color ring fades in via `opacity` transition (no border-width changes that cause reflow)
- Other cards: slide smoothly via the library's built-in `transform: translate()` animations
- Drop: card snaps to place with a brief `transform` ease-out (the library handles this)

**Prevent jank sources:**
- No `overflow: hidden` on columns during drag (causes scroll jumps)
- No re-sorting the ticket array during drag -- only commit the new order in `handleDragEnd`
- Use `React.memo` on `TicketCard` to prevent unnecessary re-renders of non-dragged cards
- `KanbanColumn` wrapped in `React.memo` with shallow equality check on tickets array

### Implement in KanbanBoard
- `handleDragEnd`: validate destination, check `VALID_TRANSITIONS`, call `useTickets.reorderTickets()`
- Optimistic update: move the card in local state immediately, persist via IPC in background

### NewTicketModal.tsx (~200 LOC)
Form: title, description, acceptance criteria (dynamic list), project selector (dropdown of existing CodingIDE projects), type selector, priority selector.

### TicketDetailModal.tsx (~250 LOC)
Full detail view with tabs/sections: Description, Acceptance Criteria, PRD (Phase 4), History timeline. Action buttons based on `VALID_TRANSITIONS[ticket.status]`.

### New CSS: `src/renderer/styles/TicketDetail.css` (~150 LOC), `src/renderer/styles/NewTicket.css` (~100 LOC)

### Verify
Create tickets, drag between valid columns -- should be 60fps smooth with no stuttering. Open detail view, edit fields. Test with 20+ tickets to ensure performance holds.

---

## Phase 4: PRD Generation (OpenAI)

### New Service: `src/services/prdService.ts` (~120 LOC)
Uses OpenAI API (`fetch` to `https://api.openai.com/v1/chat/completions`). Takes ticket title/description/criteria, returns structured PRD markdown. API key read from `{userData}/settings.json`.

### Settings Page Update (`src/renderer/components/SettingsPage.tsx`)
Add "OpenAI API Key" input field in a new "Integrations" section. Persisted via new IPC channel `ipc:set-openai-key` / `ipc:get-openai-key`. Password-masked input with a "Test Connection" button.

### New Service: `src/services/settingsStore.ts` (~80 LOC)
JSON persistence for app settings (starting with `openaiApiKey`).

### PRDViewer.tsx (~120 LOC)
Rendered inside TicketDetailModal. Shows PRD markdown content with "Approve" / "Reject" / "Regenerate" buttons. Approve moves ticket from `up_next` to `in_review`.

### Verify
Create ticket, click "Generate PRD," see markdown content appear, approve it, ticket moves to In Review.

---

## Phase 5: Ralph Execution + Live View

### Worktree Location Picker

Before Ralph executes, the user MUST choose where the worktree gets created. This happens when a ticket transitions to `in_progress`:

1. Transition handler detects `newStatus === 'in_progress'`
2. Calls `window.electronAPI.ralph.chooseWorktreeDir()` -- this opens a native Finder folder picker via `dialog.showOpenDialog({ properties: ['openDirectory'], title: 'Choose where to create the Ralph worktree' })`
3. If user cancels the picker, the transition is aborted (ticket stays in `in_review`)
4. If user picks a folder, the path is stored on the ticket as `worktreeBasePath`
5. Worktree is created at `{worktreeBasePath}/{ticket-title-slugified}/` (e.g., `/Users/hi-vo/Desktop/my-feature/`)
6. This way the user always knows exactly where the code will end up

### New Service: `src/services/ralphService.ts` (~250 LOC)
- **createWorktree(ticket)**: Uses `ticket.worktreeBasePath` (user-chosen folder) to run `git init` + scaffold the project structure in that location
- **execute(ticket)**: Spawns `claude --print --dangerously-skip-permissions` with PRD as input, CWD = worktree path
- **getStatus(ticketId)**: Checks if process is alive, reads iteration count from log file
- **stop(ticketId)**: Kills process group (SIGTERM, SIGKILL fallback after 500ms)
- **cleanup(ticketId)**: Removes worktree directory
- **Broadcasts**: Periodically (every 3s) checks all running processes and sends `ralph:status-changed` via `webContents.send`

### RalphStatusBadge.tsx (~80 LOC)
Animated component shown on TicketCard when status is `in_progress`:
- **Swirling gradient animation** (CSS `@keyframes` with `conic-gradient` rotating border, matching ralphblaster's visual style)
- **Iteration counter** badge (e.g., "Step 3")
- **"Watch Live" button** that opens the ticket's worktree in a terminal pane

### New Hook: `src/renderer/hooks/useRalph.ts` (~100 LOC)
Listens for `ralph:status-changed` IPC broadcasts. Maintains `Map<ticketId, RalphState>` with running/completed/iteration fields.

### "Watch Live" Mechanism
When user clicks "Watch Live":
1. Calls `handleOpenTicketAsProject(ticketId)` to open worktree as project tab
2. Sets `activeProjectId` to the new project
3. ProjectWorkspace opens with TerminalGrid
4. Auto-runs `tail -f .claude/ralph-output.log` in the first terminal pane (via `gridRef.runCommand()`)

### Auto-transition
When Ralph finishes (process exits + "RALPHBLASTER COMPLETE" in log), `ralphService` broadcasts completion. `useRalph` hook detects it, calls `transition(ticketId, 'in_testing')`.

### New CSS animation for swirling gradient
```css
.ralph-executing {
  position: relative;
}
.ralph-executing::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: var(--radius-lg);
  background: conic-gradient(from var(--angle), var(--color-accent), var(--color-success), var(--color-warning), var(--color-accent));
  animation: ralph-spin 3s linear infinite;
  z-index: -1;
}
@property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes ralph-spin { to { --angle: 360deg; } }
```

### Verify
Move ticket to In Progress, get Finder dialog to choose location, see swirling animation on card, click "Watch Live" to see terminal output, wait for completion, ticket auto-moves to Testing.

---

## Phase 6: Open in Project Tab Bridge

### "Open in IDE" button on TicketCard + TicketDetailModal
Visible when `ticket.status === 'in_testing' || ticket.status === 'completed'`.

### IPC handler for `ipc:ticket-open-as-project`
1. Reads ticket to get `worktreePath` (which is inside the user-chosen `worktreeBasePath`)
2. Calls `projectStore.add({ path: worktreePath })`
3. Returns the `Project` object

### Ralph Loop Origin Badge
When a project is added via `ticket-open-as-project`:
- Add `origin?: 'ralph-loop'` and `ticketId?: string` to the `Project` type in `shared/types.ts`
- `projectStore.add()` sets these fields when called from the Ralph handler
- Sidebar project item shows a small loop icon badge (dimmed) next to the project name when `project.origin === 'ralph-loop'`
- Tooltip: "Created by Ralph Loop"
- The badge uses the same LoopIcon SVG from EmptyState.tsx, scaled down to 12x12

### App.tsx bridge callback
```typescript
const handleOpenTicketAsProject = async (ticketId: string) => {
  const project = await window.electronAPI.tickets.openAsProject({ ticketId })
  await loadProjects()
  setActiveProjectId(project.id)
  setKanbanOpen(false)
  setSettingsOpen(false)
}
```

### Verify
Complete a ticket, click "Open in IDE," project appears in sidebar with loop badge, workspace opens with TerminalGrid/browser pane.

---

## Phase 7: Polish

- Error toasts for failed operations (reuse existing `ToastContainer`)
- Loading spinners for PRD generation
- Confirmation dialog before deleting tickets
- Keyboard shortcuts: `Cmd+L` to toggle Kanban board
- Empty board state with helpful onboarding text
- Font change notification: when user changes font in Settings, show a brief toast "Font changed to {fontName}" so they're aware the change applied
- Run quality gates: `npm run lint && npm test && npm run bench && npm run typecheck`

---

## Files Modified (9)

| File | Change |
|------|--------|
| `src/shared/types.ts` | +130 LOC: Kanban types, request/response interfaces, `origin`/`ticketId` on Project, `worktreeBasePath` on Ticket |
| `src/shared/ipcContracts.ts` | +14 channel constants, type contracts, validator imports |
| `src/preload/index.ts` | +65 LOC: `tickets`, `prd`, `ralph` namespaces on ElectronAPI |
| `src/main/ipc.ts` | +20 LOC: register ticket handlers, delegate Ralph to `ipcRalph.ts` |
| `src/renderer/App.tsx` | +35 LOC: `kanbanOpen` state, KanbanPage rendering, bridge callback |
| `src/renderer/components/Sidebar.tsx` | +15 LOC: Ralph Loop button, `onOpenKanban` prop, origin badge on project items |
| `src/renderer/components/EmptyState.tsx` | +5 LOC: wire onClick, add `onOpenKanban` prop |
| `src/renderer/components/SettingsPage.tsx` | +40 LOC: OpenAI API key input, font change toast |
| `tests/ipcValidation.test.ts` | +110 LOC: validator tests for 14 new channels |

## Files Created (19)

| File | LOC | Purpose |
|------|-----|---------|
| `src/services/ticketStore.ts` | ~200 | Ticket JSON persistence (atomic writes) |
| `src/services/ralphService.ts` | ~250 | Worktree creation, Claude process spawn, status polling |
| `src/services/prdService.ts` | ~120 | OpenAI API for PRD generation |
| `src/services/settingsStore.ts` | ~80 | App settings persistence (API keys) |
| `src/shared/ticketValidators.ts` | ~150 | Runtime type guards for ticket IPC payloads |
| `src/main/ipcRalph.ts` | ~150 | Ralph/PRD/worktree IPC handlers |
| `src/renderer/components/kanban/KanbanPage.tsx` | ~150 | Top-level Kanban page |
| `src/renderer/components/kanban/KanbanBoard.tsx` | ~80 | DnD board wrapper |
| `src/renderer/components/kanban/KanbanColumn.tsx` | ~120 | Single droppable column |
| `src/renderer/components/kanban/TicketCard.tsx` | ~150 | Draggable ticket card (React.memo for perf) |
| `src/renderer/components/kanban/TicketDetailModal.tsx` | ~250 | Full ticket detail overlay |
| `src/renderer/components/kanban/NewTicketModal.tsx` | ~200 | Create ticket form |
| `src/renderer/components/kanban/PRDViewer.tsx` | ~120 | PRD display/approve/reject |
| `src/renderer/components/kanban/RalphStatusBadge.tsx` | ~80 | Swirling gradient execution indicator |
| `src/renderer/hooks/useTickets.ts` | ~200 | Ticket CRUD hook |
| `src/renderer/hooks/useRalph.ts` | ~100 | Ralph execution state hook |
| `src/renderer/styles/KanbanBoard.css` | ~300 | Board, column, card styles (GPU-accelerated DnD) |
| `src/renderer/styles/TicketDetail.css` | ~150 | Detail modal styles |
| `src/renderer/styles/NewTicket.css` | ~100 | New ticket form styles |

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| IPC channel explosion (14 new) | Validators extracted to `ticketValidators.ts`; handlers split to `ipcRalph.ts` |
| `preload/index.ts` exceeding 300 LOC | Namespaced structure keeps it scannable (~325 LOC total) |
| Process zombies from Ralph | SIGTERM -> 500ms -> SIGKILL pattern from `terminalService.ts`; cleanup on app quit |
| CSP blocking @hello-pangea/dnd | Library does not use eval/inline scripts; verified compatible |
| Git worktree failures | User picks directory in Finder first; validate path exists before creating |
| Drag & drop jank | GPU-accelerated transforms only, React.memo on cards/columns, no layout-triggering CSS during drag |
| Font not applying to new components | All CSS uses `font-family: inherit` or `var(--font-sans)`, tested with all 13 font stacks |

---

## Improvements Over Ralphblaster

1. **Push-based status** (IPC broadcast) instead of 5s HTTP polling -- instant updates
2. **Integrated terminal** for "Watch Live" instead of external Ghostty window
3. **No Express backend** -- main process handles everything directly
4. **Unified project model** -- tickets link to existing CodingIDE projects
5. **Theme-aware** -- board inherits active palette via CSS custom properties
6. **Font-aware** -- board respects user's font selection, updates live
7. **Atomic persistence** -- crash-safe JSON writes, no localStorage fallback
8. **OpenAI for PRDs** -- user's preferred model for spec generation
9. **Origin tracking** -- sidebar badge shows which projects came from Ralph Loop
10. **User-chosen worktree location** -- Finder dialog lets you pick where code goes, no hidden directories
11. **Smooth drag & drop** -- GPU-accelerated, React.memo optimized, zero layout thrash
12. **Font change notification** -- toast confirms when font switches so user is aware
