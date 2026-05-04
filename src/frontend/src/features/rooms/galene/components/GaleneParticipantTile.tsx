import React, { useEffect, useRef } from 'react'
import { css } from '@/styled-system/css'
import { GaleneTrack } from '../GaleneContext'

interface GaleneParticipantTileProps {
  track: GaleneTrack
}

/**
 * Renders a single participant's video tile.
 * Attaches the MediaStream to a <video> element and shows a name overlay.
 */
export function GaleneParticipantTile({ track }: GaleneParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !track.stream) return

    // Only update srcObject if it actually changed
    if (el.srcObject !== track.stream) {
      el.srcObject = track.stream
    }
  }, [track.stream])

  const isLocal = track.participant?.isLocal ?? false
  const displayName = track.participant?.username ?? 'Participant'

  return (
    <div
      className={css({
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8',
        bg: 'primaryDark.50',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '0',
        aspectRatio: '16/9',
      })}
    >
      {track.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local video to avoid echo
          className={css({
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // Mirror local camera
            ...(isLocal ? { transform: 'scaleX(-1)' } : {}),
          })}
        />
      ) : (
        // Placeholder when no stream is available yet
        <div
          className={css({
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bg: 'primaryDark.75',
            color: 'white',
            fontSize: '24',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          })}
        >
          {displayName.charAt(0)}
        </div>
      )}

      {/* Name overlay */}
      <div
        className={css({
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          padding: '0.375 0.5',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
          color: 'white',
          fontSize: '12',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25',
        })}
      >
        <span>{displayName}</span>
      </div>
    </div>
  )
}
