// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { updateAnnotationsAsync } from 'actions/annotation-actions';

import LabelItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/label-item';
import { CombinedState, ObjectType } from 'reducers/interfaces';

interface OwnProps {
    labelID: number;
    keyToLabelMapping: Record<string, number>;
    updateLabelShortcutKey(updatedKey: string, labelID: number): void;
}

interface StateToProps {
    label: any;
    labelName: string;
    labelColor: string;
    objectStates: any[];
    jobInstance: any;
    frameNumber: number;
}

interface DispatchToProps {
    updateAnnotations(states: any[]): void;
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
    } = state;

    const [label] = labels.filter((_label: any) => _label.id === own.labelID);

    return {
        label,
        labelColor: label.color,
        labelName: label.name,
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
        const { updateAnnotations } = this.props;
        const { ownObjectStates } = this.state;

        if (ownObjectStates.length) {
            // false alarm
            // eslint-disable-next-line
            updateAnnotations(ownObjectStates.map((state: any) => ((state.hidden = value), state)));
        }
    }

    private switchLock(value: boolean): void {
        const { updateAnnotations } = this.props;
        const { ownObjectStates } = this.state;

        if (ownObjectStates.length) {
            // false alarm
            // eslint-disable-next-line
            updateAnnotations(ownObjectStates.map((state: any) => ((state.lock = value), state)));
        }
    }

    public render(): JSX.Element {
        const {
            labelName, labelColor, keyToLabelMapping, labelID, updateLabelShortcutKey,
        } = this.props;
        const { visible, statesHidden, statesLocked } = this.state;

        return (
            <LabelItemComponent
                labelName={labelName}
                labelColor={labelColor}
                labelID={labelID}
                keyToLabelMapping={keyToLabelMapping}
                visible={visible}
                statesHidden={statesHidden}
                statesLocked={statesLocked}
                hideStates={this.hideStates}
                showStates={this.showStates}
                lockStates={this.lockStates}
                unlockStates={this.unlockStates}
                updateLabelShortcutKey={updateLabelShortcutKey}
            />
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(LabelItemContainer);
