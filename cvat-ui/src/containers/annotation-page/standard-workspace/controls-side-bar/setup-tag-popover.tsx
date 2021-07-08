// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { CombinedState, ObjectType } from 'reducers/interfaces';
import { createAnnotationsAsync, rememberObject } from 'actions/annotation-actions';
import SetupTagPopoverComponent from 'components/annotation-page/standard-workspace/controls-side-bar/setup-tag-popover';

import { Canvas } from 'cvat-canvas-wrapper';
import getCore from 'cvat-core-wrapper';

const cvat = getCore();
interface DispatchToProps {
    onAnnotationCreate(sessionInstance: any, frame: number, states: any[]): void;
    onRememberObject(labelID: number): void;
}

interface StateToProps {
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas;
    jobInstance: any;
    labels: any[];
    frame: number;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onAnnotationCreate(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(createAnnotationsAsync(sessionInstance, frame, states));
        },
        onRememberObject(labelID: number): void {
            dispatch(rememberObject({ activeObjectType: ObjectType.TAG, activeLabelID: labelID }));
        },
    };
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: { instance: canvasInstance },
            job: { instance: jobInstance, labels },
            player: {
                frame: { number: frame },
            },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    return {
        canvasInstance,
        jobInstance,
        labels,
        frame,
        normalizedKeyMap,
    };
}

type Props = StateToProps & DispatchToProps;

interface State {
    selectedLabelID: number;
}

class DrawShapePopoverContainer extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        const defaultLabelID = props.labels[0].id;
        this.state = {
            selectedLabelID: defaultLabelID,
        };
    }

    private onChangeLabel = (value: any): void => {
        this.setState({
            selectedLabelID: value.id,
        });
    };

    private onSetup = (): void => {
        const {
            frame, labels, jobInstance, canvasInstance, onAnnotationCreate, onRememberObject,
        } = this.props;

        const { selectedLabelID } = this.state;

        canvasInstance.cancel();

        onRememberObject(selectedLabelID);

        const objectState = new cvat.classes.ObjectState({
            objectType: ObjectType.TAG,
            label: labels.filter((label: any) => label.id === selectedLabelID)[0],
            frame,
        });

        onAnnotationCreate(jobInstance, frame, [objectState]);
    };

    public render(): JSX.Element {
        const { selectedLabelID } = this.state;
        const { normalizedKeyMap, labels } = this.props;

        return (
            <SetupTagPopoverComponent
                labels={labels}
                selectedLabelID={selectedLabelID}
                repeatShapeShortcut={normalizedKeyMap.SWITCH_DRAW_MODE}
                onChangeLabel={this.onChangeLabel}
                onSetup={this.onSetup}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(DrawShapePopoverContainer);
