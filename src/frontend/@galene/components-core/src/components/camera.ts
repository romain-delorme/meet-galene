// @ts-expect-error the galene protocol needs to be rewritten in typescript for this to work
import type { ServerConnection, Stream } from "../protocol";

export function cameraStream(conn: ServerConnection): Stream | null {
    for (const id in conn.up) {
        const s = conn.up[id];
        if (s.label === 'camera')
            return s;
    }
    return null;
}

export function makeVideoElement(id: string): HTMLVideoElement {
    const v = document.createElement('video');
    v.id = 'video-' + id;
    const container = document.getElementById('videos');
    container!.appendChild(v);
    return v;
}

export function getVideoElement(id: string): HTMLVideoElement {
    const v = document.getElementById('video-' + id) as HTMLVideoElement;
    return v!;
}

export async function showCamera(conn: ServerConnection): Promise<void> {
    const ms = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });

    /* Send the new stream to the server */
    const s = conn.newUpStream();
    s.label = 'camera';
    s.setStream(ms);
    const v = makeVideoElement(s.localId);
    s.onclose = function () {
        s.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        v.srcObject = null;
        v.parentNode!.removeChild(v);
    }

    function addTrack(t: MediaStreamTrack): void {
        t.onended = function () {
            ms.onaddtrack = null;
            s.stream.onremovetrack = null;
            s.close();
        }
        s.pc.addTransceiver(t, {
            direction: 'sendonly',
            streams: [ms],
        });
    }

    // Make sure all future tracks are added.
    s.stream.onaddtrack = function (e: MediaStreamTrackEvent) {
        addTrack(e.track);
    }
    // Add any existing tracks.
    ms.getTracks().forEach(addTrack);

    // Connect the MediaStream to the video element and start playing.
    v.srcObject = ms;
    v.muted = true;
    v.play();
}

export async function hideCamera(conn: ServerConnection): Promise<void> {
    const s = cameraStream(conn);
    s!.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    s!.close();
}