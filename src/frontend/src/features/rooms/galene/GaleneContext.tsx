import { createContext } from 'react';

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
  connection: any | null; // The ServerConnection instance
  status: 'disconnected' | 'connecting' | 'connected' | 'joined' | 'error';
  participants: GaleneParticipant[];
  tracks: GaleneTrack[];
}

export const GaleneContext = createContext<GaleneContextState>({
  connection: null,
  status: 'disconnected',
  participants: [],
  tracks: [],
});
