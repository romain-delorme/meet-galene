import { createContext } from 'react';
import type { ServerConnection } from '../../../../@galene/protocol';

export interface GaleneTrack {
  id: string;
  participantId: string;
  stream: MediaStream;
  source: 'camera' | 'screen_share' | 'microphone';
  publication: {
    isSubscribed: boolean;
    trackSid: string;
    kind: 'video' | 'audio';
    source: 'camera' | 'screen_share' | 'microphone';
  };
  participant: GaleneParticipant;
}

export interface GaleneParticipant {
  id: string;
  username: string;
  isLocal: boolean;
  isSpeaking: boolean;
}

export interface GaleneContextState {
  connection: ServerConnection | null; // The ServerConnection instance
  status: 'disconnected' | 'connecting' | 'connected' | 'joined' | 'error';
  participants: GaleneParticipant[];
  tracks: GaleneTrack[];
  error: string | null;
}

export const GaleneContext = createContext<GaleneContextState>({
  connection: null,
  status: 'disconnected',
  participants: [],
  tracks: [],
  error: null,
});
