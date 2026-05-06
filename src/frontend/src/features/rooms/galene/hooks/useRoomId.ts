import { useParams } from 'wouter'

export const useRoomId = (): string | undefined => {
  const { roomId } = useParams()
  return roomId
}
