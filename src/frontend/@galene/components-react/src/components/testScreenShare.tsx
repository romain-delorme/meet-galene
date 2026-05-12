/* eslint-disable jsx-a11y/media-has-caption */
import { useState, useRef } from "react";
import type {Dispatch, MutableRefObject, SetStateAction} from "react";

export function useTestScreenShareButton(): JSX.Element {
    const [ testing, setTesting ] = useState(false);
    const [ stream, setStream ] = useState(null) as [MediaStream | null, Dispatch<SetStateAction<MediaStream|null>>];
    const video = useRef() as MutableRefObject<HTMLVideoElement>;

    const startVideoStream: () => Promise<void> = async () => {
        navigator.mediaDevices
            .getDisplayMedia()
            .then((s: MediaStream) => {
                video.current.srcObject = s;
                setStream(s);
            });

        setTesting(true);
    };

    const stopVideoStream: () => void = () => {
        setTesting(false);
        stream?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }

    return(
        <div>
            <button onClick={testing? stopVideoStream : startVideoStream}>
                { testing ? "stop testing":"test screen share" }
            </button>
            <video ref={video} hidden={!testing} autoPlay={true}></video>
        </div>
    );    
}