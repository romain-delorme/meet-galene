import React from 'react'
import ReactDOM from 'react-dom/client'
// import App from './App.tsx'
// import useToggleCamera from '../@galene/components-react/src/components/toggleCameraButton.tsx'
// import { useToggleMicrophone } from '../@galene/components-react/src/components/toggleMicrophoneButton.tsx'
// import { useScreenShareButton } from '../@galene/components-react/src/components/screenShareHandler.tsx'
// import { ServerConnection } from '../@galene/protocol'
import { useTestMicrophoneButton } from '../@galene/components-react/src/components/testMicrophone.tsx'
import { useTestCameraButton } from '../@galene/components-react/src/components/testCamera.tsx'
import { useTestScreenShareButton } from '../@galene/components-react/src/components/testScreenShare.tsx'

// Supports weights 100-700
// import '@fontsource-variable/material-symbols-outlined'

// const conn = new ServerConnection();

// const CameraButton = () => useToggleCamera(conn);
// const MicButton = () => useToggleMicrophone(conn);
// const ScreenShareButton = () => useScreenShareButton(conn);

const TestMic = useTestMicrophoneButton
const TestCam = useTestCameraButton
const TestScreenShare = useTestScreenShareButton

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TestMic />
    <TestCam />
    <TestScreenShare />
  </React.StrictMode>
)
