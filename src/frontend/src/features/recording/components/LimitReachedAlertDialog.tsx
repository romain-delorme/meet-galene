import { useTranslation } from 'react-i18next'
import { Button, Dialog, P } from '@/primitives'
import { HStack } from '@/styled-system/jsx'
import { useHumanizeRecordingMaxDuration } from '@/features/recording'
import { useState } from 'react'
import { useIsAdminOrOwner } from '@/features/rooms/galene/hooks/useIsAdminOrOwner'

// TODO: the dialog trigger was driven by LiveKit's DataReceived event.
// Re-implement via a Galene-compatible notification channel when recording is wired up.
export const LimitReachedAlertDialog = () => {
  const [isAlertOpen, setIsAlertOpen] = useState(false)

  const { t } = useTranslation('rooms', {
    keyPrefix: 'recordingStateToast.limitReachedAlert',
  })

  const isAdminOrOwner = useIsAdminOrOwner()
  const maxDuration = useHumanizeRecordingMaxDuration()

  if (!isAdminOrOwner) return null

  return (
    <Dialog isOpen={isAlertOpen} role="alertdialog" title={t('title')}>
      <P>
        {t('description', {
          duration_message: maxDuration
            ? t('durationMessage', {
                duration: maxDuration,
              })
            : '',
        })}
      </P>
      <HStack gap={1}>
        <Button variant="text" size="sm" onPress={() => setIsAlertOpen(false)}>
          {t('button')}
        </Button>
      </HStack>
    </Dialog>
  )
}
