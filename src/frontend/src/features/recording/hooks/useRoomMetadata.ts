// Galene has no equivalent to LiveKit's room-level metadata broadcast.
// Recording status is surfaced via the backend API instead of via the room connection.
// TODO: implement via API polling or Galene user-messages when recording is needed.
type RoomMetadata = {
  recording_status?: string
  recording_mode?: string
  [key: string]: unknown
}

export const useRoomMetadata = (): RoomMetadata | undefined => {
  return undefined
}
