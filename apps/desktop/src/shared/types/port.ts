// ── Port Service Types ─────────────────────────────────────────

export interface PortCheckRequest {
  port: number
}

export interface PortCheckResponse {
  inUse: boolean
}

export interface PortFindAvailableRequest {
  basePort: number
}

export interface PortFindAvailableResponse {
  port: number
}

export interface PortRegisterRequest {
  projectId: string
  port: number
}

export interface PortUnregisterRequest {
  projectId: string
  port: number
}

export interface PortGetOwnerRequest {
  port: number
}

export interface PortGetOwnerResponse {
  projectId: string | null
}
