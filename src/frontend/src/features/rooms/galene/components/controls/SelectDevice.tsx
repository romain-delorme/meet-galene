import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Select } from '@/primitives'
import { VisuallyHidden } from '@/styled-system/jsx'
import { Label } from 'react-aria-components'
import {
  RiMicLine,
  RiVideoOnLine,
  RiVolumeUpLine,
} from '@remixicon/react'
import type { RemixiconComponentType } from '@remixicon/react'

const KIND_ICON: Record<string, RemixiconComponentType> = {
  audioinput: RiMicLine,
  audiooutput: RiVolumeUpLine,
  videoinput: RiVideoOnLine,
}

type SelectDeviceProps = {
  kind: 'audioinput' | 'audiooutput' | 'videoinput'
  id: string
  onSubmit: (deviceId: string) => void,
  context?: string
}

export const SelectDevice = ({ kind, id, onSubmit, context }: SelectDeviceProps) => {
  const { t } = useTranslation('rooms', { keyPrefix: 'join.device' })
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    const update = async () => {
      try {
        if (!navigator.mediaDevices) return
        const all = await navigator.mediaDevices.enumerateDevices()
        setDevices(all.filter((d) => d.kind === kind))
      } catch {
        // permission not granted yet — devices will enumerate after getUserMedia
      }
    }
    update()
    navigator.mediaDevices?.addEventListener?.('devicechange', update)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', update)
    }
  }, [kind])

  const items = devices.map((d, i) => ({
    value: d.deviceId,
    label: d.label || t('unnamed', { n: i + 1 }),
  }))

  if (items.length === 0) return null

  const Icon = KIND_ICON[kind]
  const selectedKey = id && items.some((it) => it.value === id) ? id : items[0]?.value

  return (
    <Select
      iconComponent={Icon}
      label={
        <VisuallyHidden>
          <Label>{t(kind)}</Label>
        </VisuallyHidden>
      }
      items={items}
      selectedKey={selectedKey}
      onSelectionChange={(key) => onSubmit(String(key))}
      aria-label={t(kind)}
      variant={context == 'room' ? 'dark' : 'light'}
    />
  )
}
