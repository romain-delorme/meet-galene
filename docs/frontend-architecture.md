# Frontend Architecture — La Suite Meet

This document describes the frontend architecture of La Suite Meet, focusing on the migration from LiveKit to Galène and the key components of the video conferencing interface.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Migration from LiveKit to Galène](#migration-from-livekit-to-galène)
4. [Architecture Overview](#architecture-overview)
5. [Key Components](#key-components)
   - [GaleneRoom](#galenerooom)
   - [VideoConference](#videoconference)
   - [GaleneParticipantTile](#galeneparticipanttile)
   - [Chat](#chat)
   - [ParticipantList](#participantlist)
   - [MainNotificationToast](#mainnotificationtoast)
6. [Supporting Components](#supporting-components)
7. [State Management](#state-management)
8. [Notification System](#notification-system)
9. [Data Flow Diagram](#data-flow-diagram)

---

## Overview

La Suite Meet is a video conferencing application built with React 18 + TypeScript. It uses the **Galène** open-source WebRTC server as its media and signaling backend.

The frontend lives in `src/frontend/src/` and is organized around feature modules:

```
src/frontend/src/
├── features/
│   ├── rooms/
│   │   └── galene/           # All Galène-specific code lives here
│   │       ├── components/   # UI components
│   │       ├── galene-protocol/  # Protocol layer (protocol.js + types)
│   │       └── GaleneContext.tsx # Shared connection state
│   └── notifications/        # Toast notification system
├── stores/                   # Valtio global stores
└── ...
```

---

## Technology Stack

| Concern | Library |
|---|---|
| UI Framework | React 18 + TypeScript |
| Styling | PandaCSS (utility-first CSS-in-JS) |
| Accessible UI primitives | React Aria Components |
| State (local) | React Context (GaleneContext) + `useReducer` |
| State (global) | Valtio (reactive proxies) |
| Router | Wouter |
| Build | Vite |
| i18n | i18next (fr, en, de, nl) |
| API client | TanStack React Query |

---

## Migration from LiveKit to Galène

The project was originally built on **LiveKit**, a commercial WebRTC platform. It has been migrated to **Galène**, an open-source WebRTC server.

### What changed

| Aspect | LiveKit (before) | Galène (after) |
|---|---|---|
| Connection | LiveKit SDK (`livekit-client`) | Custom WebSocket via `protocol.js` + Galene SDK (https://github.com/suitenumerique/gallene-sdk)|
| Participant model | `RemoteParticipant`, `LocalParticipant` | `GaleneParticipant` (custom interface) |
| Track model | LiveKit `Track` | `GaleneTrack` (custom interface) |
| Room component | LiveKit `<LiveKitRoom>` | `<GaleneRoom>` |
| Video tile | LiveKit `<ParticipantTile>` | `<GaleneParticipantTile>` |
| Authentication | JWT signed with LiveKit secret | Secret key send to the room via the SDK and then connection with a Token|

### LiveKit dependencies in package.json

At the time of writing, `@livekit/components-react`, `@livekit/components-styles`, `@livekit/track-processors`, and `livekit-client` are still present in `package.json`. They are **not used** by any Galène component and can be removed safely once the migration is confirmed complete.

### Galène protocol

The Galène protocol is implemented in:

- `src/frontend/src/features/rooms/galene/galene-protocol/protocol.js` — original Galène JS library (MIT, by Juliusz Chroboczek)
- `src/frontend/src/features/rooms/galene/galene-protocol/protocol.d.ts` — TypeScript type declarations for the above

The key class is `ServerConnection`, which manages the WebSocket connection to the Galène server and exposes callbacks (`onconnected`, `onjoined`, `onuser`, `ondownstream`, `onchat`, etc.) that `GaleneRoom` hooks into.

---

## Architecture Overview

```
GaleneRoom (WebSocket connection + GaleneContext provider)
│
├── MainNotificationToast   (subscribes to events → shows toasts)
│
└── VideoConference         (layout: grid or focus view)
    ├── GaleneParticipantTile × N   (one per video/screen share)
    ├── GaleneAudioRenderer × N     (hidden <audio> tags for remote audio)
    ├── GaleneControlBar            (mic, camera, reactions, leave, etc.)
    └── SidePanel
        ├── Chat                    (message list + input)
        └── ParticipantList         (list of participants + their status)
```

All components below `GaleneRoom` read state from `GaleneContext` (React Context). They do not talk to the server directly.

---

## Key Components

### GaleneRoom

**File:** `src/frontend/src/features/rooms/galene/components/GaleneRoom.tsx`

The root component of the conference. It:

1. Creates a `ServerConnection` (from `protocol.js`) on mount.
2. Connects to the Galène WebSocket server using `serverUrl` and authenticates with `token` or password.
3. Manages all connection state (participants, media tracks, chat messages).
4. Exposes everything via `GaleneContext` to child components.
5. Cleans up the connection on unmount.

**Props**

| Prop | Type | Description |
|---|---|---|
| `serverUrl` | `string` | WebSocket URL of the Galène server |
| `token` | `string` | Authentication token |
| `groupName` | `string` | Name of the room/group to join |
| `username` | `string` | Display name for the local user |
| `audioEnabled` | `boolean` | Whether to start with audio on |
| `videoEnabled` | `boolean` | Whether to start with video on |
| `onDisconnected` | `(reason?) => void` | Called when the connection closes |
| `children` | `ReactNode` | All child components (VideoConference, etc.) |

**GaleneContext state available to children**

| Field | Type | Description |
|---|---|---|
| `connection` | `ServerConnection` | The raw Galène connection object |
| `status` | `string` | `'disconnected' \| 'connecting' \| 'connected' \| 'joined' \| 'error'` |
| `participants` | `GaleneParticipant[]` | All participants including local user |
| `tracks` | `GaleneTrack[]` | All active media tracks |
| `messages` | `ChatMessage[]` | Chat message history |
| `isAudioEnabled` | `boolean` | Whether local mic is on |
| `isVideoEnabled` | `boolean` | Whether local camera is on |
| `isHandRaised` | `boolean` | Whether local hand is raised |
| `sendMessage(msg, dest?)` | function | Send a chat message |
| `toggleAudio()` | function | Toggle local microphone |
| `toggleVideo()` | function | Toggle local camera |
| `toggleHand()` | function | Raise or lower hand |
| `newScreenShare()` | function | Start a screen share |
| `stopScreenShare()` | function | Stop the active screen share |
| `subscribeToNotifications(handler)` | function | Register a notification event listener |

**Galène protocol callbacks wired in GaleneRoom**

| Callback | Triggered when | What it does |
|---|---|---|
| `onconnected` | WebSocket opened | Calls `connection.join(...)` |
| `onjoined` | Server confirms join | Requests streams, sets status to `joined` |
| `onuser` | A participant joins/leaves/changes | Updates `participants` array |
| `ondownstream` | A remote media stream arrives | Adds a new `GaleneTrack` to `tracks` |
| `onchat` | A chat message arrives | Appends to `messages` |
| `onusermessage` | A user-level event (hand raise, kick, notifications…) | Fires notification subscribers |
| `onclose` | WebSocket closes | Calls `onDisconnected`, resets state |

---

### VideoConference

**File:** `src/frontend/src/features/rooms/galene/components/VideoConference.tsx`

Renders the main video area. Reads `tracks` from `GaleneContext` and lays them out in either:

- **Grid mode** — up to 9 tiles per page, responsive columns (1–4 cols based on count)
- **Focus mode** — one large tile in the center, remaining participants in a side carousel

**Pinning behavior**
- Clicking "pin" on a tile switches to focus mode for that participant.
- Screen shares are automatically pinned when they start.

**Pagination**
When there are more than 9 participants, prev/next buttons appear to navigate pages of 9.

**Grid column rules**

| Participants visible | Columns |
|---|---|
| 1–2 | 1 |
| 3–4 | 2 |
| 5–9 | 3 |
| 10+ | 4 |

**Child components rendered**

- `GaleneParticipantTile` — one per visible track
- `GaleneAudioRenderer` — one per remote audio track (hidden)
- `GaleneControlBar` — bottom control bar
- `SidePanel` — chat and participant list
- `SettingsDialogProvider` — device settings modal

---

### GaleneParticipantTile

**File:** `src/frontend/src/features/rooms/galene/components/GaleneParticipantTile.tsx`

Renders one participant's video tile.

**Props**

| Prop | Type | Description |
|---|---|---|
| `track` | `GaleneTrack` | The media track to display |
| `isPinned` | `boolean` | Whether this tile is currently pinned |
| `onPin` | `() => void` | Callback to toggle pin |

**GaleneTrack interface**

```typescript
interface GaleneTrack {
  id: string
  participantId: string
  stream: MediaStream        // the actual browser MediaStream
  source: 'camera' | 'screen_share' | 'microphone'
  publication: {
    isSubscribed: boolean
    trackSid: string
    kind: 'video' | 'audio'
    source: 'camera' | 'screen_share' | 'microphone'
  }
  participant: GaleneParticipant
}
```

**What the tile shows**

- The participant's video (`<video>` element attached to `track.stream`)
- A fallback avatar (first letter of name) when video is off or hidden
- Participant name overlay at the bottom
- Hand raised icon (top-left) when participant's hand is up
- Mic muted icon for the local user when audio is disabled
- On hover: pin/unpin button and hide/show video toggle
- For local screen shares: a "Stop sharing" button

**Local video mirroring**

The local camera feed is mirrored horizontally (`scaleX(-1)`) so it looks natural to the user. Remote participants see the non-mirrored version.

---

### Chat

**File:** `src/frontend/src/features/rooms/galene/components/controls/Chat/Chat.tsx`

Renders the chat panel inside `SidePanel`.

**Features**

- Reads `messages` from `GaleneContext`
- Sends messages via `sendMessage()` from context
- Groups consecutive messages from the same sender within 1 minute (no repeated avatar/name)
- Highlights private messages in yellow
- Adds "(vous)" label to your own messages
- Auto-scrolls to the latest message
- Enter key submits; Shift+Enter adds a new line

**ChatMessage interface**

```typescript
interface ChatMessage {
  id: string
  peerId: string      // sender's participant ID
  dest: string        // destination ('', or specific participant ID for private)
  nick: string        // sender's display name
  time: Date
  privileged: boolean // sender is a moderator
  history: boolean    // message came from server history (before you joined)
  kind: string
  message: string
}
```

**Avatar colors**

Each participant gets a deterministic color based on a hash of their display name. There are 10 predefined colors so the same person always appears with the same color across sessions.

---

### ParticipantList

**File:** `src/frontend/src/features/rooms/galene/components/controls/Participants/ParticipantsList.tsx`

Renders the participants panel inside `SidePanel`. Reads `participants` from `GaleneContext`.

**For each participant, shows:**

- Avatar (first letter of name, colored)
- Display name, with "(vous)" suffix for the local user
- Microphone status icon (green = on, red = muted)
- Camera status icon (green = on, red = off)
- Hand raised icon (yellow) if hand is up

**GaleneParticipant interface**

```typescript
interface GaleneParticipant {
  id: string
  username: string
  isLocal: boolean       // true for the local user
  isSpeaking: boolean
  hasAudio?: boolean     // whether mic is on
  hasVideo?: boolean     // whether camera is on
  handRaisedAt?: string  // ISO timestamp, undefined if hand is down
}
```

---

### MainNotificationToast

**File:** `src/frontend/src/features/notifications/MainNotificationToast.tsx`

Handles all real-time notifications during a conference and shows them as toast messages. It subscribes to events from `GaleneContext.subscribeToNotifications()`.

**Notification categories handled**

| Event | Toast shown |
|---|---|
| Chat message received | "{name}: {preview}" |
| Reaction received | Emoji reaction display |


**How it works**

`subscribeToNotifications(handler)` (from `GaleneContext`) registers a callback in a `Set` inside `GaleneRoom`. When `GaleneRoom` receives a `onusermessage` event from Galène, it fires all registered handlers. `MainNotificationToast` uses this to dispatch the correct toast.

The component uses `useRef` to hold the latest handler reference to avoid React stale-closure issues inside effects.

---

## Supporting Components

### GaleneControlBar

**File:** `src/frontend/src/features/rooms/galene/components/GaleneControlBar.tsx`

The bottom toolbar. Contains:

- Microphone toggle + device selector
- Camera toggle + device selector
- Emoji reactions toggle
- Hand raise toggle
- Screen share button (disabled if not browser-supported)
- Chat panel toggle
- Participants panel toggle
- Settings button (opens device settings modal)
- Leave room button

Keyboard shortcut `Alt+Z` focuses the toolbar.

### GaleneAudioRenderer

**File:** `src/frontend/src/features/rooms/galene/components/GaleneAudioRenderer.tsx`

Invisible component that renders hidden `<audio>` elements for every remote audio track. Automatically routes audio to the user's selected output device using `HTMLAudioElement.setSinkId()`. Does not render local audio (the microphone is not played back to yourself).

### SidePanel

**File:** `src/frontend/src/features/rooms/galene/components/SidePanel.tsx`

Animated slide-in panel on the right side of the screen. Contains two tabs:

- **Chat** (`Chat` component)
- **Participants** (`ParticipantList` component)

Opens/closes via the buttons in `GaleneControlBar`. Position adjusts if the reactions toolbar is also open.

---

## State Management

The app uses two state layers:

### 1. GaleneContext (React Context)

The primary state for anything related to the current conference. Defined in `src/frontend/src/features/rooms/galene/GaleneContext.tsx`. Provided by `GaleneRoom` and consumed by any component inside it with `useContext(GaleneContext)`.

### 2. Valtio stores (global reactive state)

Located in `src/frontend/src/stores/`. Used for concerns that live outside the conference context.

| Store | File | Purpose |
|---|---|---|
| `userChoicesStore` | `stores/userChoices.ts` | Saved device choices (mic, camera, speaker) |
| `layoutStore` | `stores/layout.ts` | UI layout state |
| `connectionObserver` | `stores/connectionObserver.ts` | RTC connection quality, disconnect detection |

When the user changes their audio/video device in settings, `userChoicesStore` updates, and `GaleneRoom` watches this store to switch the active device on the `ServerConnection` without requiring a reconnect.

---

## Notification System

### NotificationType enum

**File:** `src/frontend/src/features/notifications/NotificationType.ts`

All notification types are defined in this enum. When adding a new notification, add its key here first, then handle it in `MainNotificationToast`.

```typescript
enum NotificationType {
  MessageReceived         = 'messageReceived',
  ReactionReceived        = 'reactionReceived',
}
```

### Subscription pattern

```
GaleneRoom (holds a Set<NotificationHandler>)
    │
    ├── subscribeToNotifications(handler) → adds to the Set, returns unsubscribe fn
    │
    └── onusermessage (Galène event) → iterates the Set and calls each handler

MainNotificationToast
    └── useEffect → calls subscribeToNotifications(myHandler)
                    returns cleanup fn that removes the handler
```

---

## Data Flow Diagram

```
Browser                   GaleneRoom                   Galène Server
  │                           │                              │
  │── join room URL ─────────>│                              │
  │                           │── WebSocket connect ────────>│
  │                           │<─ onconnected ───────────────│
  │                           │── join(group, token) ───────>│
  │                           │<─ onjoined ──────────────────│
  │                           │── request streams ──────────>│
  │                           │<─ onuser (participants) ─────│
  │                           │<─ ondownstream (tracks) ─────│
  │                           │                              │
  │                           │  updates GaleneContext:      │
  │                           │  participants, tracks,        │
  │                           │  messages, status            │
  │                           │                              │
  │<── VideoConference renders (reads from GaleneContext)    │
  │<── GaleneParticipantTile per track                       │
  │<── SidePanel (Chat, ParticipantList)                     │
  │<── MainNotificationToast (subscribes to events)          │
  │                           │                              │
  │── user toggles mic ──────>│                              │
  │                           │── mute/unmute stream ───────>│
  │                           │  updates isAudioEnabled      │
  │                           │                              │
  │── user sends chat ───────>│                              │
  │                           │── connection.chat() ────────>│
  │                           │<─ onchat (echo + others) ────│
  │                           │  appends to messages         │
  │                           │                              │
  │── user leaves ───────────>│                              │
  │                           │── close connection ─────────>│
  │                           │<─ onclose ───────────────────│
  │                           │── calls onDisconnected       │
```

---

## What needs to be improved
- The participant tab in the side panel doesn't indicate when a participant is muted / unmuted or if the camera is on / off
- when you change your name in the settings you join again the room and you forgot everything about the room (currently participant only say that they are raising their hand)
- Rebuild features like visio recording
