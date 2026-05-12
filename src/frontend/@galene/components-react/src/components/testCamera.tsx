/* eslint-disable jsx-a11y/media-has-caption */
import { useState, useRef } from "react";
import type {Dispatch, MutableRefObject, SetStateAction} from "react";

export function useTestCameraButton(): JSX.Element {
    const [ testCam, setTestCam ] = useState(false);
    const [ stream, setStream ] = useState(null) as [MediaStream | null, Dispatch<SetStateAction<MediaStream|null>>];
    const video = useRef() as MutableRefObject<HTMLVideoElement>;

    const startVideoStream: () => Promise<void> = async () => {
        navigator.mediaDevices
            .getUserMedia({audio: false, video: true})
            .then((s: MediaStream) => {
                video.current.srcObject = s;
                setStream(s);
            });

        setTestCam(true);
    };

    const stopVideoStream: () => void = () => {
        setTestCam(false);
        stream?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }

    return(
        <div>
            <button onClick={testCam? stopVideoStream : startVideoStream}>
                { testCam ? "stop testing":"test camera" }
            </button>
            <video ref={video} hidden={!testCam} autoPlay={true}></video>
        </div>
    );    
}