// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { setAudioRegions } from 'actions/annotation-actions';
import LabelItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/label-item';
import { AudioRegion, CombinedState } from 'reducers';

interface OwnProps {
    labelID: number;
}

interface StateToProps {
    label: any;
    labelName: string;
    labelColor: string;
    audioRegions: AudioRegion[];
}

interface DispatchToProps {
    updateAudioRegions(regions: AudioRegion[]): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: { job: { labels } },
        audio: { player: { regions } },
    } = state;

    const [label] = labels.filter((_label: any) => _label.id === own.labelID);

    return {
        label,
        labelColor: label.color,
        labelName: label.name,
        audioRegions: regions,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateAudioRegions(regions: AudioRegion[]): void {
            dispatch(setAudioRegions(regions));
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;
interface State {
    audioRegions: AudioRegion[];
    ownRegions: AudioRegion[];
    visible: boolean;
    statesHidden: boolean;
    statesLocked: boolean;
}

class AudioLabelItemContainer extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            audioRegions: [],
            ownRegions: [],
            visible: true,
            statesHidden: false,
            statesLocked: false,
        };
    }

    static getDerivedStateFromProps(props: Readonly<Props>, state: State): State | null {
        if (props.audioRegions === state.audioRegions) {
            return null;
        }

        const ownRegions = props.audioRegions.filter(
            (region: AudioRegion): boolean => region.labelId === props.labelID,
        );
        const visible = !!ownRegions.length;
        let statesHidden = true;
        let statesLocked = true;

        ownRegions.forEach((region: AudioRegion) => {
            if (!region.locked) {
                statesHidden = statesHidden && !!region.hidden;
                statesLocked = statesLocked && !!region.locked;
            }
        });

        return {
            ...state,
            audioRegions: props.audioRegions,
            ownRegions,
            statesHidden,
            statesLocked,
            visible,
        };
    }

    private hideStates = (): void => {
        this.switchHidden(true);
    };

    private showStates = (): void => {
        this.switchHidden(false);
    };

    private lockStates = (): void => {
        this.switchLock(true);
    };

    private unlockStates = (): void => {
        this.switchLock(false);
    };

    private switchHidden(value: boolean): void {
        const { updateAudioRegions, audioRegions, labelID } = this.props;
        const next = audioRegions.map((r) => (r.labelId === labelID ? { ...r, hidden: value } : r));
        updateAudioRegions(next);
    }

    private switchLock(value: boolean): void {
        const { updateAudioRegions, audioRegions, labelID } = this.props;
        const next = audioRegions.map((r) => (r.labelId === labelID ? { ...r, locked: value } : r));
        updateAudioRegions(next);
    }

    public render(): JSX.Element {
        const { labelName, labelColor } = this.props;
        const { visible, statesHidden, statesLocked } = this.state;

        return (
            <LabelItemComponent
                labelName={labelName}
                labelColor={labelColor}
                visible={visible}
                statesHidden={statesHidden}
                statesLocked={statesLocked}
                hideStates={this.hideStates}
                showStates={this.showStates}
                lockStates={this.lockStates}
                unlockStates={this.unlockStates}
            />
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(AudioLabelItemContainer);
