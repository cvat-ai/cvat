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
    switchSimplifyVisibility as switchSimplifyVisibilityAction,
    removeObject as removeObjectAction,
    collapseObjectItems,
} from 'actions/annotation-actions';
import {
    ActiveControl, CombinedState, ColorBy,
} from 'reducers';
import { openAnnotationsActionModal } from 'components/annotation-page/annotations-actions/annotations-actions-modal';
import ObjectStateItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item';
import { getObjectStateColor } from 'components/annotation-page/standard-workspace/objects-side-bar/shared';
import PolygonSimplifyControl from 'components/annotation-page/standard-workspace/controls-side-bar/polygon-simplify-control';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { shift } from 'utils/math';
import {
    Label, ObjectState, Attribute, Job, ShapeType, ObjectType,
} from 'cvat-core-wrapper';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { filterApplicableLabels } from 'utils/filter-applicable-labels';
import { toClipboard } from 'utils/to-clipboard';

interface OwnProps {
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
    focusedObjectPadding: number;
    defaultApproxPolyAccuracy: number;
    simplifyState: {
        objectState: any;
        originalPoints: number[] | null;
    };
}

interface DispatchToProps {
    changeFrame(frame: number): void;
    updateState(objectState: ObjectState): void;
    activateObject: (activatedStateID: number | null, activatedElementID: number | null) => void;
    removeObject: (objectState: ObjectState) => void;
    copyShape: (objectState: ObjectState) => void;
    switchPropagateVisibility: (visible: boolean) => void;
    switchSimplifyVisibility: (objectState: any, originalPoints: number[] | null) => void;
    changeGroupColor(group: number, color: string): void;
    updateActiveControl(activeControl: ActiveControl): void;
    expandObject(objectState: ObjectState): void;
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
            simplify: simplifyState,
        },
        settings: {
            shapes: { colorBy },
            workspace: { focusedObjectPadding, defaultApproxPolyAccuracy },
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
        focusedObjectPadding,
        defaultApproxPolyAccuracy,
        simplifyState,
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
        switchSimplifyVisibility(objectState: any, originalPoints: number[] | null): void {
            dispatch(switchSimplifyVisibilityAction(objectState, originalPoints));
        },
        changeGroupColor(group: number, color: string): void {
            dispatch(changeGroupColorAsync(group, color));
        },
        updateActiveControl(activeControl: ActiveControl): void {
            dispatch(updateActiveControlAction(activeControl));
        },
        expandObject(objectState: ObjectState): void {
            dispatch(collapseObjectItems([objectState], false));
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;
interface State {
    labels: Label[];
    elements: number[];
    simplifyMode: boolean;
    approxPolyAccuracy: number;
    originalPoints: number[] | null;
}

class ObjectItemContainer extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            labels: props.labels,
            elements: props.objectState.elements.map((el: ObjectState) => el.clientID as number),
            simplifyMode: false,
            approxPolyAccuracy: props.defaultApproxPolyAccuracy,
            originalPoints: null,
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

    public componentDidUpdate(prevProps: Readonly<Props>): void {
        const { objectState, simplifyState, defaultApproxPolyAccuracy } = this.props;
        const { simplifyMode } = this.state;

        // Check if simplify was triggered for this object
        if (
            !simplifyMode &&
            simplifyState.objectState &&
            simplifyState.objectState.clientID === objectState.clientID &&
            (!prevProps.simplifyState.objectState ||
                prevProps.simplifyState.objectState.clientID !== objectState.clientID)
        ) {
            // Enter simplify mode
            this.setState({
                simplifyMode: true,
                originalPoints: simplifyState.originalPoints,
            });
        }

        // Update approxPolyAccuracy when default setting changes (but not during active simplification)
        if (!simplifyMode && prevProps.defaultApproxPolyAccuracy !== defaultApproxPolyAccuracy) {
            this.setState({
                approxPolyAccuracy: defaultApproxPolyAccuracy,
            });
        }
    }

    private copy = (): void => {
        const { objectState, copyShape } = this.props;
        copyShape(objectState);
    };

    private propagate = (): void => {
        const { switchPropagateVisibility } = this.props;
        switchPropagateVisibility(true);
    };

    private edit = (): void => {
        const {
            objectState, canvasInstance, updateActiveControl,
        } = this.props;

        if (canvasInstance instanceof Canvas &&
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
            objectState, canvasInstance, updateActiveControl,
        } = this.props;

        if (canvasInstance instanceof Canvas &&
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

    private simplify = (): void => {
        const { objectState, canvasInstance, activateObject } = this.props;

        if ([ShapeType.POLYGON, ShapeType.POLYLINE].includes(objectState.shapeType)) {
            // Store original points for restoration if cancelled
            const originalPoints = objectState.points ? [...objectState.points] : [];

            // Ensure this object is activated and focused
            activateObject(objectState.clientID as number, null);

            // Lock canvas interactions (similar to edit/slice mode)
            if (canvasInstance instanceof Canvas && canvasInstance.mode() !== CanvasMode.IDLE) {
                canvasInstance.cancel();
            }

            // Enter simplify mode
            this.setState({
                simplifyMode: true,
                originalPoints,
            });
        }
    };

    private applySimplification = async (): Promise<void> => {
        const {
            objectState, updateState, switchSimplifyVisibility,
        } = this.props;

        try {
            // Initialize OpenCV if needed
            if (!openCVWrapper.isInitialized) {
                await openCVWrapper.initialize(() => {});
            }

            // The control component has already updated objectState.points with preview
            // Just save it
            await updateState(objectState);

            // Clear Redux simplify state
            switchSimplifyVisibility(null, null);

            // Exit simplify mode (keep approxPolyAccuracy for next time)
            this.setState({ simplifyMode: false });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to apply simplification:', error);
            switchSimplifyVisibility(null, null);
            this.setState({ simplifyMode: false });
        }
    };

    private cancelSimplification = (): void => {
        const {
            objectState, updateState, switchSimplifyVisibility,
        } = this.props;
        const { originalPoints } = this.state;

        // Restore original points
        if (originalPoints) {
            objectState.points = originalPoints;
            updateState(objectState);
        }

        // Clear Redux simplify state
        switchSimplifyVisibility(null, null);

        // Exit simplify mode without saving (keep approxPolyAccuracy for next time)
        this.setState({
            simplifyMode: false,
            originalPoints: null,
        });
    };

    private updateSimplificationPreview = (points: number[]): void => {
        const { objectState, updateState } = this.props;

        // Update points temporarily for preview
        objectState.points = points;
        updateState(objectState);
    };

    private onChangeAccuracy = (value: number): void => {
        this.setState({ approxPolyAccuracy: value });
    };

    private remove = (): void => {
        const {
            objectState, removeObject,
        } = this.props;

        removeObject(objectState);
    };

    private createURL = (): void => {
        const { objectState, frameNumber } = this.props;
        const { origin, pathname } = window.location;

        const search = `frame=${frameNumber}&type=${objectState.objectType}&serverID=${objectState.serverID}`;
        const url = `${origin}${pathname}?${search}`;

        toClipboard(url);
    };

    private switchOrientation = (): void => {
        const { objectState, updateState } = this.props;

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
        const { objectState, minZLayer } = this.props;

        objectState.zOrder = minZLayer - 1;
        this.commit();
    };

    private toForeground = (): void => {
        const { objectState, maxZLayer } = this.props;

        objectState.zOrder = maxZLayer + 1;
        this.commit();
    };

    private readonly toOneLayerBackward = (): void => {
        const { objectState } = this.props;

        objectState.zOrder -= 1;
        this.commit();
    };

    private readonly toOneLayerForward = (): void => {
        const { objectState } = this.props;

        objectState.zOrder += 1;
        this.commit();
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

    private focusAndExpand = (): void => {
        const {
            objectState, canvasInstance, focusedObjectPadding, expandObject,
        } = this.props;

        if (objectState.objectType !== ObjectType.TAG) {
            if (canvasInstance instanceof Canvas) {
                canvasInstance.focus(objectState.clientID as number, focusedObjectPadding);
            } else if (canvasInstance instanceof Canvas3d) {
                canvasInstance.focus(objectState.clientID as number);
            }
        }

        expandObject(objectState);
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
        const { objectState } = this.props;
        objectState.label = label;
        this.commit();
    };

    private switchCuboidOrientation = (): void => {
        function cuboidOrientationIsLeft(points: number[]): boolean {
            return points[12] > points[0];
        }

        const { objectState } = this.props;

        if (objectState.shapeType === ShapeType.CUBOID) {
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
        const { objectState } = this.props;

        if (objectState.shapeType === ShapeType.CUBOID) {
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
        const { objectState, updateState } = this.props;
        updateState(objectState);
    }

    public render(): JSX.Element {
        const {
            labels, elements, simplifyMode, approxPolyAccuracy,
        } = this.state;
        const {
            objectState,
            attributes,
            activated,
            colorBy,
            normalizedKeyMap,
            jobInstance,
        } = this.props;

        return (
            <>
                <ObjectStateItemComponent
                    jobInstance={jobInstance}
                    activated={activated}
                    objectType={objectState.objectType}
                    shapeType={objectState.shapeType}
                    clientID={objectState.clientID as number}
                    serverID={objectState.serverID}
                    locked={objectState.lock}
                    labelID={objectState.label.id as number}
                    isGroundTruth={objectState.isGroundTruth}
                    color={getObjectStateColor(objectState, colorBy).rgbComponents()}
                    attributes={attributes}
                    elements={elements}
                    normalizedKeyMap={normalizedKeyMap}
                    labels={labels}
                    colorBy={colorBy}
                    activate={this.activate}
                    focusAndExpand={this.focusAndExpand}
                    remove={this.remove}
                    copy={this.copy}
                    createURL={this.createURL}
                    propagate={this.propagate}
                    switchOrientation={this.switchOrientation}
                    toBackground={this.toBackground}
                    toForeground={this.toForeground}
                    toOneLayerBackward={this.toOneLayerBackward}
                    toOneLayerForward={this.toOneLayerForward}
                    changeColor={this.changeColor}
                    changeLabel={this.changeLabel}
                    edit={this.edit}
                    slice={this.slice}
                    simplify={this.simplify}
                    resetCuboidPerspective={this.resetCuboidPerspective}
                    runAnnotationAction={this.runAnnotationAction}
                />
                {simplifyMode && (
                    <PolygonSimplifyControl
                        objectState={objectState}
                        approxPolyAccuracy={approxPolyAccuracy}
                        onChangeAccuracy={this.onChangeAccuracy}
                        onApply={this.applySimplification}
                        onCancel={this.cancelSimplification}
                        onUpdatePreview={this.updateSimplificationPreview}
                    />
                )}
            </>
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectItemContainer);
