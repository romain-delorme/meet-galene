import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { keys } from '@/api/queryKeys'
import { queryClient } from '@/api/queryClient'
import { Screen } from '@/layout/Screen'
import { QueryAware } from '@/components/QueryAware'
import { ErrorScreen } from '@/components/ErrorScreen'
import { fetchRoom } from '../api/fetchRoom'
import { ApiRoom } from '../api/ApiRoom'
import { useCreateRoom } from '../api/createRoom'
import { InviteDialog } from './InviteDialog'
import { usePostHog } from 'posthog-js/react'
import { useConfig } from '@/api/useConfig'
import { useIsMobile } from '@/utils/useIsMobile'
import { navigateTo } from '@/navigation/navigateTo'
import { connectionObserverStore } from '@/stores/connectionObserver'
import { roomStore } from '@/stores/room'
import { GaleneRoom } from '../galene/components/GaleneRoom'
import { useSnapshot } from 'valtio'
import { userChoicesStore } from '@/stores/userChoices'
import { VideoConference } from '../galene/components/VideoConference'

export const Conference = ({
  roomId,
  initialRoomData,
  mode = 'join',
}: {
  roomId: string
  mode?: 'join' | 'create'
  initialRoomData?: ApiRoom
}) => {
  const posthog = usePostHog()
  const { data: apiConfig } = useConfig()

  const userConfig = useSnapshot(userChoicesStore)

  useEffect(() => {
    posthog.capture('visit-room', { slug: roomId })
  }, [roomId, posthog])

  const fetchKey = [keys.room, roomId]

  const {
    mutateAsync: createRoom,
    status: createStatus,
    isError: isCreateError,
  } = useCreateRoom({
    onSuccess: (data) => {
      queryClient.setQueryData(fetchKey, data)
    },
  })

  const {
    status: fetchStatus,
    isError: isFetchError,
    data,
  } = useQuery({
    queryKey: fetchKey,
    staleTime: 6 * 60 * 60 * 1000, // By default, Galene tokens expire 6 hours after generation
    initialData: initialRoomData,
    queryFn: () =>
      fetchRoom({
        roomId: roomId as string,
        username: userConfig.username,
      }).catch((error) => {
        if (error.statusCode == '404') {
          createRoom({ slug: roomId, username: userConfig.username })
        }
      }),
    retry: false,
  })

  useEffect(() => {
    roomStore.isAdminOrOwner = data?.is_administrable ?? false
    return () => {
      roomStore.isAdminOrOwner = false
    }
  }, [data?.is_administrable])

  const [showInviteDialog, setShowInviteDialog] = useState(mode === 'create')
  const isMobile = useIsMobile()

  const serverUrl = useMemo(() => {
    // In dev, Vite proxies /ws to the Galène server with the correct Origin header.
    // In production, connect directly to the Galène WebSocket endpoint.
    if (import.meta.env.DEV) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocol}//${window.location.host}/ws`
    }
    const galene_url = apiConfig?.galene?.url;
    if (!galene_url) return
    const wsUrl = galene_url.replace(/^https?:/, (m) => (m === 'https:' ? 'wss:' : 'ws:'))
    return wsUrl.endsWith('/ws') ? wsUrl : wsUrl + '/ws'
  }, [apiConfig])

  const { t } = useTranslation('rooms')

  if (isCreateError) {
    // this error screen should be replaced by a proper waiting room for anonymous user.
    return (
      <ErrorScreen
        title={t('error.createRoom.heading')}
        body={t('error.createRoom.body')}
      />
    )
  }
  return (
    <QueryAware status={isFetchError ? createStatus : fetchStatus}>
      <Screen header={false} footer={false}>
        <GaleneRoom
          groupName={roomId}
          serverUrl={serverUrl}
          token={data?.galene?.token}
          username={userConfig.username}
          audioEnabled={userConfig.audioEnabled}
          videoEnabled={userConfig.videoEnabled}
          onDisconnected={(e) => {
            connectionObserverStore.publisher = null
            connectionObserverStore.publisherChangesCount = 0
            connectionObserverStore.subscriber = null
            connectionObserverStore.subscriberChangesCount = 0

            navigateTo('feedback', {}, { state: { room_id: roomId } })
          }}
        >
          <VideoConference />
          {showInviteDialog && !isMobile && (
            <InviteDialog
              isOpen={showInviteDialog}
              onOpenChange={setShowInviteDialog}
              onClose={() => setShowInviteDialog(false)}
            />
          )}
        </GaleneRoom>
      </Screen>
    </QueryAware>
  )
}
