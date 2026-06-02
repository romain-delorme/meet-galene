import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { GaleneContext } from '../GaleneContext'
import { GaleneParticipantTile } from './GaleneParticipantTile'
import { GaleneAudioRenderer } from './GaleneAudioRenderer'
import { GaleneControlBar } from './GaleneControlBar'
import { SidePanel } from './SidePanel'
import { SettingsDialogProvider } from '@/features/settings/components/SettingsDialogProvider'
import { RoomContentArea } from '@/features/layout/components/RoomContentArea'
import { useScreenReaderAnnounce } from '@/hooks/useScreenReaderAnnounce'
import { useTranslation } from 'react-i18next'
import { Button } from '@/primitives'
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react'

export function VideoConference() {
  const { tracks, participants } = useContext(GaleneContext)
  const announce = useScreenReaderAnnounce()
  const { t } = useTranslation('rooms', { keyPrefix: 'pinAnnouncements' })
  const { t: tRooms } = useTranslation('rooms')

  const [pinnedTrackId, setPinnedTrackId] = useState<string | null>(null)
  const lastAutoFocusedScreenShareId = useRef<string | null>(null)
  const lastPinnedParticipantIdRef = useRef<string | null>(null)

  const videoTracks = tracks.filter(
    (t) =>
      t.source === 'camera' ||
      t.source === 'screen_share' ||
      t.stream?.getVideoTracks().length > 0
  )

  const screenShareTracks = videoTracks.filter((t) => t.source === 'screen_share')

  // Auto-pin screen shares (mirrors the original logic)
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (
      screenShareTracks.length > 0 &&
      lastAutoFocusedScreenShareId.current === null
    ) {
      setPinnedTrackId(screenShareTracks[0].id)
      lastAutoFocusedScreenShareId.current = screenShareTracks[0].id
    } else if (
      lastAutoFocusedScreenShareId.current !== null &&
      !screenShareTracks.some((t) => t.id === lastAutoFocusedScreenShareId.current)
    ) {
      setPinnedTrackId(null)
      lastAutoFocusedScreenShareId.current = null
    }
  }, [screenShareTracks.map((t) => t.id).join()])
  /* eslint-enable react-hooks/exhaustive-deps */

  const focusTrack = pinnedTrackId ? videoTracks.find((t) => t.id === pinnedTrackId) ?? null : null
  const carouselTracks = videoTracks.filter((t) => t.id !== pinnedTrackId)

  const togglePin = useCallback(
    (trackId: string) => {
      setPinnedTrackId((prev) => {
        const next = prev === trackId ? null : trackId
        const track = videoTracks.find((t) => t.id === trackId)
        const participantId = track?.participantId ?? null
        const participant = participants.find((p) => p.id === participantId)
        const isLocal = participant?.isLocal ?? false
        const name = participant?.username ?? tRooms('participants.unknown')

        if (!next) {
          const lastId = lastPinnedParticipantIdRef.current
          if (lastId) {
            const lastP = participants.find((p) => p.id === lastId)
            announce(
              lastP?.isLocal ? t('self.unpin') : t('unpin', { name: lastP?.username ?? name })
            )
          }
          lastPinnedParticipantIdRef.current = null
        } else {
          lastPinnedParticipantIdRef.current = participantId
          announce(isLocal ? t('self.pin') : t('pin', { name }))
        }
        return next
      })
    },
    [videoTracks, participants, announce, t, tRooms]
  )

  

  //compute grid layout
  const maxTilesPerPage: number = 9;
  const [currentPage, setCurrentPage] = useState(1);

  const visibleTracks = videoTracks.slice((currentPage - 1) * maxTilesPerPage, currentPage * maxTilesPerPage)

  // Compute grid columns for the unpinned layout
  const count = visibleTracks.length
  let columns = 1
  if (count === 2) columns = 2
  else if (count >= 3 && count <= 4) columns = 2
  else if (count >= 5 && count <= 9) columns = 3
  else if (count >= 10) columns = 4
  const rows = Math.ceil(count / columns) || 1

  return (
    <div className="lk-video-conference" data-lk-theme="visio-light" style={{ overflowX: 'hidden' }}>
      <RoomContentArea>
        {!focusTrack ? (
          <div className="lk-grid-layout-wrapper" style={{ height: 'auto' }}>
            <div
              className="lk-grid-layout"
              style={{
                display: 'grid',
                gap: '0.5rem',
                padding: '0.5rem',
                width: '100%',
                height: '100%',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              }}
            >
              {visibleTracks.map((track) => (
                <GaleneParticipantTile
                  key={track.id}
                  track={track}
                  isPinned={false}
                  onPin={() => togglePin(track.id)}
                />
              ))}
            </div>
            <Button 
              size="sm"
              variant="primaryTextDark"
              square
              tooltip={'page précédente'}
              onPress={() => setCurrentPage(currentPage-1)}
              isDisabled={currentPage<2}
            >
              <RiArrowLeftSLine />
            </Button>
            <Button 
              size="sm"
              variant="primaryTextDark"
              square
              tooltip={'page suivante'}
              onPress={() => setCurrentPage(currentPage+1)}
              isDisabled={currentPage > videoTracks.length / maxTilesPerPage - 1}
            >
              <RiArrowRightSLine />
            </Button>
          </div>
        ) : (
          <div className="lk-focus-layout-wrapper" style={{ height: 'auto' }}>
            <div
              className="lk-focus-layout"
              style={{ display: 'flex', height: 'auto', gap: '0.5rem', padding: '0.5rem' }}
            >
              <aside
                className="lk-carousel"
                data-lk-orientation="vertical"
                style={{
                  width: '200px',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  overflowY: 'auto',
                }}
              >
                {carouselTracks.map((track) => (
                  <div key={track.id} style={{ flex: '0 0 120px' }}>
                    <GaleneParticipantTile
                      track={track}
                      isPinned={false}
                      onPin={() => togglePin(track.id)}
                    />
                  </div>
                ))}
              </aside>
              <div style={{ flex: 1, minWidth: 0 }}>
                <GaleneParticipantTile
                  track={focusTrack}
                  isPinned={true}
                  onPin={() => togglePin(focusTrack.id)}
                />
              </div>
            </div>
          </div>
        )}
      </RoomContentArea>

      <GaleneAudioRenderer tracks={tracks} />
      <GaleneControlBar />
      <SidePanel />
      <SettingsDialogProvider />
    </div>
  )
}
