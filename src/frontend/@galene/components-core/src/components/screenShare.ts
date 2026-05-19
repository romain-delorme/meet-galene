import type { ServerConnection, Stream } from "../protocol";
import { makeVideoElement } from "./camera";

export function screenShareStream(conn: ServerConnection): Stream | null {
    for(const id in conn.up){
        const s: Stream = conn.up[id];
        if(s.label === 'screenshare') 
            return s;
    }
    return null;
}

export async function shareScreen(conn: ServerConnection): Promise<void> {
    const mediaStream: MediaStream = await navigator.mediaDevices.getDisplayMedia();

    //send the new stream to the server
    const stream: Stream = conn.newUpStream();
    stream.label = 'screenshare';
    stream.setStream(mediaStream);
    const video: HTMLVideoElement = makeVideoElement(stream.localId);
    stream.onclose = function (){
        stream.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        video.srcObject = null;
        video.parentNode!.removeChild(video);
    };

    function addTrack(track: MediaStreamTrack): void {
        track.onended = function () {
            mediaStream.onaddtrack = null;
            stream.stream.onremovetrack = null;
            stream.close();
        }
        stream.pc.addTransceiver(track, {
            direction: 'sendonly',
            streams: [mediaStream],
        });
    }

    // Make sure all future tracks are added.
    stream.stream.onaddtrack = function (e: MediaStreamTrackEvent) {
        addTrack(e.track);
    };

    // Add any existing tracks.
    mediaStream.getTracks().forEach(addTrack);

    // Connect the MediaStream to the video element and start playing.
    video.srcObject = mediaStream;
    video.muted = true;
    video.play();
}

// specify id of stream to hide in order to handle multiple screen shares on a single device
export async function hideScreenShare(conn: ServerConnection, id: string): Promise<void> {
    const stream: Stream | undefined = conn.up[id];
    stream!.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    stream!.close();
}

