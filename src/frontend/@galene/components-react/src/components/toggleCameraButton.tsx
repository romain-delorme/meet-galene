import { useState, useEffect } from "react";
import { showCamera, hideCamera } from "../../../components-core/src/components/camera";
// @ts-expect-error the galene protocol needs to be rewritten in typescript for this to work
import type { ServerConnection } from "../../../components-core/src/protocol";

const STYLE_PATH = 'src/frontend/@galene/components-styles/';


function useToggleCamera(conn: ServerConnection): JSX.Element{
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [cameraIconPath, setCameraIconPath] = useState(STYLE_PATH + 'assets/icons/camera-disabled-icon.svg');

    useEffect(function(): void {
        setCameraIconPath(cameraEnabled? STYLE_PATH + 'assets/icons/camera-icon.svg' : STYLE_PATH + 'assets/icons/camera-disabled-icon.svg');

        if(cameraEnabled) showCamera(conn);
        else hideCamera(conn);
    }, [cameraEnabled, conn]);

    return(
        <button onClick={() => setCameraEnabled(!cameraEnabled)}>
            <img src={cameraIconPath} alt={cameraEnabled?"disable":"enable" + " camera"}></img>
        </button>
    );
}

export default useToggleCamera;
