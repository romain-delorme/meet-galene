import React, { useEffect, useRef, useContext, useState } from 'react'
import { css } from '@/styled-system/css'
import { GaleneTrack, GaleneContext } from '../GaleneContext'
import { RiCloseCircleLine, RiCloseLargeLine, RiEyeLine, RiEyeOffLine, RiHand, RiMicOffLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/primitives'
import { HStack } from '@/styled-system/jsx'
import { RiPushpin2Line, RiUnpinLine } from '@remixicon/react'




interface GaleneParticipantTileProps {
  track: GaleneTrack
  isPinned?: boolean
  onPin?: () => void
}

/**
 * Renders a single participant's video tile.
 * Attaches the MediaStream to a <video> element and shows a name overlay.
 */
export function GaleneParticipantTile({ track, isPinned = false, onPin }: GaleneParticipantTileProps) {
  const [hidden, setHidden] = useState(false);
  const [hover, setHover] = useState(false);
  const [hasKeyboardFocus, setHasKeyboardFocus] = React.useState(false)
  const { t } = useTranslation('rooms', { keyPrefix: 'participantTileFocus' })
  const { isAudioEnabled, isVideoEnabled, stopScreenShare, participants } = useContext(GaleneContext)
  const liveParticipant = participants.find((p) => p.id === track.participantId)
  const isHandRaised = !!liveParticipant?.handRaisedAt
  const videoRef = useRef<HTMLVideoElement>(null)

  const isLocal = track.participant?.isLocal ?? false
  const displayName = track.participant?.username ?? 'Participant'
  const isCamera = track.source === 'camera';
  const isLocalScreenShare = isLocal && track.source === 'screen_share';

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
    if (hidden) track.stream.getTracks().forEach((t: MediaStreamTrack) => t.enabled = true)
    else track.stream.getTracks().forEach((t: MediaStreamTrack) => t.enabled = false);
    setHidden(!hidden)
  };


  return (
    <div
      aria-label={t('containerLabel', { name: displayName })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      pointer-events='none'
      onFocus={(event) => {
        const target = event.target as HTMLElement | null
        setHasKeyboardFocus(!!target?.matches?.(':focus-visible'))
      }}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null
        if (!event.currentTarget.contains(nextTarget)) setHasKeyboardFocus(false)
      }}
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
      {isHandRaised && (
        <div
          className={css({
            position: 'absolute',
            top: '0',
            left: '0',
            padding: '0.375 0.5',
            zIndex: 1,
          })}
        >
          <span
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bg: 'rgba(0,0,0,0.5)',
              borderRadius: '4',
              padding: '0.25',
              color: 'yellow.400',
            })}
          >
            <RiHand size={16} />
          </span>
        </div>
      )}

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

      {hover && (
        <div
          className={css({
            position: 'absolute',
            backgroundColor: 'primaryDark.50',
            transition: 'opacity 200ms linear',
            zIndex: 1,
            borderRadius: '0.25rem',
            display: 'flex',
            _hover: { opacity: '0.95 !important' },
          })}
          style={{ opacity: 0.6 }}
        >
          <HStack
            gap={0.5}
            className={css({ padding: '0.5rem', _hover: { opacity: '1 !important' } })}
          >
            <Button
              size="sm"
              variant="primaryTextDark"
              square
              tooltip={isPinned ? t('pin.disable') : t('pin.enable')}
              onPress={onPin}
            >
              {isPinned ? <RiUnpinLine /> : <RiPushpin2Line />}
            </Button>
            <Button
              size="sm"
              variant="primaryTextDark"
              square
              tooltip={isLocalScreenShare? 'Arrêter le partage' : (hidden? 'Afficher la vidéo' : 'Masquer la vidéo')}
              onPress={isLocalScreenShare? () => stopScreenShare(track) : toggleStream}
            >
              {isLocalScreenShare ? <RiCloseLargeLine /> : hidden? <RiEyeLine /> : <RiEyeOffLine />}
            </Button>
          </HStack>
        </div>

      )}
    </div>
  )
}
