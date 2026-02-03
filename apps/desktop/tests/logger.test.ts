import { describe, it, expect, beforeEach } from 'vitest'
import { logger } from '../src/services/logger'

describe('Logger', () => {
  beforeEach(() => {
    logger.clear()
  })

  it('logs debug messages', () => {
    logger.debug('test debug')
    const logs = logger.getLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0]?.level).toBe('debug')
    expect(logs[0]?.message).toBe('test debug')
  })

  it('logs info messages', () => {
    logger.info('test info')
    expect(logger.getLogs()[0]?.level).toBe('info')
  })

  it('logs warn messages', () => {
    logger.warn('test warn')
    expect(logger.getLogs()[0]?.level).toBe('warn')
  })

  it('logs error messages', () => {
    logger.error('test error')
    expect(logger.getLogs()[0]?.level).toBe('error')
  })

  it('includes context in entries', () => {
    const ctx = { userId: 123, action: 'test' }
    logger.info('with context', ctx)
    expect(logger.getLogs()[0]?.context).toEqual(ctx)
  })

  it('includes timestamp', () => {
    const before = Date.now()
    logger.info('timestamped')
    const after = Date.now()
    const ts = logger.getLogs()[0]?.timestamp ?? 0
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it('clears all logs', () => {
    logger.info('a')
    logger.info('b')
    expect(logger.getLogs()).toHaveLength(2)
    logger.clear()
    expect(logger.getLogs()).toHaveLength(0)
  })

  it('caps storage at max size', () => {
    for (let i = 0; i < 1100; i++) {
      logger.info(`msg ${i}`)
    }
    const logs = logger.getLogs()
    expect(logs.length).toBe(1000)
    expect(logs[logs.length - 1]?.message).toBe('msg 1099')
  })

  it('returns a copy from getLogs', () => {
    logger.info('original')
    const a = logger.getLogs()
    const b = logger.getLogs()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})
