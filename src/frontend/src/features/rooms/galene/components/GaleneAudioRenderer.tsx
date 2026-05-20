import { useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'
import { GaleneTrack } from '../GaleneContext'
import { userChoicesStore } from '@/stores/userChoices'

interface GaleneAudioRendererProps {
  tracks: GaleneTrack[]
}

/**
 * Renders hidden <audio> elements for each remote audio track so participants can hear each other.
 * Only renders remote tracks (local audio is already played by the microphone).
 */
export function GaleneAudioRenderer({ tracks }: GaleneAudioRendererProps) {
  return (
    <>
      {tracks
        .filter((t) => !t.participant?.isLocal)
        .map((track) => (
          <AudioElement key={track.id} track={track} />
        ))}
    </>
  )
}

function AudioElement({ track }: { track: GaleneTrack }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const { audioOutputDeviceId } = useSnapshot(userChoicesStore)

  useEffect(() => {
    const el = audioRef.current
    if (!el || !track.stream) return
    if (el.srcObject !== track.stream) {
      el.srcObject = track.stream
    }
  }, [track.stream])

  // Route this audio element to the user's selected output device.
  useEffect(() => {
    const el = audioRef.current
    if (!el || !audioOutputDeviceId) return
    el.setSinkId(audioOutputDeviceId).catch(console.error)
  }, [audioOutputDeviceId])

  {/* eslint-disable jsx-a11y/media-has-caption */}
  return <audio ref={audioRef} autoPlay playsInline />
}
