import { useTranslation } from 'react-i18next'
import { css } from '@/styled-system/css'
import { Screen } from '@/layout/Screen'
import { useEffect, useMemo, useRef, useState } from 'react'
import { H } from '@/primitives/H'
import { Field } from '@/primitives/Field'
import { Button, Form, Text } from '@/primitives'
import { VStack } from '@/styled-system/jsx'
import { isMobileBrowser, isSafari } from '@/utils/browser'
import { fetchRoom } from '@/features/rooms/api/fetchRoom'
import { keys } from '@/api/queryKeys'
import { useLobby } from '../hooks/useLobby'
import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/api/queryClient'
import { ApiLobbyStatus, ApiRequestEntry } from '../api/requestEntry'
import { Spinner } from '@/primitives/Spinner'
import { ApiAccessLevel } from '../api/ApiRoom'
import { useLoginHint } from '@/hooks/useLoginHint'
import { openPermissionsDialog } from '@/stores/permissions'
import { usePersistentUserChoices } from '../galene/hooks/usePersistentUserChoices'
import { useCannotUseDevice } from '../galene/hooks/useCannotUseDevice'
import { useUser } from '@/features/auth'
import { SelectDevice } from '../galene/components/controls/SelectDevice'
import { ToggleDevice } from '../galene/components/controls/ToggleDevice'

export const Join = ({
  enterRoom,
  roomId,
}: {
  enterRoom: () => void
  roomId: string
}) => {
  const { t } = useTranslation('rooms', { keyPrefix: 'join' })

  const { user } = useUser()

  const {
    userChoices: {
      audioEnabled,
      videoEnabled,
      audioDeviceId,
      audioOutputDeviceId,
      videoDeviceId,
      username,
    },
    saveAudioInputEnabled,
    saveAudioOutputDeviceId,
    saveVideoInputEnabled,
    saveAudioInputDeviceId,
    saveVideoInputDeviceId,
    saveUsername,
  } = usePersistentUserChoices()

  useEffect(() => {
    if (!username && user?.email) {
      saveUsername(user.email)
    }
  }, [user?.email])

  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null)
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null)
  const videoEl = useRef<HTMLVideoElement>(null)
  const isVideoInitiated = useRef(false)

  // Video track lifecycle — restart when enabled state or device changes
  useEffect(() => {
    if (!videoEnabled) {
      setVideoTrack(null)
      return
    }
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({
        video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        setVideoTrack(stream.getVideoTracks()[0])
      })
      .catch((err) => console.error('Video preview error:', err))
    return () => {
      cancelled = true
    }
  }, [videoEnabled, videoDeviceId])

  // Audio track lifecycle — restart when enabled state or device changes
  useEffect(() => {
    if (!audioEnabled) {
      setAudioTrack(null)
      return
    }
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        setAudioTrack(stream.getAudioTracks()[0])
      })
      .catch((err) => console.error('Audio preview error:', err))
    return () => {
      cancelled = true
    }
  }, [audioEnabled, audioDeviceId])

  // Stop tracks when replaced or when component unmounts
  useEffect(() => {
    return () => {
      videoTrack?.stop()
    }
  }, [videoTrack])

  useEffect(() => {
    return () => {
      audioTrack?.stop()
    }
  }, [audioTrack])

  // Attach video track to the preview element
  useEffect(() => {
    const el = videoEl.current
    if (!el) return

    const handleLoaded = () => {
      el.style.opacity = '1'
      isVideoInitiated.current = true
    }

    if (!videoTrack) {
      el.srcObject = null
      el.style.opacity = '0'
      isVideoInitiated.current = false
      return
    }

    el.srcObject = new MediaStream([videoTrack])
    el.addEventListener('loadedmetadata', handleLoaded)
    el.play().catch(() => { })

    return () => {
      el.removeEventListener('loadedmetadata', handleLoaded)
      el.srcObject = null
      el.style.opacity = '0'
      isVideoInitiated.current = false
    }
  }, [videoTrack])

  // Room data — fetched once on submit, cached for 6 hours (Galene token lifetime)
  const {
    data: roomData,
    error,
    isError,
    refetch: refetchRoom,
  } = useQuery({
    /* eslint-disable @tanstack/query/exhaustive-deps */
    queryKey: [keys.room, roomId],
    queryFn: () => fetchRoom({ roomId, username }),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
    enabled: false,
  })

  useEffect(() => {
    if (isError && (error as any)?.statusCode === '404') {
      enterRoom()
    }
  }, [isError, error, enterRoom])

  const handleAccepted = (response: ApiRequestEntry) => {
    queryClient.setQueryData([keys.room, roomId], {
      ...roomData,
      galene: response.galene,
    })
    enterRoom()
  }

  const { status, startWaiting } = useLobby({
    roomId,
    username,
    onAccepted: handleAccepted,
  })

  const { openLoginHint } = useLoginHint()

  const handleSubmit = async () => {
    const { data } = await refetchRoom()

    if (!data?.galene) {
      if (data?.access_level == ApiAccessLevel.TRUSTED) {
        openLoginHint()
      }
      startWaiting()
      return
    }

    enterRoom()
  }

  const isCameraDeniedOrPrompted = useCannotUseDevice('videoinput')
  const isMicrophoneDeniedOrPrompted = useCannotUseDevice('audioinput')

  const hintMessage = useMemo(() => {
    if (isCameraDeniedOrPrompted) {
      return isMicrophoneDeniedOrPrompted
        ? 'cameraAndMicNotGranted'
        : 'cameraNotGranted'
    }
    if (!videoEnabled) {
      return 'cameraDisabled'
    }
    if (!isVideoInitiated.current) {
      return 'cameraStarting'
    }
    if (videoTrack && videoEnabled) {
      return ''
    }
  }, [
    videoTrack,
    videoEnabled,
    isCameraDeniedOrPrompted,
    isMicrophoneDeniedOrPrompted,
  ])

  const permissionsButtonLabel = useMemo(() => {
    if (!isMicrophoneDeniedOrPrompted && !isCameraDeniedOrPrompted) {
      return null
    }
    if (isCameraDeniedOrPrompted && isMicrophoneDeniedOrPrompted) {
      return 'cameraAndMicNotGranted'
    }
    if (isCameraDeniedOrPrompted && !isMicrophoneDeniedOrPrompted) {
      return 'cameraNotGranted'
    }
    return null
  }, [isMicrophoneDeniedOrPrompted, isCameraDeniedOrPrompted])

  const renderWaitingState = () => {
    switch (status) {
      case ApiLobbyStatus.TIMEOUT:
        return (
          <VStack alignItems="center" textAlign="center">
            <H lvl={1} margin={false} centered>
              {t('timeoutInvite.title')}
            </H>
            <Text as="p" variant="note">
              {t('timeoutInvite.body')}
            </Text>
          </VStack>
        )

      case ApiLobbyStatus.DENIED:
        return (
          <VStack alignItems="center" textAlign="center">
            <H lvl={1} margin={false} centered>
              {t('denied.title')}
            </H>
            <Text as="p" variant="note">
              {t('denied.body')}
            </Text>
          </VStack>
        )

      case ApiLobbyStatus.WAITING:
        return (
          <VStack alignItems="center" textAlign="center">
            <H lvl={1} margin={false} centered>
              {t('waiting.title')}
            </H>
            <Text
              as="p"
              variant="note"
              className={css({ marginBottom: '1.5rem' })}
            >
              {t('waiting.body')}
            </Text>
            <Spinner />
          </VStack>
        )

      default:
        return (
          <Form
            onSubmit={handleSubmit}
            submitLabel={t('joinLabel')}
            submitButtonProps={{
              fullWidth: true,
            }}
          >
            <VStack marginBottom={1}>
              <H lvl={1} margin="sm" centered>
                {t('heading')}
              </H>
              <Field
                type="text"
                onChange={saveUsername}
                label={t('usernameLabel')}
                id="input-name"
                defaultValue={username}
                validate={(value) => !value && t('errors.usernameEmpty')}
                wrapperProps={{
                  noMargin: true,
                  fullWidth: true,
                }}
                autoComplete="name"
                maxLength={50}
              />
            </VStack>
          </Form>
        )
    }
  }

  return (
    <Screen footer={false}>
      <div
        className={css({
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          flexDirection: 'column',
          flexGrow: 1,
          gap: { base: '1rem', sm: '2rem', lg: '2rem' },
          lg: {
            flexDirection: 'row',
          },
        })}
      >
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minWidth: 0,
            maxWidth: '764px',
            lg: {
              height: '540px',
              flexGrow: 1,
            },
          })}
        >
          <div
            className={css({
              display: 'inline-flex',
              flexDirection: 'column',
              flexGrow: 1,
              minWidth: 0,
              flexShrink: { base: 0, sm: 1 },
            })}
          >
            <div
              className={css({
                borderRadius: '1rem',
                flex: '0 1',
                minWidth: '320px',
                margin: {
                  base: '0.5rem',
                  sm: '1rem',
                  lg: '1rem 0.5rem 1rem 1rem',
                },
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              })}
            >
              <div
                className={css({
                  position: 'absolute',
                  top: 0,
                  height: '5rem',
                  width: '100%',
                  backgroundImage:
                    'linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.3) 40%, rgba(0, 0, 0, 0.1) 80%, rgba(0, 0, 0, 0) 100%)',
                  zIndex: 1,
                })}
              />
              <div
                className={css({
                  position: 'absolute',
                  bottom: 0,
                  height: '5rem',
                  width: '100%',
                  backgroundImage:
                    'linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.3) 35%, rgba(0, 0, 0, 0.1) 75%, rgba(0, 0, 0, 0) 100%)',
                  zIndex: 1,
                })}
              />
              <div
                className={css({
                  position: 'relative',
                  width: '100%',
                  height: 'fit-content',
                  aspectRatio: '16 / 9',
                })}
              >
                <div
                  className={css({
                    backgroundColor: 'black',
                    position: 'absolute',
                    boxSizing: 'border-box',
                    top: 0,
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                  })}
                >
                  <div
                    aria-label={t(
                      `videoPreview.${videoEnabled ? 'enabled' : 'disabled'}`
                    )}
                    role="status"
                    className={css({
                      position: 'absolute',
                      top: 0,
                      width: '100%',
                    })}
                  >
                    <div
                      className={css({
                        width: '100%',
                        height: 'auto',
                        aspectRatio: '16 / 9',
                        overflow: 'hidden',
                        position: 'absolute',
                        top: '-2px',
                        left: '-2px',
                        pointerEvents: 'none',
                        transform: 'scale(1.02)',
                      })}
                    >
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video
                        ref={videoEl}
                        width="1280"
                        height="720"
                        muted
                        playsInline
                        style={{
                          display:
                            !videoEnabled || isCameraDeniedOrPrompted
                              ? 'none'
                              : undefined,
                        }}
                        className={css({
                          position: 'absolute',
                          transform: 'rotateY(180deg)',
                          opacity: 0,
                          height: '100%',
                          transition: 'opacity 0.3s ease-in-out',
                          objectFit: 'cover',
                        })}
                        disablePictureInPicture
                        disableRemotePlayback
                      />
                    </div>
                  </div>
                  <div
                    role="alert"
                    className={css({
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      width: '100%',
                      justifyContent: 'center',
                      textAlign: 'center',
                      alignItems: 'center',
                      padding: '0.24rem',
                      boxSizing: 'border-box',
                      gap: '1rem',
                    })}
                  >
                    <p
                      className={css({
                        fontWeight: '400',
                        fontSize: { base: '1rem', sm: '1.25rem', lg: '1.5rem' },
                        textWrap: 'balance',
                        color: 'white',
                      })}
                    >
                      {hintMessage && t(hintMessage)}
                    </p>
                    {isCameraDeniedOrPrompted && (
                      <Button
                        size="sm"
                        variant="tertiary"
                        onPress={() => openPermissionsDialog('videoinput')}
                      >
                        {t(`permissionsButton.${permissionsButtonLabel}`)}
                      </Button>
                    )}
                  </div>
                </div>
                <div
                  className={css({
                    position: 'absolute',
                    bottom: '1rem',
                    zIndex: '1',
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  })}
                >
                  <ToggleDevice
                    kind="audioinput"
                    context="join"
                    enabled={audioEnabled}
                    toggle={() => saveAudioInputEnabled(!audioEnabled)}
                  />
                  <ToggleDevice
                    kind="videoinput"
                    context="join"
                    enabled={videoEnabled}
                    toggle={() => saveVideoInputEnabled(!videoEnabled)}
                  />
                </div>
              </div>
            </div>
            <div
              className={css({
                display: 'flex',
                justifyContent: 'center',
                gap: '2%',
                width: '80%',
                marginX: 'auto',
              })}
            >
              <div className={css({ width: '30%' })}>
                <SelectDevice
                  kind="audioinput"
                  id={audioDeviceId}
                  onSubmit={saveAudioInputDeviceId}
                />
              </div>
              {!isSafari() && (
                <div className={css({ width: '30%' })}>
                  <SelectDevice
                    kind="audiooutput"
                    id={audioOutputDeviceId}
                    onSubmit={saveAudioOutputDeviceId}
                  />
                </div>
              )}
              <div className={css({ width: '30%' })}>
                <SelectDevice
                  kind="videoinput"
                  id={videoDeviceId}
                  onSubmit={saveVideoInputDeviceId}
                />
              </div>
            </div>
          </div>
        </div>
        <div
          className={css({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: '0 0 360px',
            position: 'relative',
            margin: '1rem 1rem 1rem 0.5rem',
          })}
        >
          {renderWaitingState()}
        </div>
      </div>
    </Screen>
  )
}
