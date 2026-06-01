
type RoomMetadata = {
  recording_status?: string
  recording_mode?: string
  [key: string]: unknown
}

export const useRoomMetadata = (): RoomMetadata | undefined => {
  return undefined
}
