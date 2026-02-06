import { useCallback, useRef } from 'react'

export function usePortRegistry() {
  const portRegistryRef = useRef(new Map<number, string>())

  const getPortOwner = useCallback((port: number): string | null => {
    return portRegistryRef.current.get(port) ?? null
  }, [])

  const registerPort = useCallback((projectId: string, port: number) => {
    portRegistryRef.current.set(port, projectId)
  }, [])

  const unregisterPort = useCallback((projectId: string, port: number) => {
    // Only remove if this project actually owns the port
    if (portRegistryRef.current.get(port) === projectId) {
      portRegistryRef.current.delete(port)
    }
  }, [])

  /** Return all ports currently owned by a project */
  const getProjectPorts = useCallback((projectId: string): number[] => {
    const ports: number[] = []
    for (const [port, owner] of portRegistryRef.current) {
      if (owner === projectId) ports.push(port)
    }
    return ports
  }, [])

  /** Remove all port registrations owned by a specific project */
  const unregisterAllForProject = useCallback((projectId: string) => {
    for (const [port, owner] of portRegistryRef.current) {
      if (owner === projectId) {
        portRegistryRef.current.delete(port)
      }
    }
  }, [])

  return { getPortOwner, registerPort, unregisterPort, getProjectPorts, unregisterAllForProject }
}
