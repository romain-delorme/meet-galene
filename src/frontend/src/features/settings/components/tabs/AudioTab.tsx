import { DialogProps, Field, H, Text } from '@/primitives'
import { TabPanel, TabPanelProps } from '@/primitives/Tabs'
import { isSafari } from '@/utils/livekit'
import { useTranslation } from 'react-i18next'
import { SoundTester } from '@/components/SoundTester'
import { usePersistentUserChoices } from '@/features/rooms/galene/hooks/usePersistentUserChoices'
import { useEffect, useState } from 'react'
import { RowWrapper } from './layout/RowWrapper'

export type AudioTabProps = Pick<DialogProps, 'onOpenChange'> &
  Pick<TabPanelProps, 'id'>

type DeviceItems = Array<{ value: string; label: string }>

export const AudioTab = ({ id }: AudioTabProps) => {
  const { t } = useTranslation('settings')
  const {
    userChoices: { audioDeviceId, audioOutputDeviceId },
    saveAudioInputDeviceId,
    saveAudioOutputDeviceId,
  } = usePersistentUserChoices()

  const [devicesIn, setDevicesIn] = useState<DeviceItems>([])
  const [devicesOut, setDevicesOut] = useState<DeviceItems>([])

  useEffect(() => {
    const update = async () => {
      if (!navigator.mediaDevices) return
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevicesIn(
        all
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({ value: d.deviceId, label: d.label || d.deviceId }))
      )
      setDevicesOut(
        all
          .filter((d) => d.kind === 'audiooutput')
          .map((d) => ({ value: d.deviceId, label: d.label || d.deviceId }))
      )
    }
    update()
    navigator.mediaDevices?.addEventListener?.('devicechange', update)
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', update)
  }, [])

  // The Permissions API is not fully supported in Firefox and Safari, and attempting to use it for microphone permissions
  // may raise an error. As a workaround, we infer microphone permission status by checking if the list of audio input
  // devices (devicesIn) is non-empty. If the list has one or more devices, we assume the user has granted microphone access.
  const isMicEnabled = devicesIn.length > 0

  const disabledProps = isMicEnabled
    ? {}
    : {
        placeholder: t('audio.permissionsRequired'),
        isDisabled: true,
        defaultSelectedKey: undefined,
      }

  return (
    <TabPanel padding={'md'} flex id={id}>
      <H lvl={2}>{t('audio.microphone.heading')}</H>
      <Field
        type="select"
        label={t('audio.microphone.label')}
        items={devicesIn}
        selectedKey={audioDeviceId}
        onSelectionChange={(key) => saveAudioInputDeviceId(key as string)}
        {...disabledProps}
        style={{ width: '100%' }}
      />
      {/* Safari has a known limitation where its implementation of 'enumerateDevices' does not include audio output devices.
        To prevent errors or an empty selection list, we only render the speakers selection field on non-Safari browsers. */}
      {!isSafari() ? (
        <RowWrapper heading={t('audio.speakers.heading')}>
          <Field
            type="select"
            label={t('audio.speakers.label')}
            items={devicesOut}
            selectedKey={audioOutputDeviceId}
            onSelectionChange={(key) => saveAudioOutputDeviceId(key as string)}
            {...disabledProps}
            style={{ minWidth: 0 }}
          />
          <SoundTester />
        </RowWrapper>
      ) : (
        <RowWrapper heading={t('audio.speakers.heading')}>
          <Text variant="warning" margin="md">
            {t('audio.speakers.safariWarning')}
          </Text>
          <div />
        </RowWrapper>
      )}
    </TabPanel>
  )
}
