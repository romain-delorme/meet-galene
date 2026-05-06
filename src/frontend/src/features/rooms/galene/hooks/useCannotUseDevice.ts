import { useSnapshot } from 'valtio'
import { permissionsStore } from '@/stores/permissions'

export const useCannotUseDevice = (
  kind: 'videoinput' | 'audioinput'
): boolean => {
  const { cameraPermission, microphonePermission } = useSnapshot(permissionsStore)
  const permission =
    kind === 'videoinput' ? cameraPermission : microphonePermission
  return permission === 'denied' || permission === 'prompt'
}
