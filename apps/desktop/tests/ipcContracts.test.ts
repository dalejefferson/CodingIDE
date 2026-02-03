import { describe, it, expect } from 'vitest'
import {
  IPC_CHANNELS,
  ALLOWED_CHANNELS,
  IPC_VALIDATORS,
  isAllowedChannel,
} from '../src/shared/ipcContracts'
import type { IPCContracts, IPCChannel } from '../src/shared/ipcContracts'

describe('IPC Contracts', () => {
  it('defines all required channels', () => {
    expect(IPC_CHANNELS.PING).toBe('ipc:ping')
    expect(IPC_CHANNELS.GET_APP_VERSION).toBe('ipc:get-app-version')
    expect(IPC_CHANNELS.WINDOW_MINIMIZE).toBe('ipc:window-minimize')
    expect(IPC_CHANNELS.WINDOW_MAXIMIZE).toBe('ipc:window-maximize')
    expect(IPC_CHANNELS.WINDOW_CLOSE).toBe('ipc:window-close')
    expect(IPC_CHANNELS.OPEN_FOLDER_DIALOG).toBe('ipc:open-folder-dialog')
    expect(IPC_CHANNELS.GET_PROJECTS).toBe('ipc:get-projects')
    expect(IPC_CHANNELS.ADD_PROJECT).toBe('ipc:add-project')
    expect(IPC_CHANNELS.REMOVE_PROJECT).toBe('ipc:remove-project')
  })

  it('has unique channel identifiers', () => {
    const channels = Object.values(IPC_CHANNELS)
    const unique = new Set(channels)
    expect(unique.size).toBe(channels.length)
  })

  it('uses consistent ipc: prefix naming', () => {
    for (const channel of Object.values(IPC_CHANNELS)) {
      expect(channel).toMatch(/^ipc:[a-z-]+$/)
    }
  })

  it('type contracts compile correctly', () => {
    type PingContract = IPCContracts[typeof IPC_CHANNELS.PING]
    const res: PingContract['response'] = 'pong'
    expect(res).toBe('pong')

    type VersionContract = IPCContracts[typeof IPC_CHANNELS.GET_APP_VERSION]
    const ver: VersionContract['response'] = '0.1.0'
    expect(ver).toBe('0.1.0')
  })

  it('has a validator for every declared channel', () => {
    const channelValues = Object.values(IPC_CHANNELS) as IPCChannel[]
    for (const ch of channelValues) {
      expect(IPC_VALIDATORS[ch]).toBeDefined()
      expect(typeof IPC_VALIDATORS[ch]).toBe('function')
    }
  })

  it('allowlist matches declared channels exactly', () => {
    const channelValues = Object.values(IPC_CHANNELS)
    expect(ALLOWED_CHANNELS.size).toBe(channelValues.length)
    for (const ch of channelValues) {
      expect(isAllowedChannel(ch)).toBe(true)
    }
  })
})
