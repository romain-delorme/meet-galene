import { useContext } from 'react'
import { css } from '@/styled-system/css'
import { GaleneContext } from '../../../GaleneContext'
import {
  RiHand,
  RiMicLine,
  RiMicOffLine,
  RiVideoOnLine,
  RiVideoOffLine,
} from '@remixicon/react'

export function ParticipantsList() {
  const { participants, isAudioEnabled, isVideoEnabled } = useContext(GaleneContext)

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      })}
    >
      {/* Header */}
      <div
        className={css({
          padding: '0.75 1',
          borderBottom: '1px solid',
          borderColor: 'primaryDark.100',
          color: 'black',
          fontWeight: 'semibold',
          fontSize: '14',
          flexShrink: 0,
        })}
      >
        Participants ({participants.length})
      </div>

      {/* List */}
      <div
        className={css({
          flex: 1,
          overflowY: 'auto',
          padding: '0.5',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25',
        })}
      >
        {participants.map((p) => {
          const micOn = p.isLocal ? isAudioEnabled : (p.hasAudio ?? false)
          const camOn = p.isLocal ? isVideoEnabled : (p.hasVideo ?? false)

          return (
            <div
              key={p.id}
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '0.5',
                padding: '0.375 0.5',
                borderRadius: '4',
                _hover: { bg: 'gray.200' },
              })}
            >
              {/* Avatar */}
              <div
                className={css({
                  width: '2rem',
                  height: '2rem',
                  borderRadius: 'full',
                  bg: 'primary.500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'black',
                  fontSize: '13',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                })}
              >
                {p.username.charAt(0)}
              </div>

              {/* Name */}
              <span
                className={css({
                  color: 'black',
                  fontWeight: 'bold',
                  fontSize: '13',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                })}
              >
                {p.username}
                {p.isLocal && (
                  <span className={css({ color: 'primaryDark.300', marginLeft: '0.25' })}>
                    (vous)
                  </span>
                )}
              </span>

              {/* Status Icons */}
              <div
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375',
                  flexShrink: 0,
                })}
              >
                {micOn ? (
                  <RiMicLine size={16} className={css({ color: 'primary.500' })} />
                ) : (
                  <RiMicOffLine size={16} className={css({ color: 'error.400' })} />
                )}

                {camOn ? (
                  <RiVideoOnLine size={16} className={css({ color: 'primary.500' })} />
                ) : (
                  <RiVideoOffLine size={16} className={css({ color: 'error.400' })} />
                )}

                {p.handRaisedAt && (
                  <RiHand size={16} className={css({ color: 'yellow.400' })} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}