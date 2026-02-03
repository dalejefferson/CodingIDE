import { useState, useEffect } from 'react'
import './styles/App.css'

export function App() {
  const [version, setVersion] = useState<string>('...')
  const [pingResult, setPingResult] = useState<string>('')

  useEffect(() => {
    window.electronAPI.getAppVersion().then(setVersion).catch(console.error)
  }, [])

  const handlePing = async () => {
    try {
      const result = await window.electronAPI.ping()
      setPingResult(result)
    } catch (err) {
      console.error('Ping failed:', err)
      setPingResult('error')
    }
  }

  return (
    <div className="app">
      <header className="titlebar">
        <h1>CodingIDE</h1>
        <span className="version">v{version}</span>
      </header>
      <main className="main">
        <div className="card">
          <h2>Hello from Electron + React</h2>
          <p>Secure defaults active. Typed IPC ready.</p>
          <button className="btn" onClick={handlePing}>
            Ping Main Process
          </button>
          {pingResult && <p className="result">Response: {pingResult}</p>}
        </div>
      </main>
    </div>
  )
}
