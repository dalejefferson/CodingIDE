import { QRCodeSVG } from 'qrcode.react'

interface QRCodeDisplayProps {
  expoUrl: string
}

export function QRCodeDisplay({ expoUrl }: QRCodeDisplayProps) {
  return (
    <div className="app-detail__qr-section">
      <QRCodeSVG value={expoUrl} size={200} level="M" />
      <span className="app-detail__qr-url">{expoUrl}</span>
      <span className="app-detail__qr-hint">Scan with Expo Go on your phone</span>
    </div>
  )
}
