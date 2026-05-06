import { proxy } from 'valtio'

export enum PanelId {
  CHAT = 'chat',
  PARTICIPANTS = 'participants',
  TRANSCRIPT = 'transcript',
  SCREEN_RECORDING = 'screen_recording',
}

export enum SubPanelId {
  NONE = 'none',
}

type State = {
  showHeader: boolean
  showFooter: boolean
  showSubtitles: boolean
  activePanelId: PanelId | null
  activeSubPanelId: SubPanelId | null
  showReactionsToolbar: boolean
}

export const layoutStore = proxy<State>({
  showHeader: false,
  showFooter: false,
  showSubtitles: false,
  activePanelId: null,
  activeSubPanelId: null,
  showReactionsToolbar: false,
})
