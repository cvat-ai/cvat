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
    tracker_type: string;
    tracker_until: string;
    tracker_frame_number: number;
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
                tracker_type,
                tracker_until,
                tracker_frame_number
            }
        }
    } = state;

    return {
        tracker_type,
        tracker_until,
        tracker_frame_number,
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