import { useState, useEffect } from "react";
import { showCamera, hideCamera } from "../../../components-core/src/components/camera";
import type { ServerConnection } from "../../../protocol";

const STYLE_PATH = 'src/frontend/@galene/components-styles/';


function useToggleCamera(): JSX.Element{
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [cameraIconPath, setCameraIconPath] = useState(STYLE_PATH + 'assets/icons/camera-disabled-icon.svg');

    useEffect(function(this: ServerConnection) {
        setCameraIconPath(cameraEnabled? STYLE_PATH + 'assets/icons/camera-icon.svg' : STYLE_PATH + 'assets/icons/camera-disabled-icon.svg');

        if(cameraEnabled) showCamera(this);
        else hideCamera(this);
    }, [cameraEnabled]);

    return(
        <button onClick={() => setCameraEnabled(!cameraEnabled)}>
            <img src={cameraIconPath} alt={cameraEnabled?"disable":"enable" + " camera"}></img>
        </button>
    );
}

export default useToggleCamera;
