import { useState, useEffect } from 'react'
import { IPHONE_DEVICES } from '@shared/types'
import { DeviceSelector } from './DeviceSelector'
import '../../styles/IPhoneFrame.css'

interface IPhoneFrameProps {
  webUrl: string | null
  hmrPulse?: boolean
}

export function IPhoneFrame({ webUrl, hmrPulse }: IPhoneFrameProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState('iphone-15-pro')
  const [pulseActive, setPulseActive] = useState(false)

  const device = IPHONE_DEVICES.find((d) => d.id === selectedDeviceId)
  const deviceName = device?.name ?? 'iPhone 15 Pro'
  const deviceId = device?.id ?? 'iphone-15-pro'

  // HMR pulse animation
  useEffect(() => {
    if (!hmrPulse) return
    setPulseActive(true)
    const timer = setTimeout(() => setPulseActive(false), 600)
    return () => clearTimeout(timer)
  }, [hmrPulse])

  const frameClasses = [
    'iphone-frame',
    `iphone-frame--${deviceId}`,
    pulseActive ? 'iphone-frame--hmr-pulse' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="iphone-frame-container">
      <DeviceSelector selectedDeviceId={selectedDeviceId} onSelect={setSelectedDeviceId} />

      <div className={frameClasses}>
        {webUrl ? (
          <webview
            className="iphone-frame__webview"
            src={webUrl}
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore — Electron webview attributes not in React types
            allowpopups="false"
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            webpreferences="contextIsolation=yes"
            partition="persist:mobile-preview"
          />
        ) : (
          <div className="iphone-frame__placeholder">
            <div className="iphone-frame__placeholder-spinner" />
            <span className="iphone-frame__placeholder-text">Waiting for Metro...</span>
          </div>
        )}
      </div>

      <span className="iphone-frame-label">{deviceName}</span>
    </div>
  )
}
