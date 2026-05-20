import { useContext } from 'react'
import { css } from '@/styled-system/css'
import { GaleneContext } from '../GaleneContext'
import { GaleneParticipantTile } from './GaleneParticipantTile'
import { GaleneAudioRenderer } from './GaleneAudioRenderer'
import { GaleneControlBar } from './GaleneControlBar'
import { SidePanel } from './SidePanel'
import { SettingsDialogProvider } from '@/features/settings/components/SettingsDialogProvider'

/**
 * Galène-native VideoConference component.
 * Replaces the LiveKit VideoConference prefab.
 *
 * Renders:
 * - A responsive video grid with all participant tiles
 * - Hidden audio elements for remote audio playback
 * - A control bar (mic, camera, leave)
 */
export function VideoConference() {
  const { tracks, status } = useContext(GaleneContext)

  // Only show video tracks (streams that have at least one video track, or are camera sources)
  const videoTracks = tracks.filter(
    (t) =>
      t.source === 'camera' ||
      t.source === 'screen_share' ||
      t.stream?.getVideoTracks().length > 0
  )

  // Compute grid columns based on participant count
  const count = videoTracks.length
  let columns = 1
  if (count === 2) columns = 2
  else if (count >= 3 && count <= 4) columns = 2
  else if (count >= 5 && count <= 9) columns = 3
  else if (count >= 10) columns = 4

  const rows = Math.ceil(count / columns) || 1

  return (
    <div
      className={css({
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        bg: 'primaryDark.50',
      })}
    >
      {/* Main conference area */}
      <div
        className={css({
          position: 'relative',
          flex: 1,
          height: '100%',
          overflow: 'hidden',
        })}
      >
        {/* Status indicator while connecting */}
        {status !== 'joined' && (
          <div
            className={css({
              position: 'absolute',
              inset: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              color: 'white',
              fontSize: '16',
            })}
          >
            {status === 'connecting' && 'Connexion en cours...'}
            {status === 'disconnected' && 'Déconnecté'}
            {status === 'error' && 'Erreur de connexion'}
          </div>
        )}

        {/* Video grid */}
        <div
          className={css({
            display: 'grid',
            gap: '0.5',
            padding: '0.5',
            width: '100%',
            height: 'calc(100% - 80px)', // Leave space for control bar
            alignContent: 'center',
          })}
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {videoTracks.map((track) => (
            <GaleneParticipantTile key={track.id} track={track} />
          ))}
        </div>

        {/* Remote audio playback */}
        <GaleneAudioRenderer tracks={tracks} />

        {/* Controls */}
        <GaleneControlBar />
      </div>

      {/* Side panel (chat / participants) */}
      <SidePanel />
      <SettingsDialogProvider />


    </div>
  )
}
