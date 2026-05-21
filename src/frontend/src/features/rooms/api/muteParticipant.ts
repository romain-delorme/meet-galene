import { useContext } from 'react'
import { GaleneContext, GaleneParticipant } from '../galene/GaleneContext'
import { useRoomData } from '../galene/hooks/useRoomData'
import {
  useNotifyParticipants,
  NotificationType,
} from '@/features/notifications'
import { fetchApi } from '@/api/fetchApi'

export const useMuteParticipant = () => {
  const data = useRoomData()
  const { tracks } = useContext(GaleneContext)
  const { notifyParticipants } = useNotifyParticipants()

  const muteParticipant = async (participant: GaleneParticipant) => {
    if (!data?.id) {
      throw new Error('Room id is not available')
    }

    const trackSid = tracks.find(
      (t) => t.participantId === participant.id && t.source === 'microphone'
    )?.publication.trackSid

    if (!trackSid) {
      return
    }

    try {
      const response = await fetchApi(`rooms/${data.id}/mute-participant/`, {
        method: 'POST',
        body: JSON.stringify({
          participant_identity: participant.id,
          track_sid: trackSid,
        }),
      })

      await notifyParticipants({
        type: NotificationType.ParticipantMuted,
        destinationIdentities: [participant.id],
      })

      return response
    } catch (error) {
      console.error(
        `Failed to mute participant ${participant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
  return { muteParticipant }
}
