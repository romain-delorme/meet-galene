import React from 'react'
import ReactDOM from 'react-dom/client'
// import App from './App.tsx'
import useToggleCamera from '../@galene/components-react/src/components/toggleCameraButton.tsx'
import { useToggleMicrophone } from '../@galene/components-react/src/components/toggleMicrophoneButton.tsx'
import { useScreenShareButton } from '../@galene/components-react/src/components/screenShareHandler.tsx'
import { ServerConnection } from '../@galene/protocol'

// Supports weights 100-700
// import '@fontsource-variable/material-symbols-outlined'

const conn = new ServerConnection();
conn.socket = new WebSocket("localhost");

const CameraButton = () => useToggleCamera(conn);
const MicButton = () => useToggleMicrophone(conn);
const ScreenShareButton = () => useScreenShareButton(conn);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CameraButton />
    <MicButton />
    <ScreenShareButton />
  </React.StrictMode>
)
