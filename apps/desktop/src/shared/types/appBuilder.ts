// ── App Builder / Expo ──────────────────────────────────────

export type ExpoTemplate = 'blank' | 'tabs' | 'drawer'
export const EXPO_TEMPLATES: readonly ExpoTemplate[] = ['blank', 'tabs', 'drawer'] as const

export type MobileAppStatus = 'idle' | 'starting' | 'running' | 'error' | 'stopped'
export const MOBILE_APP_STATUSES: readonly MobileAppStatus[] = [
  'idle',
  'starting',
  'running',
  'error',
  'stopped',
] as const

export interface MobileApp {
  id: string
  name: string
  path: string
  template: ExpoTemplate
  status: MobileAppStatus
  expoUrl: string | null
  /** Web preview URL for the IDE's iPhone frame (http://localhost:XXXX) */
  webUrl: string | null
  metroPort: number
  addedAt: number
  lastError: string | null
  /** Whether this app has a .prd/ folder with PRD content */
  hasPRD?: boolean
  /** Linked project tab ID when opened as a mobile workspace tab */
  projectId: string | null
}

export interface CreateMobileAppRequest {
  name: string
  template: ExpoTemplate
  parentDir: string
  /** Optional PRD content to save to .prd/prd.md */
  prdContent?: string
  /** Optional palette ID from mobilePalettes */
  paletteId?: string
  /** Optional reference image paths to copy into .prd/images/ */
  imagePaths?: string[]
}

export interface AddMobileAppRequest {
  path: string
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
  /** Web preview URL for the IDE's iPhone frame */
  webUrl: string | null
  log: string
  lastError: string | null
}

export interface OpenMobileAppAsProjectRequest {
  appId: string
}

// ── Template Cache ──────────────────────────────────────────

export interface TemplateStatus {
  template: ExpoTemplate
  ready: boolean
  extractedAt: number | null
}

export interface TemplateStatusResponse {
  templates: TemplateStatus[]
  allReady: boolean
}

// ── Mobile PRD ──────────────────────────────────────────────

export interface MobileAppPRDConfig {
  prdContent: string
  paletteId: string | null
  imagePaths: string[]
}

export interface GenerateMobilePRDRequest {
  appDescription: string
  template: ExpoTemplate
  paletteId?: string
  imagePaths?: string[]
}

export interface GenerateMobilePRDResponse {
  content: string
}

export interface SavePRDRequest {
  appPath: string
  prdContent: string
  paletteId: string | null
}

export interface CopyPRDImagesRequest {
  appPath: string
  imagePaths: string[]
}

export interface APIKeyStatusResponse {
  hasOpenAI: boolean
  hasClaude: boolean
  hasAny: boolean
}

// ── Word Vomit PRD ──────────────────────────────────────────

export interface GenerateWordVomitPRDRequest {
  rawIdea: string
}

export interface GenerateWordVomitPRDResponse {
  content: string
}

// ── Mobile App Palette ──────────────────────────────────────

export interface MobileAppPalette {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
  }
}

// ── iPhone Device Presets ───────────────────────────────────

export interface IPhoneDevice {
  id: string
  name: string
  width: number
  height: number
}

export const IPHONE_DEVICES: readonly IPhoneDevice[] = [
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667 },
  { id: 'iphone-14', name: 'iPhone 14', width: 390, height: 844 },
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', width: 393, height: 852 },
  { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', width: 430, height: 932 },
  { id: 'iphone-16', name: 'iPhone 16', width: 393, height: 852 },
  { id: 'ipad-mini', name: 'iPad Mini', width: 744, height: 1133 },
] as const
