// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { setAudioRegions, updateAnnotationsAsync } from 'actions/annotation-actions';

import LabelItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/label-item';
import { AudioRegion, CombinedState } from 'reducers';
import { DimensionType, ObjectType } from 'cvat-core-wrapper';

interface OwnProps {
    labelID: number;
}

interface StateToProps {
    label: any;
    labelName: string;
    labelColor: string;
    objectStates: any[];
    audioRegions: AudioRegion[];
    isAudio: boolean;
    jobInstance: any;
    frameNumber: number;
}

interface DispatchToProps {
    updateAnnotations(states: any[]): void;
    setAudioRegions(regions: AudioRegion[]): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            annotations: { states: objectStates },
            job: { labels, instance: jobInstance },
            player: {
                frame: { number: frameNumber },
            },
        },
        audio: {
            player: { regions: audioRegions },
        },
    } = state;

    const [label] = labels.filter((_label: any) => _label.id === own.labelID);
    const isAudio = !!jobInstance && jobInstance.dimension === DimensionType.DIMENSION_1D;

    return {
        label,
        labelColor: label.color,
        labelName: label.name,
        objectStates,
        audioRegions,
        isAudio,
        jobInstance,
        frameNumber,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateAnnotations(states: any[]): void {
            dispatch(updateAnnotationsAsync(states));
        },
        setAudioRegions(regions: AudioRegion[]): void {
            dispatch(setAudioRegions(regions));
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;
interface State {
    objectStates: any[];
    audioRegions: AudioRegion[];
    ownObjectStates: any[];
    ownAudioRegions: AudioRegion[];
    visible: boolean;
    statesHidden: boolean;
    statesLocked: boolean;
}

class LabelItemContainer extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            objectStates: [],
            audioRegions: [],
            ownObjectStates: [],
            ownAudioRegions: [],
            visible: true,
            statesHidden: false,
            statesLocked: false,
        };
    }

    static getDerivedStateFromProps(props: Readonly<Props>, state: State): State | null {
        if (props.isAudio) {
            if (props.audioRegions === state.audioRegions) {
                return null;
            }
            const ownAudioRegions = props.audioRegions.filter(
                (region) => region.labelId === props.labelID,
            );
            const visible = !!ownAudioRegions.length;
            const statesLocked = visible && ownAudioRegions.every((region) => !!region.locked);
            const statesHidden = visible && ownAudioRegions.every((region) => !!region.hidden);
            return {
                ...state,
                audioRegions: props.audioRegions,
                ownAudioRegions,
                visible,
                statesHidden,
                statesLocked,
            };
        }

        if (props.objectStates === state.objectStates) {
            return null;
        }

        const ownObjectStates = props.objectStates.filter(
            (ownObjectState: any): boolean => ownObjectState.label.id === props.labelID,
        );
        const visible = !!ownObjectStates.length;
        let statesHidden = true;
        let statesLocked = true;

        ownObjectStates.forEach((objectState: any) => {
            const { lock, objectType } = objectState;
            if (!lock && objectType !== ObjectType.TAG) {
                statesHidden = statesHidden && objectState.hidden;
                statesLocked = statesLocked && objectState.lock;
            }
        });

        return {
            ...state,
            objectStates: props.objectStates,
            ownObjectStates,
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
        const {
            isAudio, updateAnnotations, setAudioRegions: dispatchSetAudioRegions, audioRegions, labelID,
        } = this.props;

        if (isAudio) {
            const next = audioRegions.map((region) => (
                region.labelId === labelID ? { ...region, hidden: value } : region
            ));
            dispatchSetAudioRegions(next);
            return;
        }

        const { ownObjectStates } = this.state;
        if (ownObjectStates.length) {
            // false alarm
            // eslint-disable-next-line
            updateAnnotations(ownObjectStates.map((state: any) => ((state.hidden = value), state)));
        }
    }

    private switchLock(value: boolean): void {
        const {
            isAudio, updateAnnotations, setAudioRegions: dispatchSetAudioRegions, audioRegions, labelID,
        } = this.props;

        if (isAudio) {
            const next = audioRegions.map((region) => (
                region.labelId === labelID ? { ...region, locked: value } : region
            ));
            dispatchSetAudioRegions(next);
            return;
        }

        const { ownObjectStates } = this.state;
        if (ownObjectStates.length) {
            // false alarm
            // eslint-disable-next-line
            updateAnnotations(ownObjectStates.map((state: any) => ((state.lock = value), state)));
        }
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
)(LabelItemContainer);
