import { useState } from "react";
import type {Dispatch, SetStateAction} from "react";


export function useTestMicrophoneButton(): JSX.Element {
    const [ testMic, setTestMic ] = useState(false);
    const [ stream, setStream ] = useState(null) as [MediaStream | null, Dispatch<SetStateAction<MediaStream|null>>];

    const startAudioStream: () => Promise<void> = async () => {
        navigator.mediaDevices
            .getUserMedia({audio: true, video: false})
            .then((s: MediaStream) => {
                const audio = document.createElement('audio');
                audio.srcObject = s;
                audio.play()
                setStream(s);
            });

        setTestMic(true);
    };

    const stopAudioStream: () => void = () => {
        stream?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }

    return(
        <button onClick={ testMic? stopAudioStream : startAudioStream }>
            test microphone
        </button>
    );    
}