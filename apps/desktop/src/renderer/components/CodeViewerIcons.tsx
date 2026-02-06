import React from 'react'

/* ── Inline SVG icons ───────────────────────────────────────────────────────── */

export const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="3" x2="11" y2="11" />
    <line x1="11" y1="3" x2="3" y2="11" />
  </svg>
)

export const EditIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.08 2.33a1.75 1.75 0 0 1 2.47 2.47L5.13 12.22 1.75 13l.78-3.38z" />
  </svg>
)

export const SaveIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11.67 13H2.33A1.17 1.17 0 0 1 1.17 11.83V2.33A1.17 1.17 0 0 1 2.33 1.17h7.58L12.83 4.08v7.75A1.17 1.17 0 0 1 11.67 13z" />
    <path d="M10.5 13V8.17H3.5V13" />
    <path d="M3.5 1.17V4.67h5.83" />
  </svg>
)

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

export function basename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
