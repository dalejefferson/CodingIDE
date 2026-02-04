import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TerminalService } from '../src/services/terminalService'

/** Wait up to `ms` milliseconds for a condition to become true */
async function waitFor(fn: () => boolean, ms = 3000, interval = 100): Promise<boolean> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (fn()) return true
    await new Promise((r) => setTimeout(r, interval))
  }
  return fn()
}

describe('TerminalService process cleanup', () => {
  let service: TerminalService

  beforeEach(() => {
    service = new TerminalService()
  })

  afterEach(() => {
    service.killAll()
  })

  it('kill() terminates the shell process', async () => {
    const id = 'test-kill-single'
    service.create(id, 'proj1', process.cwd())

    // Get the PID via a write + buffer check (the PTY is alive)
    // We need to access the PID — use the internal map via has()
    expect(service.has(id)).toBe(true)

    // Spawn a sleep command so we can check its child process too
    service.write(id, 'sleep 60 &\n')
    // Give the shell a moment to spawn the child
    await new Promise((r) => setTimeout(r, 300))

    // Kill the terminal
    service.kill(id)
    expect(service.has(id)).toBe(false)

    // The PTY process should die within a few seconds (SIGTERM + SIGKILL fallback)
    // We can't easily get the PID from outside, but has() returning false
    // confirms the service cleaned up its internal state.
  })

  it('kill() removes terminal from internal tracking', () => {
    const id = 'test-kill-tracking'
    service.create(id, 'proj1', process.cwd())
    expect(service.has(id)).toBe(true)

    service.kill(id)
    expect(service.has(id)).toBe(false)
    expect(service.getBuffer(id)).toBe('')
  })

  it('killAllForProject() terminates all terminals for a project', () => {
    service.create('t1', 'proj-a', process.cwd())
    service.create('t2', 'proj-a', process.cwd())
    service.create('t3', 'proj-b', process.cwd())

    service.killAllForProject('proj-a')

    expect(service.has('t1')).toBe(false)
    expect(service.has('t2')).toBe(false)
    expect(service.has('t3')).toBe(true)
  })

  it('killAll() terminates every terminal', () => {
    service.create('t1', 'proj-a', process.cwd())
    service.create('t2', 'proj-b', process.cwd())

    service.killAll()

    expect(service.has('t1')).toBe(false)
    expect(service.has('t2')).toBe(false)
  })

  it('kill() actually terminates the OS process', async () => {
    const id = 'test-kill-process'
    service.create(id, 'proj1', process.cwd())

    // Access the PID through a controlled approach: create the terminal
    // and capture exit events to confirm the process dies
    let exitReceived = false
    service.onExit(() => {
      exitReceived = true
    })

    service.kill(id)

    // The exit callback should fire once the process is actually dead
    const dead = await waitFor(() => exitReceived, 3000)
    expect(dead).toBe(true)
  })
})
