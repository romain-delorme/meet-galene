import { shareScreen } from "../../../components-core/src/components/screenShare";
// @ts-expect-error the galene protocol needs to be rewritten in typescript for this to work
import type { ServerConnection } from "../../../components-core/src/protocol";

const ICON_PATH = 'src/frontend/@galene/components-styles/';

export function useShareScreenButton(): JSX.Element {
    return(
        <button onClick={
            function(this: ServerConnection){
                shareScreen(this);
            }
        }>
            <img src={ICON_PATH} alt="share screen"></img>
        </button>
    );
}
