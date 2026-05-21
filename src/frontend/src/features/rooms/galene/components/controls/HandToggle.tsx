import { useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RiHand } from '@remixicon/react'
import { css } from '@/styled-system/css'
import { ToggleButton } from '@/primitives'
import { GaleneContext } from '../../GaleneContext'
import { useRegisterKeyboardShortcut } from '@/features/shortcuts/useRegisterKeyboardShortcut'
import {
  closeLowerHandToasts,
  showLowerHandToast,
} from '@/features/notifications/utils'

const SPEAKING_DETECTION_DELAY = 3000

export const HandToggle = () => {
  const { t } = useTranslation('rooms', { keyPrefix: 'controls.hand' })
  const { isHandRaised, toggleHand, participants } = useContext(GaleneContext)

  const localParticipant = participants.find((p) => p.isLocal)
  const isSpeaking = localParticipant?.isSpeaking ?? false

  const speakingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [hasShownToast, setHasShownToast] = useState(false)

  const resetToastState = () => setHasShownToast(false)

  useEffect(() => {
    if (isHandRaised) return
    closeLowerHandToasts()
  }, [isHandRaised])

  const handleToggle = () => {
    toggleHand()
    resetToastState()
  }

  useRegisterKeyboardShortcut({
    id: 'raise-hand',
    handler: handleToggle,
  })

  useEffect(() => {
    const shouldShowToast = isSpeaking && isHandRaised && !hasShownToast

    if (shouldShowToast && !speakingTimerRef.current) {
      speakingTimerRef.current = setTimeout(() => {
        setHasShownToast(true)
        const onClose = () => {
          if (isHandRaised) toggleHand()
          resetToastState()
        }
        showLowerHandToast(
          { name: localParticipant?.username, isLocal: true },
          onClose
        )
      }, SPEAKING_DETECTION_DELAY)
    }
    if ((!isSpeaking || !isHandRaised) && speakingTimerRef.current) {
      clearTimeout(speakingTimerRef.current)
      speakingTimerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, isHandRaised, hasShownToast, toggleHand])

  const tooltipLabel = isHandRaised ? 'lower' : 'raise'

  return (
    <div
      className={css({
        position: 'relative',
        display: 'inline-block',
      })}
    >
      <ToggleButton
        square
        variant="primaryDark"
        aria-label={t(tooltipLabel)}
        tooltip={t(tooltipLabel)}
        isSelected={isHandRaised}
        onPress={handleToggle}
        data-attr={`controls-hand-${tooltipLabel}`}
      >
        <RiHand />
      </ToggleButton>
    </div>
  )
}
