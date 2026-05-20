import { DialogProps, Field } from '@/primitives'
import { TabPanel, TabPanelProps } from '@/primitives/Tabs'
import { useTranslation } from 'react-i18next'
import { usePersistentUserChoices } from '@/features/rooms/galene/hooks/usePersistentUserChoices'
import { useEffect, useRef, useState } from 'react'
import { css } from '@/styled-system/css'
import { RowWrapper } from './layout/RowWrapper'

export type VideoTabProps = Pick<DialogProps, 'onOpenChange'> &
  Pick<TabPanelProps, 'id'>

type DeviceItems = Array<{ value: string; label: string }>

export const VideoTab = ({ id }: VideoTabProps) => {
  const { t } = useTranslation('settings', { keyPrefix: 'video' })
  const {
    userChoices: { videoDeviceId },
    saveVideoInputDeviceId,
  } = usePersistentUserChoices()

  const [devices, setDevices] = useState<DeviceItems>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((allDevices) => {
      setDevices(
        allDevices
          .filter((d) => d.kind === 'videoinput')
          .map((d) => ({ value: d.deviceId, label: d.label || d.deviceId }))
      )
    })
  }, [])

  useEffect(() => {
    let active = true

    const startPreview = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
        })
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch {
        console.log("camera error");
        // camera not available or permission denied
      }
    }

    startPreview()

    return () => {
      active = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [videoDeviceId])

  const isCamEnabled = devices.length > 0

  return (
    <TabPanel padding={'md'} flex id={id}>
      <RowWrapper heading={t('camera.heading')}>
        <Field
          type="select"
          label={t('camera.label')}
          items={devices}
          selectedKey={videoDeviceId}
          onSelectionChange={(key) => saveVideoInputDeviceId(key as string)}
          {...(!isCamEnabled
            ? { placeholder: t('permissionsRequired'), isDisabled: true }
            : {})}
          style={{ width: '100%' }}
        />
        <div
          role="status"
          aria-label={t(
            `camera.previewAriaLabel.${isCamEnabled ? 'enabled' : 'disabled'}`
          )}
        >
          {isCamEnabled ? (
             
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              disablePictureInPicture
              disableRemotePlayback
              className={css({
                transform: 'rotateY(180deg)',
                height: '69px',
                width: '160px',
              })}
            />
          ) : (
            <span
              className={css({
                display: 'flex',
                justifyContent: 'center',
                textAlign: 'center',
              })}
            >
              {t('camera.disabled')}
            </span>
          )}
        </div>
      </RowWrapper>
    </TabPanel>
  )
}
