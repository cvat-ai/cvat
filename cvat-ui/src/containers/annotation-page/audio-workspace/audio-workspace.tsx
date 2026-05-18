import { connect } from 'react-redux';

import AudioWorkspaceComponent from 'components/annotation-page/audio-workspace/audio-workspace';
import { CombinedState } from 'reducers';

function mapStateToProps(state: CombinedState) {
    return {
        waveformReady: state.audio.player.waveformReady,
        audioLoading: state.audio.player.audioLoading,
        audioError: state.audio.player.audioError,
    };
}

export default connect(mapStateToProps)(AudioWorkspaceComponent);
