/**
 * Port Service — OS-level port management for the IDE.
 *
 * Provides real TCP port checking via Node.js `net` module,
 * sequential port scanning, and an in-memory ownership registry
 * so the renderer knows which project owns which port.
 */

import { createServer, type Server } from 'node:net'

/** Map from port number to the projectId that owns it */
const portOwners = new Map<number, string>()

/**
 * Check if a port is currently in use at the OS level.
 *
 * Creates a temporary TCP server on the port. If the listen
 * succeeds, the port is free. If it fails with EADDRINUSE,
 * the port is occupied.
 */
export function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server: Server = createServer()

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true)
      } else {
        // Other errors (e.g., EACCES) — treat as in use / unavailable
        resolve(true)
      }
    })

    server.once('listening', () => {
      server.close(() => resolve(false))
    })

    server.listen(port, '127.0.0.1')
  })
}

/**
 * Find the first available port starting from basePort.
 *
 * Checks ports sequentially: basePort, basePort+1, basePort+2, ...
 * Stops after maxAttempts (default 20) or when a free port is found.
 * Throws if no available port is found within the range.
 */
export async function findAvailablePort(
  basePort: number,
  maxAttempts: number = 20,
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = basePort + i
    if (candidate > 65535) break
    const inUse = await isPortInUse(candidate)
    if (!inUse) return candidate
  }
  throw new Error(
    `No available port found in range ${basePort}-${basePort + maxAttempts - 1}`,
  )
}

/** Record that a project owns a port. */
export function registerPort(projectId: string, port: number): void {
  portOwners.set(port, projectId)
}

/** Release a port (only if owned by the given project). */
export function unregisterPort(projectId: string, port: number): void {
  if (portOwners.get(port) === projectId) {
    portOwners.delete(port)
  }
}

/** Return the projectId that owns a port, or null. */
export function getPortOwner(port: number): string | null {
  return portOwners.get(port) ?? null
}

/** Return all ports owned by a project. */
export function getProjectPorts(projectId: string): number[] {
  const ports: number[] = []
  for (const [port, owner] of portOwners) {
    if (owner === projectId) ports.push(port)
  }
  return ports
}

/** Release all ports for a project. */
export function unregisterAllForProject(projectId: string): void {
  for (const [port, owner] of portOwners) {
    if (owner === projectId) portOwners.delete(port)
  }
}
