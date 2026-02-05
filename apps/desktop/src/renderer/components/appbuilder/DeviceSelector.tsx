import { IPHONE_DEVICES } from '@shared/types'

interface DeviceSelectorProps {
  selectedDeviceId: string
  onSelect: (deviceId: string) => void
}

export function DeviceSelector({ selectedDeviceId, onSelect }: DeviceSelectorProps) {
  return (
    <select
      className="device-selector"
      value={selectedDeviceId}
      onChange={(e) => onSelect(e.target.value)}
      aria-label="Select device"
    >
      {IPHONE_DEVICES.map((device) => (
        <option key={device.id} value={device.id}>
          {device.name}
        </option>
      ))}
    </select>
  )
}
