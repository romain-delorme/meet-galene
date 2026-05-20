/**
 * Type declarations for @galene/protocol.js
 * Based on the JSDoc in protocol.js from the Galène project.
 */

export interface User {
  username: string;
  permissions: string[];
  data: Record<string, unknown>;
  streams: Record<string, Record<string, boolean>>;
}

interface Message {
    type: string;
    version?: string[];
    kind?: string;
    error?: string;
    id?: string;
    replace?: string;
    source?: string;
    dest?: string;
    username?: string;
    password?: string;
    token?: string;
    privileged?: boolean;
    permissions?: string[];
    status?: Record<string, unknown>;
    data?: Record<string, unknown>;
    group?: string;
    value?: unknown;
    noecho?: boolean;
    time?: string | number;
    sdp?: string;
    candidate?: RTCIceCandidate;
    label?: string;
    request?: Record<string, string[]> | string[];
    rtcConfiguration?: RTCConfiguration;
}

export class ServerConnection {
  id: string;
  group: string | null;
  username: string | null;
  users: Record<string, User>;
  socket: WebSocket | null;
  version: string | null;
  up: Record<string, Stream>;
  down: Record<string, Stream>;
  rtcConfiguration: RTCConfiguration | null;
  permissions: string[];
  userdata: Record<string, unknown>;
  lastServerMessage: number | null;

  constructor();

  close(): void;
  error(e: unknown): void;
  send(m: Message): void;
  connect(url: string): void;
  join(
    group: string,
    username: string,
    credentials: string | { type: string; password?: string; token?: string; authServer?: string; location?: string },
    data?: Record<string, unknown>,
  ): Promise<void>;
  leave(group: string): void;
  request(what: Record<string, string[]>): void;
  findByLocalId(localId: string): Stream | null;
  getRTCConfiguration(): RTCConfiguration;
  newUpStream(localId?: string): Stream;
  chat(kind: string, dest: string, value: string): void;
  userAction(kind: string, dest: string, value?: unknown): void;
  userMessage(kind: string, dest: string, value?: unknown, noecho?: boolean): void;

  // Callbacks
  onconnected: ((this: ServerConnection) => void) | null;
  onerror: ((this: ServerConnection, error: unknown) => void) | null;
  onclose: ((this: ServerConnection, code: number, reason: string) => void) | null;
  onpeerconnection: ((this: ServerConnection) => RTCConfiguration | null) | null;
  onuser: ((this: ServerConnection, id: string, kind: string) => void) | null;
  onjoined: ((
    this: ServerConnection,
    kind: string,
    group: string,
    permissions: string[],
    status: Record<string, unknown>,
    data: Record<string, unknown>,
    error: string | null,
    message: string | null,
  ) => void) | null;
  ondownstream: ((this: ServerConnection, stream: Stream) => void) | null;
  onchat: ((
    this: ServerConnection,
    id: string,
    source: string,
    dest: string,
    username: string,
    time: Date,
    privileged: boolean,
    history: boolean,
    kind: string,
    message: string,
  ) => void) | null;
  onusermessage: ((
    this: ServerConnection,
    id: string,
    dest: string,
    username: string,
    time: Date,
    privileged: boolean,
    kind: string,
    error: string,
    message: unknown,
  ) => void) | null;
  onfiletransfer: ((this: ServerConnection, f: TransferredFile) => void) | null;
  transferredFiles: Record<string, TransferredFile>;
}

export class Stream {
  id: string;
  localId: string;
  pc: RTCPeerConnection;
  source: string;
  username: string;
  label: string;
  replace: string | null;
  stream: MediaStream | null;
  userdata: Record<string, unknown>;

  close(replace?: boolean): void;
  negotiate(): Promise<void>;
  restartIce(): void;
  setStream(stream: MediaStream): void;

  // Callbacks
  onclose: ((this: Stream, replace: boolean) => void) | null;
  ondowntrack: ((
    this: Stream,
    track: MediaStreamTrack,
    transceiver: RTCRtpTransceiver,
    stream: MediaStream,
  ) => void) | null;
  onstatus: ((this: Stream, status: string) => void) | null;
  onstats: ((this: Stream, stats: Record<string, unknown>) => void) | null;
  onnegotiationcompleted: ((this: Stream) => void) | null;
}

export class TransferredFile {
  id: string;
  userid: string;
  up: boolean;
  username: string;
  name: string;
  mimetype: string;
  size: number;

  close(): void;
  cancel(message?: string): void;
  fail(message: string): void;
  event(type: string, message?: string | null): void;
}
