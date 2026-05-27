import { css } from '@/styled-system/css'
import { HStack } from '@/styled-system/jsx'
import { Button } from '@/primitives'
import { RiPushpin2Line, RiUnpinLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef, useState } from 'react'

const MOUSE_IDLE_TIME = 3000

interface GaleneParticipantTileFocusProps {
  isPinned: boolean
  onPin: () => void
  hasKeyboardFocus?: boolean
}

export const GaleneParticipantTileFocus = ({
  isPinned,
  onPin,
  hasKeyboardFocus = false,
}: GaleneParticipantTileFocusProps) => {
  const { t } = useTranslation('rooms', { keyPrefix: 'participantTileFocus' })
  const [hovered, setHovered] = useState(false)
  const [opacity, setOpacity] = useState(0)
  const idleTimerRef = useRef<number | null>(null)
  const [isIdle, setIsIdle] = useState(false)

  const isVisible = hasKeyboardFocus || (hovered && !isIdle)

  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => setOpacity(0.6))
    } else {
      setOpacity(0)
    }
  }, [isVisible])

  const handleMouseMove = () => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    idleTimerRef.current = window.setTimeout(() => setIsIdle(true), MOUSE_IDLE_TIME)
    setIsIdle(false)
  }

  return (
    <div
      className={css({
        position: 'absolute',
        left: '0',
        top: '0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
      })}
      aria-hidden={!isVisible}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {isVisible && (
        <div
          className={css({
            backgroundColor: 'primaryDark.50',
            transition: 'opacity 200ms linear',
            zIndex: 1,
            borderRadius: '0.25rem',
            display: 'flex',
            _hover: { opacity: '0.95 !important' },
          })}
          style={{ opacity }}
        >
          <HStack
            gap={0.5}
            className={css({ padding: '0.5rem', _hover: { opacity: '1 !important' } })}
          >
            <Button
              size="sm"
              variant="primaryTextDark"
              square
              tooltip={isPinned ? t('pin.disable') : t('pin.enable')}
              onPress={onPin}
            >
              {isPinned ? <RiUnpinLine /> : <RiPushpin2Line />}
            </Button>
          </HStack>
        </div>
      )}
    </div>
  )
}
