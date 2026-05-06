import type { ServerConnection, Stream } from "../protocol";

function audioStream(conn: ServerConnection): Stream | null{
    for (const id in conn.up) {
        const s = conn.up[id];
        if (s.label === 'microphone')
            return s;
    }
    return null;
}

function makeAudioElement(id: string): HTMLAudioElement {
    const v = document.createElement('video');
    v.id = 'video-' + id;
    const container = document.getElementById('videos');
    container!.appendChild(v);
    return v;
}

export function getAudioElement(id: string): HTMLAudioElement {
    const v = document.getElementById('video-' + id) as HTMLAudioElement;
    return v!;
}

export async function enableMicrophone(conn: ServerConnection): Promise<void> {
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    /* Send the new stream to the server */
    const s = conn.newUpStream();
    s.label = 'microphone';
    s.setStream(ms);
    const v = makeAudioElement(s.localId);
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

    // Connect the MediaStream to the audio element and start playing.
    v.srcObject = ms;
    v.muted = false;
    v.play();
}

export async function muteMicrophone(conn: ServerConnection): Promise<void> {
    const s = audioStream(conn);
        s!.stream.getTracks().forEach(t => t.stop());
        s!.close();
}