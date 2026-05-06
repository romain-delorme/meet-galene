import { proxy, subscribe } from 'valtio'

export type LocalUserChoices = {
  username: string
  audioEnabled: boolean
  videoEnabled: boolean
  audioDeviceId: string
  audioOutputDeviceId: string
  videoDeviceId: string
}

const STORAGE_KEY = 'userChoices'

function loadUserChoices(): Partial<LocalUserChoices> {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    return json ? JSON.parse(json) : {}
  } catch {
    return {}
  }
}

function getInitialState(): LocalUserChoices {
  return {
    username: '',
    audioEnabled: true,
    videoEnabled: true,
    audioDeviceId: '',
    audioOutputDeviceId: '',
    videoDeviceId: '',
    ...loadUserChoices(),
  }
}

export const userChoicesStore = proxy<LocalUserChoices>(getInitialState())

subscribe(userChoicesStore, () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...userChoicesStore }))
  } catch {
    // ignore storage errors (private browsing, quota exceeded, etc.)
  }
})
