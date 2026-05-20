import { useContext, useCallback, useRef } from 'react'
import { css } from '@/styled-system/css'
import {
  RiPhoneLine,
  RiArrowUpBoxLine,
  RiMessage2Line,
  RiGroupLine,
  RiSettings3Line,
} from '@remixicon/react'
import { GaleneContext } from '../GaleneContext'
import { ControlBarRegion } from '@/features/layout/components/ControlBarRegion'
import { ReactionsToolbar } from '@/features/reactions/components/toolbar/ReactionsToolbar'
import { ReactionsToggle } from '@/features/reactions/components/ReactionsToggle'
import { ToggleDevice } from './controls/ToggleDevice'
import { Button, ToggleButton } from '@/primitives'
import { useSidePanel } from '../../hooks/useSidePanel'
import { useSettingsDialog } from '@/features/settings/hook/useSettingsDialog'
import { useRegisterKeyboardShortcut } from '@/features/shortcuts/useRegisterKeyboardShortcut'

const browserSupportsScreenSharing =
  typeof navigator.mediaDevices?.getDisplayMedia === 'function'

export function GaleneControlBar() {
  const { connection, isAudioEnabled, isVideoEnabled, toggleAudio, toggleVideo, newScreenShare } =
    useContext(GaleneContext)
  const { isChatOpen, toggleChat, isParticipantsOpen, toggleParticipants } = useSidePanel()
  const { openSettingsDialog } = useSettingsDialog()
  const barRef = useRef<HTMLDivElement>(null)

  const leaveRoom = useCallback(() => connection?.close(), [connection])

  useRegisterKeyboardShortcut({
    id: 'focus-toolbar',
    handler: () => {
      barRef.current
        ?.querySelector<HTMLElement>('button, [role="button"], [tabindex="0"]')
        ?.focus()
    },
  })

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      })}
    >
      <ReactionsToolbar />
      <div
        id="control-bar"
        ref={barRef}
        className={css({
          zIndex: 100,
          width: '100vw',
          display: 'flex',
          padding: '1.125rem',
        })}
      >
        <div
          className={css({
            display: 'flex',
            justifyContent: 'flex-start',
            flex: '1 1 33%',
            alignItems: 'center',
            gap: '0.5rem',
            marginLeft: '0.5rem',
          })}
        />
        <ControlBarRegion>
          <ToggleDevice kind="audioinput" enabled={isAudioEnabled} toggle={toggleAudio} />
          <ToggleDevice kind="videoinput" enabled={isVideoEnabled} toggle={toggleVideo} />
          <ReactionsToggle />
          {browserSupportsScreenSharing && (
            <Button
              variant="primaryDark"
              square
              onPress={newScreenShare}
              aria-label="Partager l'écran"
              tooltip="Partager l'écran"
            >
              <RiArrowUpBoxLine size={20} />
            </Button>
          )}
          <ToggleButton
            variant="primaryDark"
            square
            isSelected={isChatOpen}
            onChange={toggleChat}
            aria-label="Chat"
            tooltip="Chat"
          >
            <RiMessage2Line size={20} />
          </ToggleButton>
          <ToggleButton
            variant="primaryDark"
            square
            isSelected={isParticipantsOpen}
            onChange={toggleParticipants}
            aria-label="Participants"
            tooltip="Participants"
          >
            <RiGroupLine size={20} />
          </ToggleButton>
          <Button
            variant="primaryDark"
            square
            onPress={() => openSettingsDialog()}
            aria-label="Paramètres"
            tooltip="Paramètres"
          >
            <RiSettings3Line size={20} />
          </Button>
          <Button
            variant="danger"
            square
            onPress={leaveRoom}
            aria-label="Quitter la salle"
            tooltip="Quitter la salle"
          >
            <RiPhoneLine size={20} style={{ transform: 'rotate(135deg)' }} />
          </Button>
        </ControlBarRegion>
        <div
          className={css({
            display: 'flex',
            justifyContent: 'flex-end',
            flex: '1 1 33%',
            alignItems: 'center',
            marginRight: '0.5rem',
          })}
        />
      </div>
    </div>
  )
}