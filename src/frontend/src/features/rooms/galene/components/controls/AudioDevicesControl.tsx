import { useTranslation } from 'react-i18next'
import { Button, Popover } from '@/primitives'
import { RiArrowUpSLine } from '@remixicon/react'

import { ToggleDevice } from './ToggleDevice'
import { css } from '@/styled-system/css'
import { usePersistentUserChoices } from '../../hooks/usePersistentUserChoices'
import { useCannotUseDevice } from '../../hooks/useCannotUseDevice'
import { SelectDevice } from './SelectDevice'
import { SettingsDialogExtendedKey } from '@/features/settings/type'
import { isSafari } from '@/utils/browser'

type AudioDevicesControlProps = {
  hideMenu?: boolean,
  enabled: boolean,
  toggle: () => void | Promise<void>
}

export const AudioDevicesControl = ({
  hideMenu,
  enabled,
  toggle
}: AudioDevicesControlProps) => {
  const { t } = useTranslation('rooms', { keyPrefix: 'selectDevice' })

  const {
    userChoices: { audioDeviceId, audioOutputDeviceId },
    saveAudioInputDeviceId,
    saveAudioOutputDeviceId,
  } = usePersistentUserChoices()

  const kind = 'audioinput'
  const cannotUseDevice = useCannotUseDevice(kind)
  const selectLabel = t(`settings.${SettingsDialogExtendedKey.AUDIO}`)

  return (
    <div
      className={css({
        display: 'flex',
        gap: '1px',
      })}
    >
      <ToggleDevice
        kind={kind}
        toggle={toggle}
        enabled={enabled}
        context='room'
      />
      {!hideMenu && (
        <Popover variant="dark" withArrow={false}>
          <Button
            tooltip={selectLabel}
            aria-label={selectLabel}
            groupPosition="right"
            square
            variant={
              cannotUseDevice
                ? 'error2'
                : 'primaryDark'
            }
          >
            <RiArrowUpSLine />
          </Button>
          {() => (
            <div
              className={css({
                maxWidth: '36rem',
                padding: '0.15rem',
                display: 'flex',
                gap: '0.5rem',
              })}
            >
              <div
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                }}
              >
                <SelectDevice
                  kind={kind}
                  id={audioDeviceId}
                  onSubmit={saveAudioInputDeviceId}
                  context='room'
                />
              </div>
              {!isSafari() && (
                <div
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                  }}
                >
                  <SelectDevice
                    kind="audiooutput"
                    id={audioOutputDeviceId}
                    onSubmit={saveAudioOutputDeviceId}
                    context='room'
                  />
                </div>
              )}
              {/* <SettingsButton
                settingTab={SettingsDialogExtendedKey.AUDIO}
                onPress={close}
              /> */}
            </div>
          )}
        </Popover>
      )}
    </div>
  )
}