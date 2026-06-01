import { useCallback, useContext, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { isMobileBrowser } from '@/utils/browser'
import { GaleneContext, GaleneParticipant } from '../rooms/galene/GaleneContext'
import { NotificationType } from './NotificationType'
import { NotificationDuration } from './NotificationDuration'
import { useNotificationSound } from '@/features/notifications/hooks/useSoundNotification'
import { toastQueue } from './components/ToastProvider'
import { NotificationProvider } from './components/NotificationProvider'
import { layoutStore } from '@/stores/layout'
import { PanelId } from '@/features/rooms/hooks/useSidePanel'
import { useScreenReaderAnnounce } from '@/hooks/useScreenReaderAnnounce'
import { Emoji } from '@/features/reactions/types'
import { useReactions } from '@/features/reactions/hooks/useReactions'

const toToastParticipant = (p: GaleneParticipant) => ({
  name: p.username,
  isLocal: p.isLocal,
})

export const MainNotificationToast = () => {
  const { participants, status, subscribeToNotifications } =
    useContext(GaleneContext)
  const { triggerNotificationSound } = useNotificationSound()
  const { t } = useTranslation('notifications')
  const announce = useScreenReaderAnnounce()
  const { appendReaction } = useReactions()

  // Refs so handlers always read the latest values without being deps
  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  // --- Data notifications ---
  const handleEmoji = useCallback(
    (emoji: string, participantName: string) => {
      if (!emoji || !Object.values(Emoji).includes(emoji as Emoji)) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appendReaction(emoji as Emoji, { name: participantName, identity: participantName } as any)
    },
    [appendReaction]
  )
  const handleEmojiRef = useRef(handleEmoji)
  handleEmojiRef.current = handleEmoji

  useEffect(() => {
    return subscribeToNotifications((notification, senderId) => {
      const sender = participantsRef.current.find((p) => p.id === senderId);
      const toastParticipant = sender
        ? { ...toToastParticipant(sender), participantId: sender.id }
        : undefined

      switch (notification.type) {
        case NotificationType.MessageReceived: {
          const { nick, message } = notification.data ?? {}
          if (!nick || !message) break
          triggerNotificationSound(NotificationType.MessageReceived)
          toastQueue.add(
            { participant: { name: nick }, message, type: NotificationType.MessageReceived },
            { timeout: NotificationDuration.MESSAGE }
          )
          if (layoutStore.activePanelId !== PanelId.CHAT) {
            announce(
              t('chatMessageReceived', { name: nick, message }),
              'polite'
            )
          }
          break
        }
        case NotificationType.ParticipantMuted:
          toastQueue.add(
            { participant: toastParticipant, type: NotificationType.ParticipantMuted },
            { timeout: NotificationDuration.ALERT }
          )
          break
        case NotificationType.ReactionReceived:
          if (notification.data?.emoji && !sender?.isLocal)
            handleEmojiRef.current(
              notification.data.emoji,
              sender?.username ?? senderId
            )
          break
        case NotificationType.TranscriptionStarted:
        case NotificationType.TranscriptionStopped:
        case NotificationType.ScreenRecordingStarted:
        case NotificationType.ScreenRecordingStopped:
        case NotificationType.TranscriptionLimitReached:
        case NotificationType.ScreenRecordingLimitReached:
          toastQueue.add(
            { participant: toastParticipant, type: notification.type },
            { timeout: NotificationDuration.ALERT }
          )
          break
        case NotificationType.TranscriptionRequested:
        case NotificationType.ScreenRecordingRequested:
          toastQueue.add(
            { participant: toastParticipant, type: notification.type },
            { timeout: NotificationDuration.RECORDING_REQUESTED }
          )
          break
        case NotificationType.PermissionsRemoved: {
          const removedSources = notification?.data?.removedSources
          if (!removedSources?.length) break
          toastQueue.add(
            { participant: toastParticipant, type: notification.type, removedSources },
            { timeout: NotificationDuration.ALERT }
          )
          break
        }
      }
    })
  }, [subscribeToNotifications])

  // --- Participant join / leave ---
  const prevParticipantIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const currentIds = new Set(participants.map((p) => p.id))

    participants.forEach((p) => {
      if (!p.isLocal && !prevParticipantIdsRef.current.has(p.id)) {
        if (!isMobileBrowser()) {
          triggerNotificationSound(NotificationType.ParticipantJoined)
          toastQueue.add(
            {
              ...toToastParticipant(p),
              participantId: p.id,
              type: NotificationType.ParticipantJoined,
            },
            { timeout: NotificationDuration.PARTICIPANT_JOINED }
          )
        }
      }
    })

    prevParticipantIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        toastQueue.visibleToasts.forEach((toast) => {
          if (toast.content.participantId === id) toastQueue.close(toast.key)
        })
      }
    })

    prevParticipantIdsRef.current = currentIds
  }, [participants, triggerNotificationSound])

  // --- Hand raise ---
  const prevHandRaisedRef = useRef<Map<string, string | undefined>>(new Map())
  useEffect(() => {
    participants.forEach((p) => {
      if (p.isLocal) return
      const prev = prevHandRaisedRef.current.get(p.id)
      if (prev === p.handRaisedAt) return

      const existingToast = toastQueue.visibleToasts.find(
        (toast) =>
          toast.content.participantId === p.id &&
          toast.content.type === NotificationType.HandRaised
      )

      if (existingToast && !p.handRaisedAt) {
        toastQueue.close(existingToast.key)
      } else if (!existingToast && p.handRaisedAt && !isMobileBrowser()) {
        triggerNotificationSound(NotificationType.HandRaised)
        toastQueue.add(
          {
            ...toToastParticipant(p),
            participantId: p.id,
            type: NotificationType.HandRaised,
          },
          { timeout: NotificationDuration.HAND_RAISED }
        )
      }
    })
    prevHandRaisedRef.current = new Map(
      participants.map((p) => [p.id, p.handRaisedAt])
    )
  }, [participants, triggerNotificationSound])

  // --- Disconnect: close all toasts ---
  useEffect(() => {
    if (status === 'disconnected') {
      toastQueue.visibleToasts.forEach(({ key }) => toastQueue.close(key))
    }
  }, [status])

  // Without this line, when the component first renders,
  // the 'notifications' namespace might not be loaded yet
  useTranslation(['notifications'])

  return <NotificationProvider />
}
