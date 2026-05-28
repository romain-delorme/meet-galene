import { useContext, useRef, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { css } from '@/styled-system/css'
import { GaleneContext, type ChatMessage } from '../../../GaleneContext'

const ONE_MINUTE_MS = 60_000

const AVATAR_COLORS = [
  '#6A6AF4', '#4CAF7D', '#E67E22', '#E91E63', '#9C27B0',
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5',
]

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function isSameGroup(a: ChatMessage, b: ChatMessage): boolean {
  return a.peerId === b.peerId && b.time.getTime() - a.time.getTime() < ONE_MINUTE_MS
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Chat() {
  const { messages, sendMessage } = useContext(GaleneContext)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    sendMessage(trimmed)
    setInput('')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' })}>
      {/* Messages */}
      <div className={css({
        flex: 1,
        overflowY: 'auto',
        padding: '0.5 0',
        display: 'flex',
        flexDirection: 'column',
      })}>
        {messages.length === 0 && (
          <div className={css({
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primaryDark.400',
            fontSize: '13',
            textAlign: 'center',
            padding: '1',
            marginTop: '2',
          })}>
            Aucun message pour l'instant
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const grouped = prev ? isSameGroup(prev, msg) : false
          const isPrivate = !!msg.dest
          const isMe = msg.kind === 'me'
          const color = avatarColor(msg.nick)

          return (
            <div
              key={msg.id}
              className={css({
                display: 'flex',
                gap: '0.625',
                paddingTop: grouped ? '0.125' : '0.625',
                paddingBottom: '0.125',
                paddingLeft: '0.75',
                paddingRight: '0.75',
                _hover: { bg: 'primaryDark.75' },
              })}
            >
              {/* Avatar column — always 32px wide for alignment */}
              <div className={css({ width: '2rem', flexShrink: 0, paddingTop: '0.125' })}>
                {!grouped && (
                  <div
                    style={{ background: color }}
                    className={css({
                      width: '2rem',
                      height: '2rem',
                      borderRadius: 'full',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '13',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      userSelect: 'none',
                      flexShrink: 0,
                    })}
                  >
                    {msg.nick.charAt(0)}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className={css({ flex: 1, minWidth: 0 })}>
                {!grouped && (
                  <div className={css({ display: 'flex', alignItems: 'baseline', gap: '0.5', marginBottom: '0.125' })}>
                    <span className={css({ color: 'white', fontWeight: 'semibold', fontSize: '14', lineHeight: '1' })}>
                      {msg.nick}
                    </span>
                    {isPrivate && (
                      <span className={css({ color: 'yellow.300', fontSize: '11' })}>→ {msg.dest}</span>
                    )}
                    <span className={css({ color: 'primaryDark.400', fontSize: '11' })}>
                      {formatTime(msg.time)}
                    </span>
                  </div>
                )}
                <p className={css({
                  margin: '0',
                  fontSize: '13',
                  lineHeight: '1.45',
                  wordBreak: 'break-word',
                  color: isPrivate ? 'yellow.200' : isMe ? 'primaryDark.600' : 'primaryDark.900',
                  fontStyle: isMe ? 'italic' : 'normal',
                })}>
                  {isMe ? `* ${msg.nick} ${msg.message}` : msg.message}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className={css({
          padding: '0.5 0.75 0.75',
          flexShrink: 0,
        })}
      >
        <div className={css({
          display: 'flex',
          alignItems: 'center',
          bg: 'primaryDark.100',
          borderRadius: '6',
          border: '1px solid',
          borderColor: 'primaryDark.200',
          _focusWithin: { borderColor: 'primary.500' },
          overflow: 'hidden',
        })}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Envoyer un message…"
            className={css({
              flex: 1,
              bg: 'transparent',
              color: 'white',
              border: 'none',
              padding: '0.5 0.75',
              fontSize: '13',
              outline: 'none',
              _placeholder: { color: 'primaryDark.400' },
            })}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={css({
              bg: 'transparent',
              border: 'none',
              padding: '0 0.625 0 0',
              cursor: 'pointer',
              color: 'primary.500',
              display: 'flex',
              alignItems: 'center',
              _hover: { color: 'primary.400' },
              _disabled: { color: 'primaryDark.300', cursor: 'default' },
            })}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}