// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { CombinedState, ObjectType } from 'reducers';
import { createAnnotationsAsync, rememberObject } from 'actions/annotation-actions';
import SetupTagPopoverComponent from 'components/annotation-page/standard-workspace/controls-side-bar/setup-tag-popover';

import { Canvas } from 'cvat-canvas-wrapper';
import { getCore, Label, ObjectState } from 'cvat-core-wrapper';

const cvat = getCore();
interface DispatchToProps {
    onAnnotationCreate(states: ObjectState[]): void;
    onRememberObject(labelID: number): void;
}

interface StateToProps {
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas;
    jobInstance: any;
    states: any[];
    labels: any[];
    frame: number;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onAnnotationCreate(states: ObjectState[]): void {
            dispatch(createAnnotationsAsync(states));
        },
        onRememberObject(labelID: number): void {
            dispatch(rememberObject({
                activeObjectType: ObjectType.TAG,
                activeLabelID: labelID,
                activeShapeType: undefined,
            }));
        },
    };
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: { instance: canvasInstance },
            annotations: { states },
            job: { instance: jobInstance, labels },
            player: {
                frame: { number: frame },
            },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    return {
        canvasInstance: canvasInstance as Canvas,
        jobInstance,
        states,
        labels,
        frame,
        normalizedKeyMap,
    };
}

type Props = StateToProps & DispatchToProps;

interface State {
    selectedLabelID: number | null;
    frameTags: any[]
    canAddSelectedTag: boolean;
}

class DrawShapePopoverContainer extends React.PureComponent<Props, State> {
    private satisfiedLabels: Label[];
    constructor(props: Props) {
        super(props);

        const { states } = props;
        const frameTags = states.filter((objectState: any): boolean => objectState.objectType === ObjectType.TAG);
        this.satisfiedLabels = props.labels.filter((label: Label) => (
            ['any', ObjectType.TAG].includes(label.type)
        ));

        const defaultLabelID = this.satisfiedLabels.length ? this.satisfiedLabels[0].id as number : null;
        this.state = {
            selectedLabelID: defaultLabelID,
            canAddSelectedTag: frameTags.every((objectState: any): boolean => objectState.label.id !== defaultLabelID),
            frameTags,
        };
    }

    public componentDidUpdate(prevProps: Props, prevState: State): void {
        const { frameTags: prevFrameTags } = prevState;
        const { frame: prevFrame } = prevProps;
        const { states, frame } = this.props;
        const { selectedLabelID } = this.state;

        const frameTags = states.filter((objectState: any): boolean => objectState.objectType === ObjectType.TAG);
        if (prevFrame === frame && prevFrameTags.length === frameTags.length) {
            // do not update state if not necessary
            return;
        }

        const canAddSelectedTag = frameTags
            .every((objectState: any): boolean => objectState.label.id !== selectedLabelID);

        this.setState({
            frameTags,
            canAddSelectedTag,
        });
    }

    private onChangeLabel = (value: any): void => {
        const { onRememberObject } = this.props;
        const { frameTags } = this.state;
        const canAddSelectedTag = frameTags.every((objectState: any): boolean => objectState.label.id !== value.id);
        onRememberObject(value.id);

        this.setState({
            selectedLabelID: value.id,
            canAddSelectedTag,
        });
    };

    private onSetup = (): void => {
        const {
            frame, labels, canvasInstance, onAnnotationCreate, onRememberObject,
        } = this.props;

        const { selectedLabelID, canAddSelectedTag } = this.state;
        if (selectedLabelID !== null && canAddSelectedTag) {
            canvasInstance.cancel();

            onRememberObject(selectedLabelID);

            const objectState = new cvat.classes.ObjectState({
                objectType: ObjectType.TAG,
                label: labels.filter((label: any) => label.id === selectedLabelID)[0],
                frame,
            });

            onAnnotationCreate([objectState]);
        }
    };

    public render(): JSX.Element {
        const { selectedLabelID } = this.state;
        const { normalizedKeyMap } = this.props;

        return (
            <SetupTagPopoverComponent
                labels={this.satisfiedLabels}
                selectedLabelID={selectedLabelID}
                repeatShapeShortcut={normalizedKeyMap.SWITCH_DRAW_MODE}
                onChangeLabel={this.onChangeLabel}
                onSetup={this.onSetup}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(DrawShapePopoverContainer);
