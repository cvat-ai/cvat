import { connect } from 'react-redux';

import AudioWorkspaceComponent from 'components/annotation-page/audio-workspace/audio-workspace';
import { CombinedState } from 'reducers';

function mapStateToProps(state: CombinedState) {
    return {
        waveformReady: state.annotation.audioPlayer.waveformReady,
        audioLoading: state.annotation.audioPlayer.audioLoading,
        audioError: state.annotation.audioPlayer.audioError,
    };
}

export default connect(mapStateToProps)(AudioWorkspaceComponent);
