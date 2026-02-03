/**
 * Terminal Layout Model — Pure data structure for split terminal grids.
 *
 * A layout is a binary tree where:
 *   - Leaf nodes hold a single terminal ID
 *   - Branch nodes split space horizontally or vertically between two children
 *
 * All functions are pure — no side effects, fully testable without Electron.
 */

/**
 * Platform-agnostic UUID generator.
 * Works in both Node.js (main/preload) and browser (renderer) contexts.
 * crypto.randomUUID() is available in all modern browsers and Node 19+.
 * Falls back to a Math.random-based v4 UUID for Node 18 compatibility.
 */
function uuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export type SplitDirection = 'horizontal' | 'vertical'

export interface LeafNode {
  type: 'leaf'
  id: string
  terminalId: string
}

export interface BranchNode {
  type: 'branch'
  id: string
  direction: SplitDirection
  children: [LayoutNode, LayoutNode]
  /** Ratio of first child (0–1). Second child gets 1 - ratio. */
  ratio: number
}

export type LayoutNode = LeafNode | BranchNode

export function createLeaf(terminalId?: string): LeafNode {
  return {
    type: 'leaf',
    id: uuid(),
    terminalId: terminalId ?? uuid(),
  }
}

/** Split a leaf node, placing the new terminal to the right */
export function splitRight(root: LayoutNode, targetId: string): LayoutNode {
  return splitNode(root, targetId, 'horizontal')
}

/** Split a leaf node, placing the new terminal below */
export function splitDown(root: LayoutNode, targetId: string): LayoutNode {
  return splitNode(root, targetId, 'vertical')
}

function splitNode(node: LayoutNode, targetId: string, direction: SplitDirection): LayoutNode {
  if (node.type === 'leaf') {
    if (node.id === targetId) {
      const newLeaf = createLeaf()
      return {
        type: 'branch',
        id: uuid(),
        direction,
        children: [node, newLeaf],
        ratio: 0.5,
      }
    }
    return node
  }

  // Branch node — recurse into children
  const [left, right] = node.children
  const newLeft = splitNode(left, targetId, direction)
  const newRight = splitNode(right, targetId, direction)

  if (newLeft === left && newRight === right) return node

  return { ...node, children: [newLeft, newRight] }
}

/**
 * Remove a terminal from the layout by its leaf node ID.
 * When a leaf is removed from a branch, the sibling replaces the branch.
 * Returns null if the root itself is the removed leaf.
 */
export function removeTerminal(root: LayoutNode, targetId: string): LayoutNode | null {
  if (root.type === 'leaf') {
    return root.id === targetId ? null : root
  }

  const [left, right] = root.children

  // If left child is the target, promote the right child
  if (left.type === 'leaf' && left.id === targetId) return right
  if (right.type === 'leaf' && right.id === targetId) return left

  // Recurse
  const newLeft = removeTerminal(left, targetId)
  const newRight = removeTerminal(right, targetId)

  // If a subtree collapsed to null, promote the other
  if (newLeft === null) return newRight
  if (newRight === null) return newLeft

  if (newLeft === left && newRight === right) return root

  return { ...root, children: [newLeft, newRight] }
}

/** Find a leaf node by its ID */
export function findLeaf(root: LayoutNode, targetId: string): LeafNode | null {
  if (root.type === 'leaf') {
    return root.id === targetId ? root : null
  }

  return findLeaf(root.children[0], targetId) ?? findLeaf(root.children[1], targetId)
}

/** Collect all terminal IDs from the layout tree */
export function getAllTerminalIds(root: LayoutNode): string[] {
  if (root.type === 'leaf') return [root.terminalId]
  return [...getAllTerminalIds(root.children[0]), ...getAllTerminalIds(root.children[1])]
}

/** Collect all leaf node IDs from the layout tree */
export function getAllLeafIds(root: LayoutNode): string[] {
  if (root.type === 'leaf') return [root.id]
  return [...getAllLeafIds(root.children[0]), ...getAllLeafIds(root.children[1])]
}

/** Count total leaf nodes */
export function countLeaves(root: LayoutNode): number {
  if (root.type === 'leaf') return 1
  return countLeaves(root.children[0]) + countLeaves(root.children[1])
}

/**
 * Serialize layout to a plain JSON-safe object.
 * Already JSON-safe since it only contains strings and numbers.
 */
export function serializeLayout(root: LayoutNode): LayoutNode {
  return JSON.parse(JSON.stringify(root)) as LayoutNode
}

/** Validate a deserialized layout node */
export function isValidLayout(value: unknown): value is LayoutNode {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>

  if (obj['type'] === 'leaf') {
    return (
      typeof obj['id'] === 'string' &&
      obj['id'].length > 0 &&
      typeof obj['terminalId'] === 'string' &&
      obj['terminalId'].length > 0
    )
  }

  if (obj['type'] === 'branch') {
    if (typeof obj['id'] !== 'string' || obj['id'].length === 0) return false
    if (obj['direction'] !== 'horizontal' && obj['direction'] !== 'vertical') return false
    if (typeof obj['ratio'] !== 'number' || obj['ratio'] <= 0 || obj['ratio'] >= 1) return false
    if (!Array.isArray(obj['children']) || obj['children'].length !== 2) return false
    return isValidLayout(obj['children'][0]) && isValidLayout(obj['children'][1])
  }

  return false
}
