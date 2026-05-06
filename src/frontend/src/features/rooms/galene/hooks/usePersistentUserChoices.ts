import { useSnapshot } from 'valtio'
import { userChoicesStore } from '@/stores/userChoices'

export const usePersistentUserChoices = () => {
  const userChoices = useSnapshot(userChoicesStore)

  return {
    userChoices,
    saveUsername: (value: string) => {
      userChoicesStore.username = value
    },
    saveAudioInputEnabled: (value: boolean) => {
      userChoicesStore.audioEnabled = value
    },
    saveVideoInputEnabled: (value: boolean) => {
      userChoicesStore.videoEnabled = value
    },
    saveAudioInputDeviceId: (value: string) => {
      userChoicesStore.audioDeviceId = value
    },
    saveAudioOutputDeviceId: (value: string) => {
      userChoicesStore.audioOutputDeviceId = value
    },
    saveVideoInputDeviceId: (value: string) => {
      userChoicesStore.videoDeviceId = value
    },
  }
}
