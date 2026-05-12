import React, { useEffect, useState, useRef } from 'react';
import { GaleneContext, GaleneContextState, GaleneParticipant, GaleneTrack } from '../GaleneContext';
import { ServerConnection } from '../../../../../@galene/protocol';

interface GaleneRoomProps {
  serverUrl?: string;
  token?: string;
  groupName: string;
  username?: string;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  onDisconnected?: (reason?: any) => void;
  children: React.ReactNode;
}

type StreamSource = 'camera' | 'screen_share' | 'microphone';

const labelToSource = (label: string | null | undefined): StreamSource => {
  if (label === 'screenshare') return 'screen_share';
  return 'camera';
};

export const GaleneRoom: React.FC<GaleneRoomProps> = ({
  serverUrl,
  token,
  groupName,
  username = 'User',
  audioEnabled = false,
  videoEnabled = false,
  onDisconnected,
  children,
}) => {
  const [state, setState] = useState<GaleneContextState>({
    connection: null,
    status: 'disconnected',
    participants: [],
    tracks: [],
    error: null,
  });

  // Latest status, read by onclose to decide whether the close was "user left
  // a joined room" or "connect failed before join".

  const statusRef = useRef(state.status);
  statusRef.current = state.status;
  useEffect(() => {
    if (!serverUrl || !token) return;

    console.log('🚀 Initialisation de Galène...', { serverUrl, groupName });

    const conn = new ServerConnection();
    let disposed = false;

    const localParticipant: GaleneParticipant = {
      id: 'local',
      username,
      isLocal: true,
      isSpeaking: false,
    };

    setState((prev) => ({
      ...prev,
      connection: conn,
      status: 'connecting',
      participants: [localParticipant],
      tracks: [],
      error: null,
    }));

    conn.onerror = (e: any) => {
      console.error('❌ Erreur Galène:', e);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: e?.message ?? String(e),
      }));
    };

    conn.onconnected = async () => {
      console.log('✅ Connecté au WebSocket Galène');
      try {
        await conn.join(groupName, username, { type: 'token', token });
      } catch (e: any) {
        console.error('Erreur de join:', e);
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: e?.message ?? String(e),
        }));
      }
    };

    conn.onjoined = (
      kind: string,
      group: string,
      _perms: any,
      _status: any,
      _data: any,
      error: any,
      message: any
    ) => {
      console.log('🎉 onjoined', kind, group, message ?? error ?? '');

      switch (kind) {
        case 'fail':
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: message || error || 'Join failed',
          }));
          // protocol's send() is now usable; close cleanly. onclose will fire.
          conn.close();
          return;
        case 'redirect':
          // The server is asking us to go elsewhere; leave the redirect to the
          // app shell. Treat it like a clean disconnect.
          conn.close();
          if (typeof message === 'string' && message) {
            window.location.href = message;
          }
          return;
        case 'leave':
          // Server-initiated leave; let onclose handle the navigation.
          return;
        case 'join':
        case 'change':
          break;
        default:
          console.warn('Unknown onjoined kind:', kind);
          return;
      }

      setState((prev) => ({ ...prev, status: 'joined' }));

      try {
        conn.request({ '': ['audio', 'video'] });
      } catch (e) {
        console.error('Erreur request:', e);
      }

      if (videoEnabled || audioEnabled) {
        publishLocalStream(conn, videoEnabled, audioEnabled).catch((e) =>
          console.error('Erreur publishLocalStream:', e)
        );
      }
    };

    conn.onuser = (id: string, kind: string) => {
      if (disposed) return;
      const remoteUser = conn.users?.[id];
      setState((prev) => {
        if (kind === 'delete') {
          return {
            ...prev,
            participants: prev.participants.filter((p) => p.id !== id),
          };
        }
        if (!remoteUser) return prev;
        const participant: GaleneParticipant = {
          id,
          username: remoteUser.username || 'Participant',
          isLocal: false,
          isSpeaking: false,
        };
        const exists = prev.participants.some((p) => p.id === id);
        if (kind === 'add' && !exists) {
          return { ...prev, participants: [...prev.participants, participant] };
        }
        if (kind === 'change' && exists) {
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.id === id ? { ...p, username: participant.username } : p
            ),
          };
        }
        return prev;
      });
    };

    conn.ondownstream = (s: any) => {
      console.log('🎥 Nouveau flux distant', s.id, s.label, s.source);

      const participantId: string = s.source || s.id;
      const remoteUsername: string = s.username || 'Participant';
      const source = labelToSource(s.label);

      s.onclose = () => {
        if (disposed) return;
        console.log('🛑 Flux fermé:', s.id);
        setState((prev) => ({
          ...prev,
          tracks: prev.tracks.filter((t) => t.id !== s.id),
        }));
      };

      s.onerror = (e: any) => console.error('Stream error', s.id, e);

      s.ondowntrack = (
        track: MediaStreamTrack,
        _transceiver: RTCRtpTransceiver,
        stream: MediaStream
      ) => {
        if (disposed) return;
        console.log('🔄 ondowntrack', s.id, track.kind);

        setState((prev) => {
          const existing = prev.tracks.find((t) => t.id === s.id);
          const hasVideo = stream.getVideoTracks().length > 0;
          const kind: 'video' | 'audio' = hasVideo ? 'video' : 'audio';

          const participant: GaleneParticipant = {
            id: participantId,
            username: remoteUsername,
            isLocal: false,
            isSpeaking: false,
          };

          const newTrack: GaleneTrack = {
            id: s.id,
            participantId,
            stream,
            source,
            publication: {
              isSubscribed: true,
              trackSid: s.id,
              kind,
              source,
            },
            participant,
          };

          if (existing) {
            return {
              ...prev,
              tracks: prev.tracks.map((t) => (t.id === s.id ? newTrack : t)),
            };
          }
          return { ...prev, tracks: [...prev.tracks, newTrack] };
        });
      };
    };

    conn.onclose = () => {
      if (disposed) return;
      console.log('❌ Connexion Galène fermée (status précédent:', statusRef.current, ')');
      const wasJoined = statusRef.current === 'joined';
      setState((prev) => ({
        ...prev,
        status: 'disconnected',
        tracks: [],
        participants: [],
        connection: null,
      }));
      // Only treat this as a "leave" worth notifying the parent about if the
      // user actually made it into the room. Closes during 'connecting' or
      // 'error' surface via the in-room error state instead.
      if (onDisconnected && wasJoined) onDisconnected();
    };

    try {
      conn.connect(serverUrl);
    } catch (e: any) {
      console.error('Erreur connect:', e);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: e?.message ?? String(e),
      }));
    }

    return () => {
      disposed = true;
      try {
        conn.close();
      } catch (_) {
        // May warn in dev (StrictMode) — harmless
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl, token, groupName]);

  const publishLocalStream = async (conn: any, video: boolean, audio: boolean) => {
    const ms = await navigator.mediaDevices.getUserMedia({ audio, video });
    const s = conn.newUpStream();
    s.label = 'camera';
    s.setStream(ms);

    const addUpTrack = (t: MediaStreamTrack) => {
      try {
        s.pc.addTransceiver(t, { direction: 'sendonly', streams: [ms] });
      } catch (e) {
        console.error('addTransceiver failed', e);
      }
    };

    ms.getTracks().forEach(addUpTrack);

    ms.onaddtrack = (e: MediaStreamTrackEvent) => addUpTrack(e.track);
    ms.onremovetrack = (e: MediaStreamTrackEvent) => {
      const sender = s.pc.getSenders().find((sd: any) => sd.track === e.track);
      if (sender) s.pc.removeTrack(sender);
    };

    s.onclose = () => {
      ms.getTracks().forEach((t) => t.stop());
    };

    const localTrack: GaleneTrack = {
      id: s.id,
      participantId: 'local',
      stream: ms,
      source: 'camera',
      publication: {
        isSubscribed: true,
        trackSid: s.id,
        kind: ms.getVideoTracks().length > 0 ? 'video' : 'audio',
        source: 'camera',
      },
      participant: {
        id: 'local',
        username,
        isLocal: true,
        isSpeaking: false,
      },
    };

    setState((prev) => ({ ...prev, tracks: [...prev.tracks, localTrack] }));
  };

  return <GaleneContext.Provider value={state}>{children}</GaleneContext.Provider>;
};
