import { fetchApi } from '@/api/fetchApi'
import { useRoomData } from '@/features/rooms/galene/hooks/useRoomData'

export const useRaiseHand = () => {
  const data = useRoomData()

  const raiseHand = async (raised: boolean) => {
    if (!data?.id) {
      throw new Error('Room id is not available')
    }

    const token = data?.galene?.token

    if (!token) {
      throw new Error('LiveKit token is not available')
    }

    return fetchApi(`rooms/${data.id}/toggle-hand/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        raised,
      }),
    })
  }

  return { raiseHand }
}
