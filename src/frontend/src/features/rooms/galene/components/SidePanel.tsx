import { layoutStore } from '@/stores/layout'
import { css } from '@/styled-system/css'
import { HStack } from '@/styled-system/jsx'
import { Button, Div } from '@/primitives'
import { text } from '@/primitives/Text'
import { RiCloseLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { ReactNode } from 'react'
import { useSidePanel } from '../../hooks/useSidePanel'
import { useReactionsToolbar } from '@/features/reactions/hooks/useReactionsToolbar'
import { Chat } from './controls/Chat/Chat'
import { ParticipantsList } from './controls/Participants/ParticipantsList'

type PanelProps = {
  isOpen: boolean
  children: ReactNode
  keepAlive?: boolean
}

const Panel = ({ isOpen, keepAlive = false, children }: PanelProps) => (
  <div
    style={{
      display: isOpen ? 'inherit' : 'none',
      flexDirection: 'column',
      overflow: 'hidden',
      flexGrow: 1,
    }}
  >
    {keepAlive || isOpen ? children : null}
  </div>
)

export function SidePanel() {
  const { activePanelId, isSidePanelOpen, isChatOpen, isParticipantsOpen } =
    useSidePanel()
  const { t } = useTranslation('rooms', { keyPrefix: 'sidePanel' })
  const { isOpen: isReactionToolbarOpen } = useReactionsToolbar()

  const title = activePanelId ? t(`heading.${activePanelId}`) : ''
  const isClosed = !isSidePanelOpen
  const closeButtonTooltip = activePanelId
    ? t('closeButton', { content: t(`content.${activePanelId}`) })
    : ''

  return (
    <aside
      className={css({
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'primaryDark.100',
        backgroundColor: 'primaryDark.50',
        borderRadius: 8,
        position: 'absolute',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        margin: 'var(--sizes-room-side-panel-margin)',
        marginLeft: 0,
        marginBottom: 0,
        padding: 0,
        gap: 0,
        right: 0,
        top: 0,
        width: 'var(--sizes-room-side-panel)',
        transition: '.5s cubic-bezier(.4,0,.2,1) 5ms',
      })}
      style={{
        transform: isClosed
          ? 'translateX(calc(var(--sizes-room-side-panel) + var(--sizes-room-side-panel-margin)))'
          : 'none',
        bottom: isReactionToolbarOpen
          ? 'calc(var(--sizes-room-control-bar) + var(--sizes-room-reaction-toolbar-height) + calc(var(--lk-grid-gap) / 2))'
          : 'var(--sizes-room-control-bar)',
      }}
      aria-hidden={isClosed}
      aria-label={title ? t('ariaLabel', { title }) : undefined}
    >
      <HStack alignItems="center" position="relative">
        <h1
          className={text({ variant: 'h2' })}
          style={{
            paddingLeft: '1.5rem',
            paddingTop: '1rem',
            display: isClosed ? 'none' : 'flex',
            justifyContent: 'start',
            alignItems: 'center',
          }}
        >
          {title}
        </h1>
        <Div
          position="absolute"
          top="5"
          right="5"
          style={{ display: isClosed ? 'none' : undefined }}
        >
          <Button
            invisible
            variant="tertiaryText"
            size="xs"
            onPress={() => {
              layoutStore.activePanelId = null
            }}
            aria-label={closeButtonTooltip}
            tooltip={closeButtonTooltip}
          >
            <RiCloseLine />
          </Button>
        </Div>
      </HStack>

      <Panel isOpen={isChatOpen} keepAlive>
        <Chat />
      </Panel>
      <Panel isOpen={isParticipantsOpen}>
        <ParticipantsList />
      </Panel>
    </aside>
  )
}
