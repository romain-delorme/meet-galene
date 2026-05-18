import React, { useEffect, useState, useRef, useCallback } from 'react';
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

/**
 * Find the local camera upstream, if any.
 */
function cameraStream(conn: any): any | null {
  for (const id in conn.up) {
    const s = conn.up[id];
    if (s.label === 'camera') return s;
  }
  return null;
}

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

  // Track the last status so onclose can decide whether to fire onDisconnected.
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

    conn.onconnected = async function () {
      console.log('✅ Connecté au WebSocket Galène');
      try {
        const creds = token
          ? { type: 'token', token }
          : { type: 'password', password: '' };
        await conn.join(groupName, username, creds);
      } catch (e: any) {
        console.error('Erreur de join:', e);
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: e?.message ?? String(e),
        }));
      }
    };

    conn.onchat = function (
      id: string,
      _source: string,
      dest: string,
      chatUsername: string,
      _time: Date,
      _privileged: boolean,
      _history: boolean,
      _kind: string,
      message: string,
    ) {
      console.log(`💬 Chat ${chatUsername}${dest ? ' → ' + dest : ''}: ${message}`);
    };

    conn.onusermessage = function (
      _id: string,
      _dest: string,
      _msgUsername: string,
      _time: Date,
      privileged: boolean,
      kind: string,
      _error: string,
      message: unknown,
    ) {
      switch (kind) {
        case 'kicked':
        case 'error':
        case 'warning':
        case 'info':
          if (!privileged) {
            console.error(`Got unprivileged message of kind ${kind}`);
            return;
          }
          console.warn(`⚠️ ${kind}: ${message}`);
          if (kind === 'error' || kind === 'kicked') {
            setState((prev) => ({
              ...prev,
              error: String(message),
            }));
          }
          break;
        case 'clearchat':
          if (!privileged) {
            console.error(`Got unprivileged message of kind ${kind}`);
            return;
          }
          break;
      }
    };

    conn.onjoined = async function (
      kind: string,
      group: string,
      _perms: any,
      _status: any,
      _data: any,
      error: any,
      message: any,
    ) {
      console.log('🎉 onjoined', kind, group, message ?? error ?? '');

      switch (kind) {
        case 'fail':
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: message || error || 'Join failed',
          }));
          conn.close();
          break;
        case 'redirect':
          conn.close();
          if (typeof message === 'string' && message) {
            window.location.href = message;
          }
          return;
        case 'leave':
          setState((prev) => ({ ...prev, status: 'connected' }));
          conn.close();
          break;
        case 'join':
        case 'change':
          console.log(
            `Connected as ${conn.username} in group ${conn.group}.`,
          );
          setState((prev) => ({ ...prev, status: 'joined' }));

          // Request audio & video from other participants
          try {
            conn.request({ '': ['audio', 'video'] });
          } catch (e) {
            console.error('Erreur request:', e);
          }

          // Publish local camera if requested
          if ((videoEnabled || audioEnabled) && !cameraStream(conn)) {
            showCamera(conn, videoEnabled, audioEnabled).catch((e: any) =>
              console.error('Erreur showCamera:', e),
            );
          }
          break;
        default:
          console.warn(`Unexpected onjoined kind: ${kind}`);
          conn.close();
          break;
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
              p.id === id ? { ...p, username: participant.username } : p,
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

      s.onclose = function (_replace: boolean) {
        if (disposed) return;
        console.log('🛑 Flux fermé:', s.id);
        setState((prev) => ({
          ...prev,
          tracks: prev.tracks.filter((t) => t.id !== s.id),
        }));
      };

      s.ondowntrack = function (
        track: MediaStreamTrack,
        _transceiver: RTCRtpTransceiver,
        stream: MediaStream,
      ) {
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

    conn.onerror = (e: any) => {
      console.error('❌ Erreur Galène:', e);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: e?.message ?? String(e),
      }));
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
        // Ignore 
      }
    };
  }, [serverUrl, token, groupName]);

  async function showCamera(conn: any, video: boolean, audio: boolean) {
    const ms = await navigator.mediaDevices.getUserMedia({ audio, video });
    const s = conn.newUpStream();
    s.label = 'camera';
    s.setStream(ms);
    s.onclose = function (_replace: boolean) {
      ms.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      setState((prev) => ({
        ...prev,
        tracks: prev.tracks.filter((t) => t.id !== s.id && t.id !== s.localId),
      }));
    };

    function addTrack(t: MediaStreamTrack) {
      t.onended = function () {
        s.close();
      };
      s.pc.addTransceiver(t, {
        direction: 'sendonly',
        streams: [ms],
      });
    }

    ms.getTracks().forEach(addTrack);
    ms.onaddtrack = (e: MediaStreamTrackEvent) => {
      addTrack(e.track);
    };
    const localTrack: GaleneTrack = {
      id: s.localId,
      participantId: 'local',
      stream: ms,
      source: 'camera',
      publication: {
        isSubscribed: true,
        trackSid: s.localId,
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
  }

  return <GaleneContext.Provider value={state}>{children}</GaleneContext.Provider>;
};
