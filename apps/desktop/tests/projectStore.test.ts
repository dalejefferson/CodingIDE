import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ProjectStore } from '../src/services/projectStore'

let tempDir: string
let storePath: string
let store: ProjectStore

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'projectstore-'))
  storePath = join(tempDir, 'projects.json')
  store = new ProjectStore(storePath)
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('ProjectStore', () => {
  it('returns empty array when no projects exist', () => {
    expect(store.getAll()).toEqual([])
  })

  it('adds a project and returns it', () => {
    const project = store.add({ path: '/Users/dev/myapp' })
    expect(project.name).toBe('myapp')
    expect(project.path).toBe('/Users/dev/myapp')
    expect(project.status).toBe('idle')
    expect(project.id).toBeTruthy()
    expect(project.addedAt).toBeGreaterThan(0)
  })

  it('getAll returns added projects', () => {
    store.add({ path: '/tmp/alpha' })
    store.add({ path: '/tmp/beta' })
    const all = store.getAll()
    expect(all).toHaveLength(2)
    expect(all.map((p) => p.name)).toEqual(['alpha', 'beta'])
  })

  it('getById finds existing project', () => {
    const added = store.add({ path: '/tmp/find-me' })
    const found = store.getById(added.id)
    expect(found).toBeDefined()
    expect(found!.path).toBe('/tmp/find-me')
  })

  it('getById returns undefined for missing id', () => {
    expect(store.getById('nonexistent')).toBeUndefined()
  })

  it('deduplicates by path', () => {
    const first = store.add({ path: '/tmp/dup' })
    const second = store.add({ path: '/tmp/dup' })
    expect(first.id).toBe(second.id)
    expect(store.getAll()).toHaveLength(1)
  })

  it('removes a project by id', () => {
    const project = store.add({ path: '/tmp/remove-me' })
    expect(store.remove(project.id)).toBe(true)
    expect(store.getAll()).toHaveLength(0)
  })

  it('remove returns false for missing id', () => {
    expect(store.remove('nonexistent')).toBe(false)
  })

  it('persists to disk and survives reload', () => {
    store.add({ path: '/tmp/persist-test' })
    store.flush()

    // Create a new store instance pointing at the same file
    const store2 = new ProjectStore(storePath)
    const all = store2.getAll()
    expect(all).toHaveLength(1)
    expect(all[0]!.name).toBe('persist-test')
  })

  it('creates storage file on first add', () => {
    expect(existsSync(storePath)).toBe(false)
    store.add({ path: '/tmp/create-file' })
    store.flush()
    expect(existsSync(storePath)).toBe(true)
  })

  it('handles corrupt JSON gracefully', () => {
    writeFileSync(storePath, 'not json', 'utf-8')
    const corruptStore = new ProjectStore(storePath)
    expect(corruptStore.getAll()).toEqual([])
  })

  it('handles non-array JSON gracefully', () => {
    writeFileSync(storePath, '{"key": "value"}', 'utf-8')
    const badStore = new ProjectStore(storePath)
    expect(badStore.getAll()).toEqual([])
  })

  it('reload forces re-read from disk', () => {
    store.add({ path: '/tmp/reload-test' })
    store.flush()
    expect(store.getAll()).toHaveLength(1)

    // Externally write a different file
    writeFileSync(storePath, '[]', 'utf-8')

    // Without reload, cached data is returned
    expect(store.getAll()).toHaveLength(1)

    // After reload, fresh data is read
    store.reload()
    expect(store.getAll()).toHaveLength(0)
  })

  it('getAll returns a copy, not the internal array', () => {
    store.add({ path: '/tmp/copy-test' })
    const list = store.getAll()
    list.push({
      id: 'fake',
      name: 'fake',
      path: '/fake',
      status: 'idle',
      addedAt: 0,
    })
    expect(store.getAll()).toHaveLength(1)
  })

  it('derives name from folder basename', () => {
    const project = store.add({ path: '/Users/dev/my-cool-project' })
    expect(project.name).toBe('my-cool-project')
  })
})
