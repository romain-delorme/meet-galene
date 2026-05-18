import { useContext, useCallback } from 'react'
import { css } from '@/styled-system/css'
import { GaleneContext } from '../GaleneContext'
// import { navigateTo } from '@/navigation/navigateTo'
import {
  RiMicLine,
  RiMicOffLine,
  RiVideoOnLine,
  RiVideoOffLine,
  RiPhoneLine,
  RiArrowUpBoxLine,
} from '@remixicon/react'

/**
 * Minimal control bar for Galène rooms.
 * Provides mic toggle, camera toggle, and a leave button.
 */
export function GaleneControlBar() {
  const { connection, tracks } = useContext(GaleneContext)

  // Find the local video track to determine current camera/mic state
  const localTrack = tracks.find((t) => t.participant?.isLocal)
  const localStream = localTrack?.stream

  const isAudioEnabled =
    localStream?.getAudioTracks().some((t) => t.enabled) ?? false
  const isVideoEnabled =
    localStream?.getVideoTracks().some((t) => t.enabled) ?? false

  const toggleMicrophone = useCallback(() => {
    if (!localStream) return
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled
    })
    // Force re-render by triggering a state update — the GaleneRoom parent
    // will detect the track change via the stream reference
  }, [localStream])

  const toggleCamera = useCallback(() => {
    if (!localStream) return
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled
    })
  }, [localStream])

  const leaveRoom = useCallback(() => {
    if (connection) {
      connection.close()
    }
  }, [connection])

  const newScreenShare = useCallback(async () => {
    if(!localStream) return;
    const newStream: MediaStream = await navigator.mediaDevices.getDisplayMedia();
    newStream.getTracks().forEach((t: MediaStreamTrack) => localStream.addTrack(t))

  }, [localStream])

  const buttonBase = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '3rem',
    height: '3rem',
    borderRadius: 'full',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 150ms ease, transform 100ms ease',
    _hover: {
      transform: 'scale(1.08)',
    },
    _active: {
      transform: 'scale(0.95)',
    },
  })

  const controlButton = css({
    bg: 'primaryDark.100',
    color: 'white',
    _hover: {
      bg: 'primaryDark.200',
    },
  })

  const controlButtonOff = css({
    bg: 'error.400',
    color: 'white',
    _hover: {
      bg: 'error.300',
    },
  })

  const leaveButton = css({
    bg: 'error.500',
    color: 'white',
    _hover: {
      bg: 'error.400',
    },
  })

  return (
    <div
      id="galene-control-bar"
      className={css({
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.75',
        padding: '1',
        zIndex: 100,
      })}
    >
      {/* Microphone toggle */}
      <button
        className={`${buttonBase} ${isAudioEnabled ? controlButton : controlButtonOff}`}
        onClick={toggleMicrophone}
        aria-label={isAudioEnabled ? 'Couper le micro' : 'Activer le micro'}
        title={isAudioEnabled ? 'Couper le micro' : 'Activer le micro'}
      >
        {isAudioEnabled ? (
          <RiMicLine size={20} />
        ) : (
          <RiMicOffLine size={20} />
        )}
      </button>

      {/* Camera toggle */}
      <button
        className={`${buttonBase} ${isVideoEnabled ? controlButton : controlButtonOff}`}
        onClick={toggleCamera}
        aria-label={isVideoEnabled ? 'Couper la caméra' : 'Activer la caméra'}
        title={isVideoEnabled ? 'Couper la caméra' : 'Activer la caméra'}
      >
        {isVideoEnabled ? (
          <RiVideoOnLine size={20} />
        ) : (
          <RiVideoOffLine size={20} />
        )}
      </button>

      <button
        className={`${buttonBase} ${controlButton}`}
        onClick={newScreenShare}
        aria-label="partager l'écran"
        title="partager l'écran"
      >
        <RiArrowUpBoxLine size={20}/>
      </button>

      {/* Leave room */}
      <button
        className={`${buttonBase} ${leaveButton}`}
        onClick={leaveRoom}
        aria-label="Quitter la salle"
        title="Quitter la salle"
      >
        <RiPhoneLine size={20} style={{ transform: 'rotate(135deg)' }} />
      </button>
    </div>
  )
}
