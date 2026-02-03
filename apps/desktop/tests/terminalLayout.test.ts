import { describe, it, expect } from 'vitest'
import {
  createLeaf,
  splitRight,
  splitDown,
  removeTerminal,
  findLeaf,
  getAllTerminalIds,
  getAllLeafIds,
  countLeaves,
  serializeLayout,
  isValidLayout,
} from '../src/shared/terminalLayout'
import type { LayoutNode, LeafNode, BranchNode } from '../src/shared/terminalLayout'

// ── createLeaf ───────────────────────────────────────────────

describe('createLeaf', () => {
  it('creates a leaf node with unique ids', () => {
    const leaf = createLeaf()
    expect(leaf.type).toBe('leaf')
    expect(leaf.id).toBeDefined()
    expect(leaf.terminalId).toBeDefined()
    expect(leaf.id.length).toBeGreaterThan(0)
    expect(leaf.terminalId.length).toBeGreaterThan(0)
  })

  it('uses provided terminalId', () => {
    const leaf = createLeaf('my-terminal')
    expect(leaf.terminalId).toBe('my-terminal')
  })

  it('generates unique ids per call', () => {
    const a = createLeaf()
    const b = createLeaf()
    expect(a.id).not.toBe(b.id)
    expect(a.terminalId).not.toBe(b.terminalId)
  })
})

// ── splitRight ───────────────────────────────────────────────

describe('splitRight', () => {
  it('splits a leaf into a horizontal branch with two children', () => {
    const leaf = createLeaf()
    const result = splitRight(leaf, leaf.id)

    expect(result.type).toBe('branch')
    const branch = result as BranchNode
    expect(branch.direction).toBe('horizontal')
    expect(branch.ratio).toBe(0.5)
    expect(branch.children).toHaveLength(2)
    expect(branch.children[0]).toBe(leaf) // original is first child
    expect(branch.children[1].type).toBe('leaf')
  })

  it('returns the node unchanged if target not found', () => {
    const leaf = createLeaf()
    const result = splitRight(leaf, 'nonexistent')
    expect(result).toBe(leaf)
  })

  it('splits a specific leaf in a nested tree', () => {
    const leaf1 = createLeaf()
    const tree = splitRight(leaf1, leaf1.id)
    const branch = tree as BranchNode
    const leaf2 = branch.children[1] as LeafNode

    // Split the second leaf down then right
    const result = splitRight(tree, leaf2.id)
    expect(result.type).toBe('branch')
    const root = result as BranchNode
    expect(root.children[0]).toBe(leaf1) // unchanged
    expect(root.children[1].type).toBe('branch') // leaf2 was replaced by a branch
    const innerBranch = root.children[1] as BranchNode
    expect(innerBranch.direction).toBe('horizontal')
    expect(innerBranch.children[0]).toBe(leaf2)
  })
})

// ── splitDown ────────────────────────────────────────────────

describe('splitDown', () => {
  it('splits a leaf into a vertical branch', () => {
    const leaf = createLeaf()
    const result = splitDown(leaf, leaf.id)

    expect(result.type).toBe('branch')
    const branch = result as BranchNode
    expect(branch.direction).toBe('vertical')
    expect(branch.ratio).toBe(0.5)
    expect(branch.children[0]).toBe(leaf)
    expect(branch.children[1].type).toBe('leaf')
  })
})

// ── removeTerminal ───────────────────────────────────────────

describe('removeTerminal', () => {
  it('returns null when removing the only leaf (root)', () => {
    const leaf = createLeaf()
    const result = removeTerminal(leaf, leaf.id)
    expect(result).toBeNull()
  })

  it('returns unchanged root when target not found', () => {
    const leaf = createLeaf()
    const result = removeTerminal(leaf, 'nonexistent')
    expect(result).toBe(leaf)
  })

  it('promotes sibling when removing left child of a branch', () => {
    const leaf = createLeaf()
    const tree = splitRight(leaf, leaf.id)
    const branch = tree as BranchNode
    const rightLeaf = branch.children[1] as LeafNode

    const result = removeTerminal(tree, leaf.id)
    expect(result).toBe(rightLeaf)
  })

  it('promotes sibling when removing right child of a branch', () => {
    const leaf = createLeaf()
    const tree = splitRight(leaf, leaf.id)
    const branch = tree as BranchNode
    const rightLeaf = branch.children[1] as LeafNode

    const result = removeTerminal(tree, rightLeaf.id)
    expect(result).toBe(leaf)
  })

  it('handles deeply nested removal with parent collapse', () => {
    // Create: root(h) -> [leaf1, branch(v) -> [leaf2, leaf3]]
    const leaf1 = createLeaf()
    let tree = splitRight(leaf1, leaf1.id) // root(h) -> [leaf1, leaf2]
    const leaf2 = (tree as BranchNode).children[1] as LeafNode
    tree = splitDown(tree, leaf2.id) // root(h) -> [leaf1, branch(v) -> [leaf2, leaf3]]

    const innerBranch = (tree as BranchNode).children[1] as BranchNode
    const leaf3 = innerBranch.children[1] as LeafNode

    // Remove leaf3 → inner branch collapses to leaf2
    const result = removeTerminal(tree, leaf3.id)
    expect(result).not.toBeNull()
    const root = result as BranchNode
    expect(root.type).toBe('branch')
    expect(root.children[0]).toBe(leaf1)
    expect(root.children[1]).toBe(leaf2) // promoted
  })
})

// ── findLeaf ─────────────────────────────────────────────────

describe('findLeaf', () => {
  it('finds a leaf by id in a single-node tree', () => {
    const leaf = createLeaf()
    expect(findLeaf(leaf, leaf.id)).toBe(leaf)
  })

  it('returns null for non-existent id', () => {
    const leaf = createLeaf()
    expect(findLeaf(leaf, 'nonexistent')).toBeNull()
  })

  it('finds a leaf in a nested tree', () => {
    const leaf = createLeaf()
    const tree = splitRight(leaf, leaf.id)
    const branch = tree as BranchNode
    const leaf2 = branch.children[1] as LeafNode

    expect(findLeaf(tree, leaf.id)).toBe(leaf)
    expect(findLeaf(tree, leaf2.id)).toBe(leaf2)
  })
})

// ── getAllTerminalIds ─────────────────────────────────────────

describe('getAllTerminalIds', () => {
  it('returns single terminal id for a leaf', () => {
    const leaf = createLeaf('t1')
    expect(getAllTerminalIds(leaf)).toEqual(['t1'])
  })

  it('returns all terminal ids from a split tree', () => {
    const leaf = createLeaf('t1')
    const tree = splitRight(leaf, leaf.id)
    const ids = getAllTerminalIds(tree)
    expect(ids).toHaveLength(2)
    expect(ids[0]).toBe('t1')
  })
})

// ── getAllLeafIds ─────────────────────────────────────────────

describe('getAllLeafIds', () => {
  it('returns single leaf id for a leaf', () => {
    const leaf = createLeaf()
    expect(getAllLeafIds(leaf)).toEqual([leaf.id])
  })

  it('returns all leaf ids from a split tree', () => {
    const leaf = createLeaf()
    const tree = splitRight(leaf, leaf.id)
    const ids = getAllLeafIds(tree)
    expect(ids).toHaveLength(2)
    expect(ids).toContain(leaf.id)
  })
})

// ── countLeaves ──────────────────────────────────────────────

describe('countLeaves', () => {
  it('counts 1 for a single leaf', () => {
    expect(countLeaves(createLeaf())).toBe(1)
  })

  it('counts leaves after splits', () => {
    const leaf = createLeaf()
    let tree: LayoutNode = splitRight(leaf, leaf.id)
    expect(countLeaves(tree)).toBe(2)

    const branch = tree as BranchNode
    const leaf2 = branch.children[1] as LeafNode
    tree = splitDown(tree, leaf2.id)
    expect(countLeaves(tree)).toBe(3)
  })
})

// ── serialization ────────────────────────────────────────────

describe('serializeLayout', () => {
  it('produces a deep copy that is JSON-safe', () => {
    const leaf = createLeaf()
    const tree = splitRight(leaf, leaf.id)
    const serialized = serializeLayout(tree)

    expect(serialized).toEqual(tree)
    expect(serialized).not.toBe(tree) // different reference
  })

  it('round-trips through JSON', () => {
    const leaf = createLeaf()
    let tree: LayoutNode = splitRight(leaf, leaf.id)
    const branch = tree as BranchNode
    tree = splitDown(tree, (branch.children[1] as LeafNode).id)

    const json = JSON.stringify(tree)
    const parsed = JSON.parse(json) as LayoutNode
    expect(parsed).toEqual(tree)
    expect(isValidLayout(parsed)).toBe(true)
  })
})

// ── isValidLayout ────────────────────────────────────────────

describe('isValidLayout', () => {
  it('validates a leaf node', () => {
    expect(isValidLayout({ type: 'leaf', id: 'a', terminalId: 'b' })).toBe(true)
  })

  it('rejects leaf with empty id', () => {
    expect(isValidLayout({ type: 'leaf', id: '', terminalId: 'b' })).toBe(false)
  })

  it('rejects leaf with empty terminalId', () => {
    expect(isValidLayout({ type: 'leaf', id: 'a', terminalId: '' })).toBe(false)
  })

  it('validates a branch node', () => {
    expect(
      isValidLayout({
        type: 'branch',
        id: 'a',
        direction: 'horizontal',
        ratio: 0.5,
        children: [
          { type: 'leaf', id: 'b', terminalId: 'c' },
          { type: 'leaf', id: 'd', terminalId: 'e' },
        ],
      }),
    ).toBe(true)
  })

  it('rejects branch with invalid direction', () => {
    expect(
      isValidLayout({
        type: 'branch',
        id: 'a',
        direction: 'diagonal',
        ratio: 0.5,
        children: [
          { type: 'leaf', id: 'b', terminalId: 'c' },
          { type: 'leaf', id: 'd', terminalId: 'e' },
        ],
      }),
    ).toBe(false)
  })

  it('rejects branch with ratio out of range', () => {
    expect(
      isValidLayout({
        type: 'branch',
        id: 'a',
        direction: 'horizontal',
        ratio: 0,
        children: [
          { type: 'leaf', id: 'b', terminalId: 'c' },
          { type: 'leaf', id: 'd', terminalId: 'e' },
        ],
      }),
    ).toBe(false)

    expect(
      isValidLayout({
        type: 'branch',
        id: 'a',
        direction: 'horizontal',
        ratio: 1,
        children: [
          { type: 'leaf', id: 'b', terminalId: 'c' },
          { type: 'leaf', id: 'd', terminalId: 'e' },
        ],
      }),
    ).toBe(false)
  })

  it('rejects branch with wrong number of children', () => {
    expect(
      isValidLayout({
        type: 'branch',
        id: 'a',
        direction: 'horizontal',
        ratio: 0.5,
        children: [{ type: 'leaf', id: 'b', terminalId: 'c' }],
      }),
    ).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isValidLayout(null)).toBe(false)
    expect(isValidLayout(undefined)).toBe(false)
    expect(isValidLayout('leaf')).toBe(false)
    expect(isValidLayout(42)).toBe(false)
  })

  it('rejects unknown type', () => {
    expect(isValidLayout({ type: 'unknown', id: 'a' })).toBe(false)
  })
})
