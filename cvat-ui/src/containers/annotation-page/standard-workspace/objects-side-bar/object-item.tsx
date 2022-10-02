// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import copy from 'copy-to-clipboard';
import { connect } from 'react-redux';

import {
    updateAnnotationsAsync,
    changeFrameAsync,
    changeGroupColorAsync,
    pasteShapeAsync,
    copyShape as copyShapeAction,
    propagateObject as propagateObjectAction,
    activateObjects as activateObjectsAction,
    removeObjects as removeObjectsAction,
} from 'actions/annotation-actions';
import {
    ActiveControl, CombinedState, ColorBy, ShapeType,
} from 'reducers';
import ObjectStateItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item';
import { getColor } from 'components/annotation-page/standard-workspace/objects-side-bar/shared';
import { shift } from 'utils/math';
import { Label, ObjectState } from 'cvat-core-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';

interface OwnProps {
    readonly: boolean;
    objectState: ObjectState;
    activateOnClick: boolean;
}

interface StateToProps {
    objectState: ObjectState;
    labels: Label[];
    attributes: any[];
    jobInstance: any;
    frameNumber: number;
    activated: boolean;
    activateOnClick: boolean; // Whether the item becomes activated when the user clicks on it
    colorBy: ColorBy;
    ready: boolean;
    activeControl: ActiveControl;
    activatedElementID: number | null;
    minZLayer: number;
    maxZLayer: number;
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas | Canvas3d;
}

interface DispatchToProps {
    changeFrame(frame: number): void;
    updateState(objectState: any): void;
    activateObjects: (activatedStateIDs: number[], activatedElementID: number | null, multiSelect: boolean) => void;
    removeObjects: (objectStates: ObjectState[], force: boolean) => void;
    copyShape: (objectState: any) => void;
    propagateObject: (objectState: any) => void;
    changeGroupColor(group: number, color: string): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            annotations: {
                activatedStateIDs,
                zLayer: { min: minZLayer, max: maxZLayer },
            },
            job: { attributes: jobAttributes, instance: jobInstance, labels },
            player: {
                frame: { number: frameNumber },
            },
            canvas: { instance: canvasInstance, ready, activeControl },
        },
        settings: {
            shapes: { colorBy },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    return {
        objectState: own.objectState,
        attributes: jobAttributes[own.objectState.label.id ?? 0],
        labels,
        ready,
        activeControl,
        colorBy,
        jobInstance,
        frameNumber,
        activated: activatedStateIDs.includes(own.objectState.clientID ?? 0),
        activateOnClick: own.activateOnClick,
        minZLayer,
        maxZLayer,
        normalizedKeyMap,
        canvasInstance,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        changeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
        updateState(state: any): void {
            dispatch(updateAnnotationsAsync([state]));
        },
        activateObjects(activatedStateIDs: number[], activatedElementID: number | null, multiSelect: boolean): void {
            dispatch(activateObjectsAction(activatedStateIDs, activatedElementID, null, multiSelect));
        },
        removeObjects(objectStates: ObjectState[]): void {
            dispatch(removeObjectsAction(objectStates, false));
        },
        copyShape(objectState: any): void {
            dispatch(copyShapeAction(objectState));
            dispatch(pasteShapeAsync());
        },
        propagateObject(objectState: any): void {
            dispatch(propagateObjectAction(objectState));
        },
        changeGroupColor(group: number, color: string): void {
            dispatch(changeGroupColorAsync(group, color));
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;
class ObjectItemContainer extends React.PureComponent<Props> {
    private copy = (): void => {
        const { objectState, readonly, copyShape } = this.props;
        if (!readonly) {
            copyShape(objectState);
        }
    };

    private propagate = (): void => {
        const { objectState, readonly, propagateObject } = this.props;
        if (!readonly) {
            propagateObject(objectState);
        }
    };

    private remove = (): void => {
        const {
            objectState, readonly, removeObjects,
        } = this.props;

        if (!readonly) {
            removeObjects([objectState], false);
        }
    };

    private createURL = (): void => {
        const { objectState, frameNumber } = this.props;
        const { origin, pathname } = window.location;

        const search = `frame=${frameNumber}&type=${objectState.objectType}&serverID=${objectState.serverID}`;
        const url = `${origin}${pathname}?${search}`;
        copy(url);
    };

    private switchOrientation = (): void => {
        const { objectState, readonly, updateState } = this.props;
        if (readonly) {
            return;
        }

        if (objectState.shapeType === ShapeType.CUBOID) {
            this.switchCuboidOrientation();
            return;
        }

        const reducedPoints = objectState.points.reduce(
            (acc: number[][], _: number, index: number, array: number[]): number[][] => {
                if (index % 2) {
                    acc.push([array[index - 1], array[index]]);
                }

                return acc;
            },
            [],
        );

        if (objectState.shapeType === ShapeType.POLYGON) {
            objectState.points = reducedPoints.slice(0, 1).concat(reducedPoints.reverse().slice(0, -1)).flat();
            updateState(objectState);
        } else if (objectState.shapeType === ShapeType.POLYLINE) {
            objectState.points = reducedPoints.reverse().flat();
            updateState(objectState);
        }
    };

    private toBackground = (): void => {
        const { objectState, readonly, minZLayer } = this.props;

        if (!readonly) {
            objectState.zOrder = minZLayer - 1;
            this.commit();
        }
    };

    private toForeground = (): void => {
        const { objectState, readonly, maxZLayer } = this.props;

        if (!readonly) {
            objectState.zOrder = maxZLayer + 1;
            this.commit();
        }
    };

    private activate = (activatedElementID: number, multiSelect: boolean): void => {
        const {
            objectState, ready, activeControl, activateObjects, canvasInstance, activateOnClick,
        } = this.props;

        if (activateOnClick && ready && activeControl === ActiveControl.CURSOR) {
            activateObjects([objectState.clientID], activatedElementID, multiSelect);
            if (canvasInstance instanceof Canvas3d) {
                canvasInstance.activate(objectState.clientID);
            }
        }
    };

    private changeColor = (color: string): void => {
        const { objectState, colorBy, changeGroupColor } = this.props;

        if (colorBy === ColorBy.INSTANCE) {
            objectState.color = color;
            this.commit();
        } else if (colorBy === ColorBy.GROUP) {
            changeGroupColor(objectState.group.id, color);
        }
    };

    private changeLabel = (label: any): void => {
        const { objectState, readonly } = this.props;
        if (!readonly) {
            objectState.label = label;
            this.commit();
        }
    };

    private switchCuboidOrientation = (): void => {
        function cuboidOrientationIsLeft(points: number[]): boolean {
            return points[12] > points[0];
        }

        const { objectState, readonly } = this.props;

        if (!readonly) {
            this.resetCuboidPerspective(false);
            objectState.points = shift(objectState.points, cuboidOrientationIsLeft(objectState.points) ? 4 : -4);

            this.commit();
        }
    };

    private resetCuboidPerspective = (commit = true): void => {
        function cuboidOrientationIsLeft(points: number[]): boolean {
            return points[12] > points[0];
        }
        const { objectState, readonly } = this.props;

        if (!readonly && objectState.points) {
            const { points } = objectState;
            const minD = {
                x: (points[6] - points[2]) * 0.001,
                y: (points[3] - points[1]) * 0.001,
            };

            if (cuboidOrientationIsLeft(points)) {
                points[14] = points[10] + points[2] - points[6] + minD.x;
                points[15] = points[11] + points[3] - points[7];
                points[8] = points[10] + points[4] - points[6];
                points[9] = points[11] + points[5] - points[7] + minD.y;
                points[12] = points[14] + points[0] - points[2];
                points[13] = points[15] + points[1] - points[3] + minD.y;
            } else {
                points[10] = points[14] + points[6] - points[2] - minD.x;
                points[11] = points[15] + points[7] - points[3];
                points[12] = points[14] + points[0] - points[2];
                points[13] = points[15] + points[1] - points[3] + minD.y;
                points[8] = points[12] + points[4] - points[0] - minD.x;
                points[9] = points[13] + points[5] - points[1];
            }

            objectState.points = points;
            if (commit) this.commit();
        }
    };

    private commit(): void {
        const { objectState, readonly, updateState } = this.props;
        if (!readonly) {
            updateState(objectState);
        }
    }

    public render(): JSX.Element {
        const {
            objectState,
            labels,
            attributes,
            activated,
            colorBy,
            normalizedKeyMap,
            readonly,
            jobInstance,
        } = this.props;

        return (
            <ObjectStateItemComponent
                jobInstance={jobInstance}
                readonly={readonly}
                activated={activated}
                objectType={objectState.objectType}
                shapeType={objectState.shapeType}
                clientID={objectState.clientID}
                serverID={objectState.serverID}
                locked={objectState.lock}
                labelID={objectState.label.id}
                color={getColor(objectState, colorBy)}
                attributes={attributes}
                elements={objectState.elements}
                normalizedKeyMap={normalizedKeyMap}
                labels={labels.filter((label: Label) => (
                    [objectState.shapeType || objectState.objectType, 'any'].includes(label.type)
                ))}
                colorBy={colorBy}
                activate={this.activate}
                remove={this.remove}
                copy={this.copy}
                propagate={this.propagate}
                createURL={this.createURL}
                switchOrientation={this.switchOrientation}
                toBackground={this.toBackground}
                toForeground={this.toForeground}
                changeColor={this.changeColor}
                changeLabel={this.changeLabel}
                resetCuboidPerspective={() => this.resetCuboidPerspective()}
            />
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectItemContainer);
