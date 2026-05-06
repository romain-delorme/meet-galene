import { useState, useEffect } from "react";
import { enableMicrophone, muteMicrophone } from "../../../components-core/src/components/microphone";
import type { ServerConnection } from "../../../components-core/src/protocol";

const STYLE_PATH = 'src/frontend/@galene/components-styles/';
const openMicIconPath = STYLE_PATH + 'assets/icons/mic-icon.svg';
const mutedMicIconPath = STYLE_PATH + 'assets/icons/mic-disabled-icon.svg';

export function useToggleMicrophone(): JSX.Element{
    const [micEnabled, setMicEnabled] = useState(false);
    const [micIconPath, setMicIconPath] = useState(mutedMicIconPath);

    useEffect(function(this: ServerConnection) {
        setMicIconPath(micEnabled? openMicIconPath : mutedMicIconPath);

        if(micEnabled) enableMicrophone(this);
        else muteMicrophone(this);
    }, [micEnabled]);

    return(
        <button onClick={() => setMicEnabled(!micEnabled)}>
            <img src={micIconPath} alt={micEnabled?"disable":"enable" + " microphone"}></img>
        </button>
    );
}
