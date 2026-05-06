import { proxy } from 'valtio'

type RoomState = {
  isAdminOrOwner: boolean
}

export const roomStore = proxy<RoomState>({
  isAdminOrOwner: false,
})
