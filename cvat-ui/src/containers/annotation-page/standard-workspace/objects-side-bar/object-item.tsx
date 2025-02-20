// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import {
    updateAnnotationsAsync,
    changeFrameAsync,
    changeGroupColorAsync,
    pasteShapeAsync,
    updateActiveControl as updateActiveControlAction,
    copyShape as copyShapeAction,
    activateObject as activateObjectAction,
    switchPropagateVisibility as switchPropagateVisibilityAction,
    removeObject as removeObjectAction,
} from 'actions/annotation-actions';
import {
    ActiveControl, CombinedState, ColorBy, ShapeType,
} from 'reducers';
import { openAnnotationsActionModal } from 'components/annotation-page/annotations-actions/annotations-actions-modal';
import ObjectStateItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item';
import { getColor } from 'components/annotation-page/standard-workspace/objects-side-bar/shared';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { shift } from 'utils/math';
import {
    Label, ObjectState, Attribute, Job,
} from 'cvat-core-wrapper';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { filterApplicableLabels } from 'utils/filter-applicable-labels';
import { toClipboard } from 'utils/to-clipboard';

interface OwnProps {
    readonly: boolean;
    clientID: number;
    objectStates: ObjectState[];
}

interface StateToProps {
    objectState: ObjectState;
    labels: Label[];
    attributes: Attribute[];
    jobInstance: Job;
    frameNumber: number;
    activated: boolean;
    colorBy: ColorBy;
    ready: boolean;
    activeControl: ActiveControl;
    minZLayer: number;
    maxZLayer: number;
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas | Canvas3d;
}

interface DispatchToProps {
    changeFrame(frame: number): void;
    updateState(objectState: ObjectState): void;
    activateObject: (activatedStateID: number | null, activatedElementID: number | null) => void;
    removeObject: (objectState: ObjectState) => void;
    copyShape: (objectState: ObjectState) => void;
    switchPropagateVisibility: (visible: boolean) => void;
    changeGroupColor(group: number, color: string): void;
    updateActiveControl(activeControl: ActiveControl): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            annotations: {
                activatedStateID,
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

    const { objectStates: states, clientID } = own;
    const stateIDs = states.map((_state: any): number => _state.clientID);
    const index = stateIDs.indexOf(clientID);

    return {
        objectState: states[index],
        attributes: jobAttributes[states[index].label.id as number],
        labels,
        ready,
        activeControl,
        colorBy,
        jobInstance,
        frameNumber,
        activated: activatedStateID === clientID,
        minZLayer,
        maxZLayer,
        normalizedKeyMap,
        canvasInstance: canvasInstance as Canvas | Canvas3d,
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
        activateObject(activatedStateID: number | null): void {
            dispatch(activateObjectAction(activatedStateID, null, null));
        },
        removeObject(objectState: any): void {
            dispatch(removeObjectAction(objectState, false));
        },
        copyShape(objectState: any): void {
            dispatch(copyShapeAction(objectState));
            dispatch(pasteShapeAsync());
        },
        switchPropagateVisibility(visible: boolean): void {
            dispatch(switchPropagateVisibilityAction(visible));
        },
        changeGroupColor(group: number, color: string): void {
            dispatch(changeGroupColorAsync(group, color));
        },
        updateActiveControl(activeControl: ActiveControl): void {
            dispatch(updateActiveControlAction(activeControl));
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;
interface State {
    labels: Label[];
    elements: number[];
}

class ObjectItemContainer extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            labels: props.labels,
            elements: props.objectState.elements.map((el: ObjectState) => el.clientID as number),
        };
    }

    public static getDerivedStateFromProps(props: Readonly<Props>, state: Readonly<State>): State | null {
        const { objectState, labels } = props;
        const applicableLabels = filterApplicableLabels(objectState, labels);
        if (state.labels.length !== applicableLabels.length ||
            state.labels.some((label, idx) => label.id !== applicableLabels[idx].id)) {
            return {
                ...state,
                labels: applicableLabels,
            };
        }

        return null;
    }

    private copy = (): void => {
        const { objectState, readonly, copyShape } = this.props;
        if (!readonly) {
            copyShape(objectState);
        }
    };

    private propagate = (): void => {
        const { switchPropagateVisibility, readonly } = this.props;
        if (!readonly) {
            switchPropagateVisibility(true);
        }
    };

    private edit = (): void => {
        const {
            objectState, readonly, canvasInstance, updateActiveControl,
        } = this.props;

        if (!readonly && canvasInstance instanceof Canvas &&
            [ShapeType.POLYGON, ShapeType.MASK].includes(objectState.shapeType)
        ) {
            if (canvasInstance.mode() !== CanvasMode.IDLE) {
                canvasInstance.cancel();
            }

            updateActiveControl(ActiveControl.EDIT);
            canvasInstance.edit({ enabled: true, state: objectState });
        }
    };

    private slice = async (): Promise<void> => {
        const {
            objectState, readonly, canvasInstance, updateActiveControl,
        } = this.props;

        if (!readonly && canvasInstance instanceof Canvas &&
            [ShapeType.POLYGON, ShapeType.MASK].includes(objectState.shapeType)
        ) {
            if (canvasInstance.mode() !== CanvasMode.IDLE) {
                canvasInstance.cancel();
            }

            updateActiveControl(ActiveControl.SLICE);
            canvasInstance.slice({
                enabled: true,
                getContour: openCVWrapper.getContourFromState,
                clientID: objectState.clientID as number,
            });
        }
    };

    private remove = (): void => {
        const {
            objectState, readonly, removeObject,
        } = this.props;

        if (!readonly) {
            removeObject(objectState);
        }
    };

    private createURL = (): void => {
        const { objectState, frameNumber } = this.props;
        const { origin, pathname } = window.location;

        const search = `frame=${frameNumber}&type=${objectState.objectType}&serverID=${objectState.serverID}`;
        const url = `${origin}${pathname}?${search}`;

        toClipboard(url);
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

        if ([ShapeType.POLYGON, ShapeType.POLYLINE].includes(objectState.shapeType)) {
            const reducedPoints = (objectState.points as number[]).reduce(
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

    private activate = (activeElementID?: number): void => {
        const {
            objectState, ready, activeControl, activateObject,
        } = this.props;

        if (ready && activeControl === ActiveControl.CURSOR) {
            activateObject(
                objectState.clientID,
                (Number.isInteger(activeElementID) ? activeElementID : null) as number | null,
            );
        }
    };

    private changeColor = (color: string): void => {
        const { objectState, colorBy, changeGroupColor } = this.props;

        if (colorBy === ColorBy.INSTANCE) {
            objectState.color = color;
            this.commit();
        } else if (colorBy === ColorBy.GROUP && objectState.group) {
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

        if (!readonly && objectState.shapeType === ShapeType.CUBOID) {
            const points = objectState.points as number[];
            this.resetCuboidPerspective(false);
            objectState.points = shift(points, cuboidOrientationIsLeft(points) ? 4 : -4);
            this.commit();
        }
    };

    private resetCuboidPerspective = (commit = true): void => {
        function cuboidOrientationIsLeft(points: number[]): boolean {
            return points[12] > points[0];
        }
        const { objectState, readonly } = this.props;

        if (!readonly && objectState.shapeType === ShapeType.CUBOID) {
            const points = objectState.points as number[];
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

    private runAnnotationAction = (): void => {
        const { objectState } = this.props;
        openAnnotationsActionModal({ defaultObjectState: objectState });
    };

    private commit(): void {
        const { objectState, readonly, updateState } = this.props;
        if (!readonly) {
            updateState(objectState);
        }
    }

    public render(): JSX.Element {
        const { labels, elements } = this.state;
        const {
            objectState,
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
                clientID={objectState.clientID as number}
                serverID={objectState.serverID}
                locked={objectState.lock}
                labelID={objectState.label.id as number}
                isGroundTruth={objectState.isGroundTruth}
                color={getColor(objectState, colorBy)}
                attributes={attributes}
                elements={elements}
                normalizedKeyMap={normalizedKeyMap}
                labels={labels}
                colorBy={colorBy}
                activate={this.activate}
                remove={this.remove}
                copy={this.copy}
                createURL={this.createURL}
                propagate={this.propagate}
                switchOrientation={this.switchOrientation}
                toBackground={this.toBackground}
                toForeground={this.toForeground}
                changeColor={this.changeColor}
                changeLabel={this.changeLabel}
                edit={this.edit}
                slice={this.slice}
                resetCuboidPerspective={this.resetCuboidPerspective}
                runAnnotationAction={this.runAnnotationAction}
            />
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectItemContainer);
