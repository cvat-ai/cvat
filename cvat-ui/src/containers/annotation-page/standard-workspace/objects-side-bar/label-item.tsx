// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import {
    changeLabelColorAsync,
    updateAnnotationsAsync,
} from 'actions/annotation-actions';

import LabelItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/label-item';
import { CombinedState } from 'reducers/interfaces';


interface OwnProps {
    labelID: number;
}

interface StateToProps {
    label: any;
    labelName: string;
    labelColor: string;
    labelColors: string[];
    objectStates: any[];
    jobInstance: any;
    frameNumber: any;
}

interface DispatchToProps {
    updateAnnotations(states: any[]): void;
    changeLabelColor(sessionInstance: any, frameNumber: number, label: any, color: string): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            annotations: {
                states: objectStates,
            },
            job: {
                labels,
                instance: jobInstance,
            },
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            colors: labelColors,
        },
    } = state;

    const [label] = labels
        .filter((_label: any) => _label.id === own.labelID);

    return {
        label,
        labelColor: label.color,
        labelName: label.name,
        labelColors,
        objectStates,
        jobInstance,
        frameNumber,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateAnnotations(states: any[]): void {
            dispatch(updateAnnotationsAsync(states));
        },
        changeLabelColor(
            sessionInstance: any,
            frameNumber: number,
            label: any,
            color: string,
        ): void {
            dispatch(changeLabelColorAsync(sessionInstance, frameNumber, label, color));
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;
interface State {
    objectStates: any[];
    ownObjectStates: any[];
    visible: boolean;
    statesHidden: boolean;
    statesLocked: boolean;
}

class LabelItemContainer extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            objectStates: [],
            ownObjectStates: [],
            visible: true,
            statesHidden: false,
            statesLocked: false,
        };
    }

    static getDerivedStateFromProps(props: Props, state: State): State | null {
        if (props.objectStates === state.objectStates) {
            return null;
        }

        const ownObjectStates = props.objectStates
            .filter((ownObjectState: any): boolean => ownObjectState.label.id === props.labelID);
        const visible = !!ownObjectStates.length;
        let statesHidden = true;
        let statesLocked = true;

        ownObjectStates.forEach((objectState: any) => {
            const { lock } = objectState;
            if (!lock) {
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

    private changeColor = (color: string): void => {
        const {
            changeLabelColor,
            label,
            frameNumber,
            jobInstance,
        } = this.props;

        changeLabelColor(jobInstance, frameNumber, label, color);
    };

    private switchHidden(value: boolean): void {
        const {
            updateAnnotations,
        } = this.props;

        const { ownObjectStates } = this.state;
        for (const state of ownObjectStates) {
            state.hidden = value;
        }

        updateAnnotations(ownObjectStates);
    }

    private switchLock(value: boolean): void {
        const {
            updateAnnotations,
        } = this.props;

        const { ownObjectStates } = this.state;
        for (const state of ownObjectStates) {
            state.lock = value;
        }

        updateAnnotations(ownObjectStates);
    }

    public render(): JSX.Element {
        const {
            visible,
            statesHidden,
            statesLocked,
        } = this.state;

        const {
            labelName,
            labelColor,
            labelColors,
        } = this.props;

        return (
            <LabelItemComponent
                labelName={labelName}
                labelColor={labelColor}
                labelColors={labelColors}
                visible={visible}
                statesHidden={statesHidden}
                statesLocked={statesLocked}
                hideStates={this.hideStates}
                showStates={this.showStates}
                lockStates={this.lockStates}
                unlockStates={this.unlockStates}
                changeColor={this.changeColor}
            />
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(LabelItemContainer);
