import { useTranslation } from 'react-i18next'
import { Button } from '@/primitives'
import {
  RiMicLine,
  RiMicOffLine,
  RiVideoOnLine,
  RiVideoOffLine,
} from '@remixicon/react'

type ToggleDeviceProps = {
  kind: 'audioinput' | 'videoinput'
  enabled: boolean
  toggle: () => void | Promise<void>
  context?: string
}

export const ToggleDevice = ({ kind, enabled, toggle }: ToggleDeviceProps) => {
  const { t } = useTranslation('rooms', { keyPrefix: 'join' })

  const isAudio = kind === 'audioinput'
  const Icon = isAudio
    ? enabled
      ? RiMicLine
      : RiMicOffLine
    : enabled
      ? RiVideoOnLine
      : RiVideoOffLine

  const label = enabled ? t('toggleOff') : t('toggleOn')

  return (
    <Button
      variant="whiteCircle"
      size="default"
      square
      onPress={() => toggle()}
      tooltip={label}
      aria-label={label}
      aria-pressed={enabled}
    >
      <Icon size={20} />
    </Button>
  )
}
