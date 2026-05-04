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

export const GaleneRoom: React.FC<GaleneRoomProps> = ({
  serverUrl,
  token,
  groupName,
  username = "User",
  audioEnabled = false,
  videoEnabled = false,
  onDisconnected,
  children
}) => {
  const [state, setState] = useState<GaleneContextState>({
    connection: null,
    status: 'disconnected',
    participants: [],
    tracks: [],
  });

  // Pour garder une référence mutable afin d'éviter les dépendances obsolètes dans les callbacks Galène
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!serverUrl) return;

    console.log("🚀 Initialisation de Galène...", { serverUrl, groupName });

    // Astuce pour charger protocol.js sans le modifier (vu qu'il est en Vanilla JS sans export)
    const loadGaleneProtocol = async () => {
      const conn = new ServerConnection();

      // Mise à jour de l'état "local"
      const localParticipant: GaleneParticipant = {
        id: 'local',
        username: username,
        isLocal: true,
        isSpeaking: false,
      };

      setState(prev => ({
        ...prev,
        connection: conn,
        status: 'connecting',
        participants: [localParticipant] // On ajoute l'utilisateur local d'office
      }));

      // --- MAPPING DES CALLBACKS GALENE ---
      conn.onconnected = async () => {
        console.log("✅ Connecté au WebSocket Galène");
        let creds = token ? { type: 'token', token: token } : { type: 'password', password: '' };

        try {
          await conn.join(groupName, username, creds);
        } catch (e) {
          console.error("Erreur de join:", e);
        }
      };

      conn.onjoined = (kind: string, group: string, perms: any, status: any, data: any, error: any, message: any) => {
        console.log("🎉 Rejoint le groupe Galène:", kind, group);

        if (kind === 'fail') {
          console.error("Echec de connexion au groupe:", message);
          if (onDisconnected) onDisconnected(message);
          return;
        }

        setState(prev => ({ ...prev, status: 'joined' }));

        // Demande des vidéos des autres
        conn.request({ '': ['audio', 'video'] });

        // Si la caméra/micro était demandé, on lance
        if (videoEnabled || audioEnabled) {
          publishLocalStream(conn, videoEnabled, audioEnabled);
        }
      };

      // Quand un nouveau flux arrive du serveur (La caméra de quelqu'un d'autre)
      conn.ondownstream = (s: any) => {
        console.log("🎥 Nouveau flux distant reçu:", s);

        const participantId = s.label || s.id; // Identifier le participant via les données de Galène

        s.onclose = () => {
          console.log("🛑 Flux fermé:", s.id);
          setState(prev => ({
            ...prev,
            tracks: prev.tracks.filter(t => t.id !== s.id)
          }));
        };

        // Création de l'objet "Track" façon LiveKit pour notre contexte React
        const newTrack: GaleneTrack = {
          id: s.id,
          participantId: participantId,
          stream: s.stream,
          source: 'camera', // À déterminer selon s.label
          publication: {
            isSubscribed: true,
            trackSid: s.id,
            kind: 'video',
            source: 'camera'
          },
          // Dummy participant for now, will map to real one via onuser later
          participant: {
            id: participantId,
            username: "Utilisateur Distant",
            isLocal: false,
            isSpeaking: false
          }
        };

        setState(prev => {
          // Ajouter la track sans doublon
          if (prev.tracks.find(t => t.id === newTrack.id)) return prev;
          return { ...prev, tracks: [...prev.tracks, newTrack] };
        });

        // Quand le flux reçoit ses données audio/video
        s.ondowntrack = (track: any, stream: any) => {
          console.log("🔄 Track attachée au downstream:", track.kind);
          // On force un refresh en mettant à jour le state
          setState(prev => ({
            ...prev,
            tracks: prev.tracks.map(t => t.id === s.id ? { ...t, stream: stream } : t)
          }));
        };
      };

      conn.onclose = () => {
        console.log("❌ Connexion Galène fermée");
        setState(prev => ({ ...prev, status: 'disconnected', tracks: [], participants: [] }));
        if (onDisconnected) onDisconnected();
      };

      // Démarrage de la connexion WebSockets
      conn.connect(serverUrl);
    };

    loadGaleneProtocol();

    return () => {
      // Cleanup au démontage du composant
      if (stateRef.current.connection) {
        stateRef.current.connection.close();
      }
    };
  }, [serverUrl, token, groupName]);

  // Fonction utilitaire pour publier notre propre flux (caméra locale)
  const publishLocalStream = async (conn: any, video: boolean, audio: boolean) => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ audio, video });
      const s = conn.newUpStream();
      s.label = 'camera';
      s.setStream(ms);

      const localTrack: GaleneTrack = {
        id: s.localId,
        participantId: 'local',
        stream: ms,
        source: 'camera',
        publication: { isSubscribed: true, trackSid: s.localId, kind: 'video', source: 'camera' },
        participant: stateRef.current.participants[0] // User local
      };

      setState(prev => ({ ...prev, tracks: [...prev.tracks, localTrack] }));

      s.onaddtrack = (e: any) => {
        s.pc.addTransceiver(e.track, { direction: 'sendonly', streams: [ms] });
      };
      ms.getTracks().forEach((t: any) => s.onaddtrack({ track: t }));

    } catch (e) {
      console.error("Erreur getUserMedia:", e);
    }
  };

  return (
    <GaleneContext.Provider value={state}>
      {children}
    </GaleneContext.Provider>
  );
};
