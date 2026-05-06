import { useSnapshot } from 'valtio'
import { roomStore } from '@/stores/room'

export const useIsAdminOrOwner = (): boolean => {
  const { isAdminOrOwner } = useSnapshot(roomStore)
  return isAdminOrOwner
}
