import { useTranslation } from 'react-i18next'
import { Button, Popover } from '@/primitives'
import { RiArrowUpSLine } from '@remixicon/react'

import { ToggleDevice } from './ToggleDevice'
import { css } from '@/styled-system/css'
import { usePersistentUserChoices } from '../../hooks/usePersistentUserChoices'
// import { useCanPublishTrack } from '../../hooks/useCanPublishTrack'
import { useCannotUseDevice } from '../../hooks/useCannotUseDevice'
// import { BackgroundProcessorFactory } from '../blur'
import { SelectDevice } from './SelectDevice'
import { SettingsDialogExtendedKey } from '@/features/settings/type'

// const EffectsButton = ({ onPress }: { onPress: () => void }) => {
//   const { t } = useTranslation('rooms', { keyPrefix: 'selectDevice' })
//   return (
//     <Button
//       size="sm"
//       square
//       tooltip={t('effects')}
//       aria-label={t('effects')}
//       variant="primaryDark"
//       onPress={() => {
//         // if (!isEffectsOpen) toggleEffects()
//         onPress()
//       }}
//     >
//       <RiImageCircleAiFill size={24} />
//     </Button>
//   )
// }

type VideoDeviceControlProps = {
  hideMenu?: boolean,
  enabled: boolean,
  toggle: () => void | Promise<void>
}

export const VideoDeviceControl = ({
  hideMenu,
  enabled,
  toggle
}: VideoDeviceControlProps) => {
  const { t } = useTranslation('rooms', { keyPrefix: 'selectDevice' })

  const { userChoices, saveVideoInputDeviceId } =
    usePersistentUserChoices()

  const kind = 'videoinput'
  const cannotUseDevice = useCannotUseDevice(kind)

  // const toggleWithProcessor = async () => {
  //   /**
  //    * We need to make sure that we apply the in-memory processor when re-enabling the camera.
  //    * Before, we had the following bug:
  //    * 1 - Configure a processor on join screen
  //    * 2 - Turn off camera on join screen
  //    * 3 - Join the room
  //    * 4 - Turn on the camera
  //    * 5 - No processor is applied to the camera
  //    * Expected: The processor is applied.
  //    *
  //    * See https://github.com/numerique-gouv/meet/pull/309#issuecomment-2622404121
  //    */
  //   const processor = BackgroundProcessorFactory.deserializeProcessor(
  //     userChoices.processorSerialized
  //   )

  //   const toggle = trackProps.toggle as (
  //     forceState: boolean,
  //     captureOptions: VideoCaptureOptions
  //   ) => Promise<void>

  //   await toggle(!trackProps.enabled, {
  //     processor: processor,
  //   } as VideoCaptureOptions)
  // }

  const selectLabel = t(`settings.${SettingsDialogExtendedKey.VIDEO}`)
  // const canPublishTrack = useCanPublishTrack(TrackSource.CAMERA)

  return (
    <div
      className={css({
        display: 'flex',
        gap: '1px',
      })}
    >
      <ToggleDevice
        context='room'
        // isDisabled={!canPublishTrack}
        enabled={enabled}
        kind={kind}
        toggle={toggle}
        // overrideToggleButtonProps={{
        //   ...(hideMenu
        //     ? {
        //         groupPosition: undefined,
        //       }
        //     : {}),
        // }}
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
                  id={userChoices.videoDeviceId}
                  onSubmit={saveVideoInputDeviceId}
                  context='room'
                />
              </div>
              {/* <EffectsButton onPress={close} /> */}
              {/* <SettingsButton
                settingTab={SettingsDialogExtendedKey.VIDEO}
                onPress={close}
              /> */}
            </div>
          )}
        </Popover>
      )}
    </div>
  )
}