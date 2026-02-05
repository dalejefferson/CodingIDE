/**
 * Expo / Metro Dev Server lifecycle service.
 *
 * Manages spawning, monitoring, and stopping Metro dev servers for
 * mobile app projects. Follows the same child_process pattern as
 * ralphService.ts: detached spawn, truncated log, process group kill.
 *
 * Project creation is handled by TemplateCacheService — this service
 * only manages Metro lifecycle (start / stop / status).
 */

import { spawn, type ChildProcess } from 'node:child_process'
import * as net from 'node:net'
import type { MobileApp, MobileAppStatus, ExpoStatusResponse } from '@shared/types'
import { logger } from '@services/logger'

// ── Types ──────────────────────────────────────────────────────

interface ExpoProcess {
  process: ChildProcess | null
  running: boolean
  log: string
  expoUrl: string | null
  webUrl: string | null
  metroPort: number
}

type ExpoStatusCallback = (
  appId: string,
  status: MobileAppStatus,
  expoUrl: string | null,
  webUrl: string | null,
  error: string | null,
) => void

// ── Constants ──────────────────────────────────────────────────

const MAX_LOG_LENGTH = 10_000
const KILL_GRACE_MS = 5_000

// ── Helpers ────────────────────────────────────────────────────

function truncateLog(log: string, max: number = MAX_LOG_LENGTH): string {
  if (log.length <= max) return log
  return log.slice(-max)
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close()
      resolve(true)
    })
    server.listen(port, '0.0.0.0')
  })
}

async function findAvailablePort(start: number = 8081): Promise<number> {
  for (let port = start; port < start + 100; port++) {
    if (await isPortAvailable(port)) return port
  }
  throw new Error('No available ports in range')
}

// ── Service ────────────────────────────────────────────────────

export class ExpoService {
  private processes = new Map<string, ExpoProcess>()
  private onStatusChange: ExpoStatusCallback

  constructor(onStatusChange: ExpoStatusCallback) {
    this.onStatusChange = onStatusChange
  }

  /**
   * Start the Metro dev server for a mobile app.
   * Includes --web flag to enable web preview alongside native.
   */
  async start(app: MobileApp): Promise<void> {
    // Prevent duplicate starts
    if (this.isRunning(app.id)) {
      logger.warn('Expo: already running, ignoring start', { appId: app.id })
      return
    }

    // Find available port
    const port = await findAvailablePort(app.metroPort)

    this.onStatusChange(app.id, 'starting', null, null, null)

    const child = spawn('npx', ['expo', 'start', '--lan', '--web', '--port', String(port)], {
      cwd: app.path,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
      env: {
        ...process.env,
        CI: '1',
        NODE_OPTIONS: '--max-old-space-size=4096',
      },
    })

    const entry: ExpoProcess = {
      process: child,
      running: true,
      log: '',
      expoUrl: null,
      webUrl: null,
      metroPort: port,
    }

    this.processes.set(app.id, entry)
    logger.info('Expo: spawned metro dev server', { appId: app.id, pid: child.pid, port })

    // Parse stdout for Metro URL and web URL
    if (child.stdout) {
      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        entry.log = truncateLog(entry.log + text)

        // Detect native server ready with URL
        if (!entry.expoUrl) {
          const urlMatch = text.match(/Metro waiting on (exp:\/\/[\d.]+:\d+)/)
          if (urlMatch && urlMatch[1]) {
            entry.expoUrl = urlMatch[1]
            logger.info('Expo: metro ready', { appId: app.id, url: entry.expoUrl })
            // Fire status update — web URL may arrive later
            this.onStatusChange(app.id, 'running', entry.expoUrl, entry.webUrl, null)
          }
        }

        // Detect web URL (e.g. "Web on http://localhost:8081" or bare URL)
        if (!entry.webUrl) {
          const webMatch = text.match(/(?:Web[:\s]+(?:on\s+)?)(https?:\/\/localhost:\d+)/i)
          if (webMatch && webMatch[1]) {
            entry.webUrl = webMatch[1]
            logger.info('Expo: web ready', { appId: app.id, webUrl: entry.webUrl })
            this.onStatusChange(app.id, 'running', entry.expoUrl, entry.webUrl, null)
          } else {
            // Also try a generic localhost URL pattern from the log
            const fallbackMatch = text.match(/(?:http:\/\/localhost:(\d+))/)
            if (fallbackMatch && fallbackMatch[0]) {
              entry.webUrl = fallbackMatch[0]
              logger.info('Expo: web ready (fallback)', {
                appId: app.id,
                webUrl: entry.webUrl,
              })
              this.onStatusChange(app.id, 'running', entry.expoUrl, entry.webUrl, null)
            }
          }
        }
      })
    }

    // Collect stderr
    if (child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        entry.log = truncateLog(entry.log + text)
      })
    }

    // Handle process exit
    child.on('exit', (code, signal) => {
      entry.running = false
      entry.process = null
      const wasRunning = entry.expoUrl !== null
      entry.expoUrl = null
      entry.webUrl = null
      this.onStatusChange(app.id, 'stopped', null, null, null)
      logger.info('Expo: process exited', { appId: app.id, code, signal, wasRunning })
    })

    // Handle spawn errors
    child.on('error', (err) => {
      entry.running = false
      entry.process = null
      entry.log = truncateLog(entry.log + `\n[ERROR] ${err.message}\n`)
      this.onStatusChange(app.id, 'error', null, null, err.message)
      logger.error('Expo: process error', { appId: app.id, error: err.message })
    })
  }

  /**
   * Stop a running Metro dev server.
   * SIGTERM first, SIGKILL after 5s grace period.
   */
  async stop(appId: string): Promise<void> {
    const entry = this.processes.get(appId)
    if (!entry || !entry.process || !entry.running) {
      logger.warn('Expo: nothing to stop', { appId })
      return
    }

    const child = entry.process
    const pid = child.pid

    // Send SIGTERM to process group
    try {
      if (pid) process.kill(-pid, 'SIGTERM')
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'EPERM' && code !== 'ESRCH') {
        logger.error('Expo: SIGTERM failed', { appId, error: String(err) })
      }
    }

    // Escalate to SIGKILL after grace period
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        try {
          if (pid && entry.running) {
            process.kill(-pid, 'SIGKILL')
          }
        } catch (err: unknown) {
          const code = (err as NodeJS.ErrnoException).code
          if (code !== 'EPERM' && code !== 'ESRCH') {
            logger.error('Expo: SIGKILL failed', { appId, error: String(err) })
          }
        }
        resolve()
      }, KILL_GRACE_MS)

      // If process exits before timeout, clear timer
      child.once('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })

    entry.running = false
    entry.process = null
    entry.expoUrl = null
    entry.webUrl = null
    this.onStatusChange(appId, 'stopped', null, null, null)
    logger.info('Expo: stop completed', { appId })
  }

  /** Return current status of an Expo process. */
  getStatus(appId: string): ExpoStatusResponse {
    const entry = this.processes.get(appId)
    if (!entry) {
      return { status: 'idle', expoUrl: null, webUrl: null, log: '', lastError: null }
    }
    return {
      status: entry.running ? (entry.expoUrl ? 'running' : 'starting') : 'stopped',
      expoUrl: entry.expoUrl,
      webUrl: entry.webUrl,
      log: entry.log,
      lastError: null,
    }
  }

  /** Check whether a Metro process is currently running for an app. */
  isRunning(appId: string): boolean {
    const entry = this.processes.get(appId)
    return entry?.running ?? false
  }

  /** Stop all running Metro processes. Called on app quit. */
  async stopAll(): Promise<void> {
    const running = [...this.processes.entries()].filter(([, e]) => e.running)
    await Promise.all(running.map(([id]) => this.stop(id)))
  }
}

export type { ExpoStatusCallback }
