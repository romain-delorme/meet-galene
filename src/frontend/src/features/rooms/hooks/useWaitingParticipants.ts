import { useContext, useEffect, useMemo, useState } from 'react'
import { useIsAdminOrOwner } from '@/features/rooms/galene/hooks/useIsAdminOrOwner'
import { useEnterRoom } from '../api/enterRoom'
import {
  useListWaitingParticipants,
  WaitingParticipant,
} from '../api/listWaitingParticipants'
import { NotificationType } from '@/features/notifications/NotificationType'
import { GaleneContext } from '../galene/GaleneContext'

export const POLL_INTERVAL_MS = 1000

export const useWaitingParticipants = () => {
  const [listEnabled, setListEnabled] = useState(true)

  const { connection, subscribeToNotifications } = useContext(GaleneContext)
  const roomId = connection?.group || '';
  const isAdminOrOwner = useIsAdminOrOwner()

  useEffect(() => {
    if (!isAdminOrOwner) return
    return subscribeToNotifications((payload) => {
      if (payload.type === NotificationType.ParticipantWaiting) {
        setListEnabled(true)
      }
    })
  }, [isAdminOrOwner, subscribeToNotifications])

  const { data: waitingData, refetch: refetchWaiting } =
    useListWaitingParticipants(roomId, {
      retry: false,
      enabled: listEnabled && isAdminOrOwner,
      refetchInterval: POLL_INTERVAL_MS,
      refetchIntervalInBackground: true,
    })

  const waitingParticipants = useMemo(
    () => waitingData?.participants || [],
    [waitingData]
  )

  useEffect(() => {
    if (!waitingParticipants.length) setListEnabled(false)
  }, [waitingParticipants])

  const { mutateAsync: enterRoom } = useEnterRoom()

  const handleParticipantEntry = async (
    participant: WaitingParticipant,
    allowEntry: boolean
  ) => {
    await enterRoom({
      roomId: roomId,
      allowEntry,
      participantId: participant.id,
    })
    await refetchWaiting()
  }

  const handleParticipantsEntry = async (
    allowEntry: boolean
  ): Promise<void> => {
    try {
      setListEnabled(false)

      await Promise.all(
        waitingParticipants.map((participant) =>
          enterRoom({
            roomId: roomId,
            allowEntry,
            participantId: participant.id,
          })
        )
      )

      await refetchWaiting()
    } catch (e) {
      console.error(e)
      setListEnabled(true)
    }
  }

  return {
    waitingParticipants,
    handleParticipantEntry,
    handleParticipantsEntry,
  }
}
