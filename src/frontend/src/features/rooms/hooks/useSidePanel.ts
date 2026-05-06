import { useSnapshot } from 'valtio'
import { layoutStore, PanelId, SubPanelId } from '@/stores/layout'

// Re-export so callers that import PanelId/SubPanelId from this module still work.
export { PanelId, SubPanelId }

const togglePanel = (id: PanelId) => {
  layoutStore.activePanelId = layoutStore.activePanelId === id ? null : id
}

const openPanel = (id: PanelId) => {
  layoutStore.activePanelId = id
}

export const useSidePanel = () => {
  const { activePanelId } = useSnapshot(layoutStore)

  return {
    isSidePanelOpen: activePanelId !== null,

    isChatOpen: activePanelId === PanelId.CHAT,
    toggleChat: () => togglePanel(PanelId.CHAT),

    isParticipantsOpen: activePanelId === PanelId.PARTICIPANTS,
    toggleParticipants: () => togglePanel(PanelId.PARTICIPANTS),

    isTranscriptOpen: activePanelId === PanelId.TRANSCRIPT,
    openTranscript: () => openPanel(PanelId.TRANSCRIPT),

    isScreenRecordingOpen: activePanelId === PanelId.SCREEN_RECORDING,
    openScreenRecording: () => openPanel(PanelId.SCREEN_RECORDING),
  }
}
