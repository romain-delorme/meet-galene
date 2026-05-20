import { useEffect, useRef, useContext, useState } from 'react'
import { css } from '@/styled-system/css'
import { GaleneTrack, GaleneContext } from '../GaleneContext'
import { RiCloseCircleLine, RiEyeLine, RiEyeOffLine, RiMicOffLine } from '@remixicon/react'

interface GaleneParticipantTileProps {
  track: GaleneTrack
}

/**
 * Renders a single participant's video tile.
 * Attaches the MediaStream to a <video> element and shows a name overlay.
 */
export function GaleneParticipantTile({ track }: GaleneParticipantTileProps) {
  const [ hidden, setHidden ] = useState(false);
  const { isAudioEnabled, isVideoEnabled, stopScreenShare } = useContext(GaleneContext)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isLocal = track.participant?.isLocal ?? false
  const displayName = track.participant?.username ?? 'Participant'
  const isCamera = track.source === 'camera';

  const showVideo = isLocal
    ? isVideoEnabled
    : track.stream && track.stream.getVideoTracks().length > 0

  useEffect(() => {
    const el = videoRef.current
    if (!el || !track.stream) return
    if (el.srcObject !== track.stream) {
      el.srcObject = track.stream
    }
  }, [track.stream, showVideo])

  const toggleStream = () => {
    if(hidden) track.stream.getTracks().forEach((t: MediaStreamTrack) => t.enabled = true) 
    else track.stream.getTracks().forEach((t: MediaStreamTrack) => t.enabled = false);
    setHidden(!hidden)
  };

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
        width: '100%',
        height: '100%',
      })}
    >
      {/* eslint-disable jsx-a11y/media-has-caption */}
      {showVideo && track.stream ? (
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
            ...(isLocal && isCamera ? { transform: 'scaleX(-1)' } : {}),
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
        {isLocal && !isAudioEnabled && (
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              color: 'error.400',
              marginLeft: '0.25',
            })}
            title="Microphone coupé"
          >
            <RiMicOffLine size={14} />
          </span>
        )}
      </div>

      {track.source === 'screen_share' && isLocal && (
          <button 
            onClick={() => stopScreenShare(track)} 
            aria-label='Arrêter le partage'
            className={css({
              bg: 'error.400',
              color: 'white',
              _hover: {
                bg: 'error.300',
              },
            })}
          >
            <RiCloseCircleLine size={14} />
          </button>
      )}

      {!isLocal &&  (
        <button 
          onClick={toggleStream} 
          aria-label={hidden? 'Afficher la vidéo' : 'Masquer la vidéo'}
          className={css({
            bg: 'primaryDark.100',
            color: 'white',
            _hover: {
              bg: 'primaryDark.200',
            },
          })}
        >
          {hidden?
            <RiEyeLine size={18} />
            :
            <RiEyeOffLine size={18} />
          }
        </button>
      )}      
    </div>
  )
}
