import { useContext } from 'react'
import { GaleneContext } from '../../rooms/galene/GaleneContext'

export const useNotifyParticipants = () => {
  const { sendNotification } = useContext(GaleneContext)
  return { notifyParticipants: sendNotification }
}
