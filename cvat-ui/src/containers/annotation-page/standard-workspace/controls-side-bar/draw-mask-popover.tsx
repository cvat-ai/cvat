// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import DrawMaskPopoverComponent from 'components/annotation-page/standard-workspace/controls-side-bar/draw-mask-popover';
import { rememberObject, updateCanvasBrushTools } from 'actions/annotation-actions';
import { CombinedState, ShapeType, ObjectType } from 'reducers';
import { Canvas } from 'cvat-canvas-wrapper';

interface DispatchToProps {
    onDrawStart(
        shapeType: ShapeType,
        labelID: number,
        objectType: ObjectType,
    ): void;
}

interface StateToProps {
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas;
    labels: any[];
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onDrawStart(
            shapeType: ShapeType,
            labelID: number,
            objectType: ObjectType,
        ): void {
            dispatch(
                rememberObject({
                    activeObjectType: objectType,
                    activeShapeType: shapeType,
                    activeLabelID: labelID,
                }),
            );
        },
    };
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: { instance: canvasInstance },
            job: { labels },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    return {
        canvasInstance: canvasInstance as Canvas,
        normalizedKeyMap,
        labels,
    };
}

type Props = StateToProps & DispatchToProps;

interface State {
    selectedLabelID: number;
}

class DrawShapePopoverContainer extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        const defaultLabelID = props.labels.length ? props.labels[0].id : null;
        this.state = { selectedLabelID: defaultLabelID };
    }

    private onDraw = (): void => {
        const { canvasInstance, onDrawStart } = this.props;
        const { selectedLabelID } = this.state;

        canvasInstance.cancel();
        canvasInstance.draw({
            enabled: true,
            shapeType: ShapeType.MASK,
            crosshair: false,
        });

        onDrawStart(ShapeType.MASK, selectedLabelID, ObjectType.SHAPE);
    };

    private onChangeLabel = (value: any): void => {
        this.setState({ selectedLabelID: value.id });
    };

    public render(): JSX.Element {
        const { selectedLabelID } = this.state;
        const { normalizedKeyMap, labels } = this.props;

        return (
            <DrawMaskPopoverComponent
                labels={labels}
                selectedLabelID={selectedLabelID}
                repeatShapeShortcut={normalizedKeyMap.SWITCH_DRAW_MODE}
                onChangeLabel={this.onChangeLabel}
                onDraw={this.onDraw}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(DrawShapePopoverContainer);
