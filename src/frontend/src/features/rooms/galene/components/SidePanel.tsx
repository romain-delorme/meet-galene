import { css } from '@/styled-system/css'
import { useSidePanel } from '../../hooks/useSidePanel'
import { Chat } from './controls/Chat/Chat'
import { ParticipantsList } from './controls/Participants/ParticipantsList'

export function SidePanel() {
  const { isSidePanelOpen, isChatOpen, isParticipantsOpen } = useSidePanel()

  if (!isSidePanelOpen) return null

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        width: '320px',
        height: '100%',
        bg: 'primaryDark.25',
        borderLeft: '1px solid',
        borderColor: 'primaryDark.100',
        flexShrink: 0,
        overflow: 'hidden',
      })}
    >
      {isChatOpen && <Chat />}
      {isParticipantsOpen && <ParticipantsList />}
    </div>
  )
}