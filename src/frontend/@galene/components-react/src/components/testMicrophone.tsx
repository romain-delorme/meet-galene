
function microphoneFeedback(): JSX.Element {
    const mediaStream: MediaStream = navigator.mediaDevices.getUserMedia({audio: true, video: false});
    const audio: HTMLAudioElement = document.createElement('audio');
}

export function testMicrophoneButton(): JSX.Element {

}