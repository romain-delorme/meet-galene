import { createContext } from 'react';
import type { ServerConnection } from './galene-protocol/protocol';
import type { NotificationPayload } from '../../notifications/NotificationPayload';
import type { NotificationType } from '../../notifications/NotificationType';

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
  hasAudio?: boolean;
  hasVideo?: boolean;
  handRaisedAt?: string;
}

export interface ChatMessage {
  id: string;
  peerId: string;
  dest: string;
  nick: string;
  time: Date;
  privileged: boolean;
  history: boolean;
  kind: string;
  message: string;
}

export interface GaleneContextState {
  connection: ServerConnection | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'joined' | 'error';
  participants: GaleneParticipant[];
  tracks: GaleneTrack[];
  messages: ChatMessage[];
  sendMessage: (message: string, kind?: string, dest?: string) => void;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isHandRaised: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleHand: () => void;
  newScreenShare: () => Promise<void>;
  stopScreenShare: (track: GaleneTrack) => void;
  renameParticipant: (name: string) => Promise<void>;
  sendNotification: (options: {
    type: NotificationType
    destinationIdentities?: string[]
    additionalData?: Record<string, unknown>
  }) => void;
  subscribeToNotifications: (
    handler: (payload: NotificationPayload, senderId: string) => void
  ) => () => void;
  error: string | null;
}

export const GaleneContext = createContext<GaleneContextState>({
  connection: null,
  status: 'disconnected',
  participants: [],
  tracks: [],
  messages: [],
  sendMessage: () => { },
  isAudioEnabled: false,
  isVideoEnabled: false,
  isHandRaised: false,
  toggleAudio: () => { },
  toggleVideo: () => { },
  toggleHand: () => { },
  newScreenShare: async () => { },
  stopScreenShare: () => { },
  renameParticipant: async () => { },
  sendNotification: () => { },
  subscribeToNotifications: () => () => { },
  error: null,
});
