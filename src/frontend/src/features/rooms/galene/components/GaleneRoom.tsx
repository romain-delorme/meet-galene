import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { GaleneContext, GaleneContextState, GaleneParticipant, GaleneTrack, ChatMessage } from '../GaleneContext';
import { ServerConnection } from '../../../../../@galene/protocol';
import type { Stream } from '../../../../../@galene/protocol';
import { userChoicesStore } from '@/stores/userChoices';

interface GaleneRoomProps {
  serverUrl?: string;
  token?: string;
  groupName: string;
  username?: string;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  onDisconnected?: (reason?: unknown) => void;
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
function cameraStream(conn: ServerConnection): Stream | null {
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
  const [isAudioEnabled, setIsAudioEnabled] = useState(audioEnabled);
  const [isVideoEnabled, setIsVideoEnabled] = useState(videoEnabled);
  const [isHandRaised, setIsHandRaised] = useState(false);

  const { audioDeviceId, videoDeviceId } = useSnapshot(userChoicesStore);

  const [state, setState] = useState<GaleneContextState>({
    connection: null,
    status: 'disconnected',
    participants: [],
    tracks: [],
    messages: [],
    sendMessage: () => { },
    isAudioEnabled: audioEnabled,
    isVideoEnabled: videoEnabled,
    isHandRaised: false,
    toggleAudio: () => { },
    toggleVideo: () => { },
    toggleHand: () => { },
    newScreenShare: async () => { },
    stopScreenShare: () => { },
    error: null,
    renameParticipant: async () => {}
  });

  // Track the last status so onclose can decide whether to fire onDisconnected.
  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  const showCamera = useCallback(async (conn: ServerConnection, video: boolean, audio: boolean) => {
    // Always request both tracks so toggles can flip them without restarting the stream.
    // Immediately set enabled to match intent so remote peers see/hear only what's wanted.
    const micId = userChoicesStore.audioDeviceId;
    const camId = userChoicesStore.videoDeviceId;
    let ms: MediaStream;
    try {
      ms = await navigator.mediaDevices.getUserMedia({
        audio: micId ? { deviceId: { exact: micId } } : true,
        video: camId ? { deviceId: { exact: camId } } : true,
      });
    } catch {
      ms = await navigator.mediaDevices.getUserMedia({ audio, video });
    }
    ms.getAudioTracks().forEach((t) => { t.enabled = audio; });
    ms.getVideoTracks().forEach((t) => { t.enabled = video; });
    const s = conn.newUpStream();
    s.label = 'camera';
    s.setStream(ms);
    s.onclose = function () {
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
  }, [username]);

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

    const sendMessage = (message: string, kind = 'chat', dest = '') => {
      try {
        conn.chat(kind, dest, message);
      } catch (e) {
        console.error('sendMessage error:', e);
      }
    };

    setState((prev) => ({
      ...prev,
      connection: conn,
      status: 'connecting',
      participants: [localParticipant],
      tracks: [],
      messages: [],
      sendMessage,
      error: null,
    }));

    conn.onconnected = async function () {
      console.log('✅ Connecté au WebSocket Galène');
      try {
        const creds = token
          ? { type: 'token', token }
          : { type: 'password', password: '' };
        await conn.join(groupName, username, creds);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('Erreur de join:', e);
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: message,
        }));
      }
    };

    conn.onchat = function (
      id: string,
      source: string,
      dest: string,
      chatUsername: string,
      time: Date,
      privileged: boolean,
      history: boolean,
      kind: string,
      message: string,
    ) {
      if (disposed) return;
      if (kind === 'caption') return; // captions handled separately

      const chatMsg: ChatMessage = {
        id: `${id}-${Date.now()}-${Math.random()}`,
        peerId: source,
        dest,
        nick: chatUsername,
        time,
        privileged,
        history,
        kind,
        message,
      };
      setState((prev) => ({ ...prev, messages: [...prev.messages, chatMsg] }));
    };

    conn.onusermessage = function (
      id: string,
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
        case 'raisedHand':
          if (id === conn.id) break; // local state is managed by toggleHand
          setState((prev) => ({
            ...prev,
            participants: prev.participants.map((p) =>
              p.id === id
                ? { ...p, handRaisedAt: message ? new Date().toISOString() : '' }
                : p
            ),
          }));
          break;
      }
    };

    conn.onjoined = async function (
      kind: string,
      group: string,
      _perms: string[],
      _status: Record<string, unknown>,
      _data: Record<string, unknown>,
      error: string | null,
      message: string | null,
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
            showCamera(conn, videoEnabled, audioEnabled).catch((e: unknown) =>
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
      if (id === conn.id) return; // local user is already tracked as 'local'
      const remoteUser = conn.users?.[id];
      setState((prev) => {
        if (kind === 'delete') {
          return {
            ...prev,
            participants: prev.participants.filter((p) => p.id !== id),
          };
        }
        if (!remoteUser) return prev;

        let hasAudio = false;
        let hasVideo = false;
        if (remoteUser.streams) {
          for (const label in remoteUser.streams) {
            for (const streamKind in remoteUser.streams[label]) {
              if (streamKind === 'audio') hasAudio = true;
              if (streamKind === 'video') hasVideo = true;
            }
          }
        }

        const participant: GaleneParticipant = {
          id,
          username: remoteUser.username || 'Participant',
          isLocal: false,
          isSpeaking: false,
          hasAudio,
          hasVideo,
        };
        const exists = prev.participants.some((p) => p.id === id);
        if (kind === 'add' && !exists) {
          return { ...prev, participants: [...prev.participants, participant] };
        }
        if (kind === 'change' && exists) {
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.id === id
                ? {
                  ...p,
                  username: participant.username,
                  hasAudio: participant.hasAudio,
                  hasVideo: participant.hasVideo,
                }
                : p,
            ),
          };
        }
        return prev;
      });
    };
    
    conn.ondownstream = (s: Stream) => {
      console.log('🎥 Nouveau flux distant', s.id, s.label, s.source);
      const participantId: string = s.source || s.id;
      const remoteUsername: string = s.username || 'Participant';
      const source = labelToSource(s.label);

      s.onclose = function () {
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

    conn.onerror = (e: unknown) => {
      console.error('❌ Erreur Galène:', e);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
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
    } catch (e: unknown) {
      console.error('Erreur connect:', e);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      }));
    }

    return () => {
      disposed = true;
      try {
        conn.close();
      } catch {
        // Ignore 
      }
    };
  }, [serverUrl, token, groupName, audioEnabled, onDisconnected, showCamera, username, videoEnabled]);

  // Switch the microphone track on the live WebRTC connection when the user
  // selects a different input device in settings.
  useEffect(() => {
    if (!audioDeviceId) return;
    const conn = state.connection;
    if (!conn) return;
    const s = cameraStream(conn);
    const stream = s?.stream;
    if (!s || !stream) return;

    const oldTrack = stream.getAudioTracks()[0];
    if (!oldTrack) return;
    // Skip if the device hasn't actually changed.
    if (oldTrack.getSettings().deviceId === audioDeviceId) return;

    navigator.mediaDevices
      .getUserMedia({ audio: { deviceId: { exact: audioDeviceId } } })
      .then((newStream) => {
        const newTrack = newStream.getAudioTracks()[0];
        if (!newTrack) return;
        const sender = s.pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (sender) sender.replaceTrack(newTrack);
        // Keep stream in sync so toggleAudio still works.
        stream.removeTrack(oldTrack);
        stream.addTrack(newTrack);
        // Preserve the muted/unmuted state.
        newTrack.enabled = oldTrack.enabled;
        oldTrack.stop();
      })
      .catch((e) => console.error('Error switching microphone:', e));
  }, [audioDeviceId, state.connection]);

  useEffect(() => {
    if (!videoDeviceId) return;
    const conn = state.connection;
    if (!conn) return;
    const s = cameraStream(conn);
    const stream = s?.stream;
    if (!s || !stream) return;

    const oldTrack = stream.getVideoTracks()[0];
    if (!oldTrack) return;
    if (oldTrack.getSettings().deviceId === videoDeviceId) return;

    navigator.mediaDevices
      .getUserMedia({ video: { deviceId: { exact: videoDeviceId } } })
      .then((newStream) => {
        const newTrack = newStream.getVideoTracks()[0];
        if (!newTrack) return;
        const sender = s.pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newTrack);
        stream.removeTrack(oldTrack);
        stream.addTrack(newTrack);
        newTrack.enabled = oldTrack.enabled;
        oldTrack.stop();
      })
      .catch((e) => console.error('Error switching camera:', e));
  }, [videoDeviceId, state.connection]);

  function toggleAudio() {
    const next = !isAudioEnabled;
    const conn = state.connection;
    const s = conn ? cameraStream(conn) : null;
    if (s?.stream) {
      s.stream.getAudioTracks().forEach((t) => { t.enabled = next; });
    } else if (next && conn) {
      showCamera(conn, isVideoEnabled, true).catch(console.error);
    }
    setIsAudioEnabled(next);
  }

  function toggleVideo() {
    const next = !isVideoEnabled;
    const conn = state.connection;
    const s = conn ? cameraStream(conn) : null;
    if (s?.stream) {
      s.stream.getVideoTracks().forEach((t) => { t.enabled = next; });
    } else if (next && conn) {
      showCamera(conn, true, isAudioEnabled).catch(console.error);
    }
    setIsVideoEnabled(next);
  }

  function toggleHand() {
    const next = !isHandRaised;
    setIsHandRaised(next);
    state.connection?.userMessage('raisedHand', '', next);
  }

  async function newScreenShare(): Promise<void> {
    const conn: ServerConnection | null = state.connection;
    const ms: MediaStream = await navigator.mediaDevices.getDisplayMedia();
    ms.getAudioTracks().forEach((t) => { t.enabled = false; });
    ms.getVideoTracks().forEach((t) => { t.enabled = true; });
    const s: Stream = conn!.newUpStream();
    s.label = 'screenshare';
    s.setStream(ms);

    s.onclose = function () {
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
      source: 'screen_share',
      publication: {
        isSubscribed: true,
        trackSid: s.localId,
        kind: ms.getVideoTracks().length > 0 ? 'video' : 'audio',
        source: 'screen_share',
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

  async function renameParticipant(name: string) {
    const conn = state.connection
    if (!conn?.group) return
    await conn.join(conn.group, name, { type: 'token', token })
    setState((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === 'local' ? { ...p, username: name } : p
      ),
    }))
  }

  function stopScreenShare(track: GaleneTrack){
    const conn: ServerConnection | null = state.connection;
    let s: Stream | null = null;
    for(const id in conn?.up){
      if(conn.up[id].stream === track.stream) s = conn.up[id];
    }
    console.log("Closing stream ", s);
    s?.close();
  
    // track.stream.getTracks().forEach((t: MediaStreamTrack) => {
    //   t.stop();
    //   track.stream.removeTrack(t);
    // });

    // setState((prev: GaleneContextState) => ({ ...prev, tracks: [...prev.tracks.filter((t: GaleneTrack) => t !== track)] }))
  }

  return (
    <GaleneContext.Provider value={{ ...state, isAudioEnabled, isVideoEnabled, isHandRaised, toggleAudio, toggleVideo, toggleHand, newScreenShare, stopScreenShare, renameParticipant }}>
      {children}
    </GaleneContext.Provider>
  );
};
