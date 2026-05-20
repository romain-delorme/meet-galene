import { Button } from '@/primitives'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePersistentUserChoices } from '@/features/rooms/galene/hooks/usePersistentUserChoices'

export const SoundTester = () => {
  const { t } = useTranslation('settings')
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const { userChoices: { audioOutputDeviceId } } = usePersistentUserChoices()

  useEffect(() => {
    const updateActiveId = async (deviceId: string) => {
      try {
        await audioRef?.current?.setSinkId(deviceId)
      } catch (error) {
        console.error(`Error setting sinkId: ${error}`)
      }
    }
    if (audioOutputDeviceId) updateActiveId(audioOutputDeviceId)
  }, [audioOutputDeviceId])

  // prevent pausing the sound
  navigator.mediaSession.setActionHandler('pause', function () {})

  return (
    <>
      <Button
        variant="secondaryText"
        onPress={() => {
          audioRef?.current?.play()
          setIsPlaying(true)
        }}
        size="sm"
        isDisabled={isPlaying}
        fullWidth
        style={{
          color: isPlaying ? 'var(--colors-primary)' : undefined,
        }}
      >
        {isPlaying ? t('audio.speakers.ongoingTest') : t('audio.speakers.test')}
      </Button>
      {/* eslint-disable jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src="sounds/uprise.mp3"
        onEnded={() => setIsPlaying(false)}
      />
    </>
  )
}
