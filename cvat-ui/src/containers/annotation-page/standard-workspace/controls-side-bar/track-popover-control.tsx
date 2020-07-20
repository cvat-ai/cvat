import React from 'react';
import { connect } from 'react-redux';

import {
    CombinedState
} from 'reducers/interfaces'

import {
    trackerSettings
} from 'actions/annotation-actions'

import TrackPopoverComponent from 'components/annotation-page/standard-workspace/controls-side-bar/track-popover-control';

interface DispatchToProps {
    handleChange(
        name: string,
        value: string | number
    ): void;
}

interface StateToProps {
    trackerType: string;
    trackUntil: string;
    trackerFrameNumber: number;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        handleChange(
            name: string,
            value: string | number
        ): void {
            dispatch(trackerSettings(name, value));
        }
    }
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            tracker: {
                trackerType,
                trackUntil,
                trackerFrameNumber
            }
        }
    } = state;

    return {
        trackerType,
        trackUntil,
        trackerFrameNumber,
    };
}

type Props = StateToProps & DispatchToProps;

class TrackSettingContainer extends React.Component<Props> {
    constructor(props: any) {
        super(props);
    }

    render(): JSX.Element {
        return (
            <TrackPopoverComponent {...this.props}/>
        )
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(TrackSettingContainer);