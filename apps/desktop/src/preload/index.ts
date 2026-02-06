/**
 * Preload Assembler
 *
 * Imports namespace builders from domain modules, assembles
 * the full ElectronAPI object, and exposes it to the renderer
 * via contextBridge. This is the single entry point for the
 * preload script — electron-vite bundles all imports into one CJS file.
 */

import { contextBridge } from 'electron'
import type { ElectronAPI } from './types'
import { buildProjectsAPI } from './api/projects'
import { buildTerminalAPI } from './api/terminal'
import { buildTicketsAPI, buildPrdAPI, buildRalphAPI } from './api/tickets'
import { buildExpoAPI, buildWordVomitAPI } from './api/expo'
import {
  buildTopLevelAPI,
  buildThemeAPI,
  buildNotifyAPI,
  buildGitAPI,
  buildShellAPI,
  buildPresetsAPI,
  buildBrowserAPI,
  buildClaudeAPI,
  buildSettingsAPI,
  buildFileOpsAPI,
  buildIdeasAPI,
  buildPortsAPI,
} from './api/misc'

const electronAPI: ElectronAPI = {
  ...buildTopLevelAPI(),
  projects: buildProjectsAPI(),
  theme: buildThemeAPI(),
  terminal: buildTerminalAPI(),
  notify: buildNotifyAPI(),
  git: buildGitAPI(),
  shell: buildShellAPI(),
  presets: buildPresetsAPI(),
  browser: buildBrowserAPI(),
  claude: buildClaudeAPI(),
  settings: buildSettingsAPI(),
  fileOps: buildFileOpsAPI(),
  tickets: buildTicketsAPI(),
  prd: buildPrdAPI(),
  ralph: buildRalphAPI(),
  expo: buildExpoAPI(),
  wordVomit: buildWordVomitAPI(),
  ideas: buildIdeasAPI(),
  ports: buildPortsAPI(),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Re-export the interface so renderer code can import the type
export type { ElectronAPI } from './types'
