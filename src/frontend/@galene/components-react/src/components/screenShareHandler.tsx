import { useState } from "react";
import { hideScreenShare } from "../../../components-core/src/components/screenShare";
import type { ServerConnection, Stream } from "../../../protocol";
import { makeVideoElement } from "../../../components-core/src/components/camera";

async function shareScreen(conn: ServerConnection): Promise<JSX.Element> {
    const mediaStream: MediaStream = await navigator.mediaDevices.getDisplayMedia();

    //send the new stream to the server
    const stream: Stream = conn.newUpStream();
    stream.label = 'screenshare';
    stream.setStream(mediaStream);
    const video: HTMLVideoElement = makeVideoElement(stream.localId);
    stream.onclose = function (){
        stream.stream!.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        video.srcObject = null;
        video.parentNode!.removeChild(video);
    };

    function addTrack(track: MediaStreamTrack): void {
        track.onended = function () {
            mediaStream.onaddtrack = null;
            stream.stream!.onremovetrack = null;
            stream.close();
        }
        stream.pc.addTransceiver(track, {
            direction: 'sendonly',
            streams: [mediaStream],
        });
    }

    // Make sure all future tracks are added.
    stream.stream!.onaddtrack = function (e: MediaStreamTrackEvent) {
        addTrack(e.track);
    };

    // Add any existing tracks.
    mediaStream.getTracks().forEach(addTrack);

    // Connect the MediaStream to the video element and start playing.
    video.srcObject = mediaStream;
    video.muted = true;
    video.play();
    return(
        <div id={"video-container-" + video.id}>
            <button onClick={() => hideScreenShare(conn, video.id)}>
                <img src="src/frontend/@galene/components-styles/assets/icons/screen-share-stop-icon.svg" alt="hide screen share" />
            </button>
        </div>
    );
}

export function useScreenShareButton(conn: ServerConnection): JSX.Element{
    const [ videoList, setVideoList ] = useState([] as Array<Promise<JSX.Element>>);

    return(
        <div>
            <button onClick={ () => { setVideoList([...videoList, shareScreen(conn)])} }>
                <img src="src/frontend/@galene/components-styles/assets/icons/screen-share-icon.svg" alt="share screen" />
            </button>
            <div id="videos">{videoList}</div>
        </div>
        
    );
}
