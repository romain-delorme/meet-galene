import { ServerConnection, Stream } from "../protocol";

export function cameraStream(conn: ServerConnection) {
    for (const id in conn.up) {
        const s = conn.up[id];
        if (s.label === 'camera')
            return s;
    }
    return null;
}

function makeVideoElement(id: string) {
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

export async function showCamera(conn: ServerConnection) {
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

    /* Send the new stream to the server */
    const s = conn.newUpStream();
    s.label = 'camera';
    s.setStream(ms);
    const v = makeVideoElement(s.localId);
    s.onclose = function () {
        s.stream.getTracks().forEach((t: Stream) => t.stop());
        v.srcObject = null;
        v.parentNode!.removeChild(v);
    }

    function addTrack(t: Stream) {
        t.oneneded = function () {
            ms.onaddtrack = null;
            s.onremovetrack = null;
            s.close();
        }
        s.pc.addTransceiver(t, {
            direction: 'sendonly',
            streams: [ms],
        });
    }

    // Make sure all future tracks are added.
    s.onaddtrack = function (e: Stream) {
        addTrack(e.track);
    }
    // Add any existing tracks.
    ms.getTracks().forEach(addTrack);

    // Connect the MediaStream to the video element and start playing.
    v.srcObject = ms;
    v.muted = true;
    v.play();
}

export async function hideCamera(conn: ServerConnection) {
    const s = cameraStream(conn);
    s!.stream.getTracks().forEach(t => t.stop());
    s!.close();
}