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
import PolySimplifyControl from 'components/annotation-page/standard-workspace/controls-side-bar/poly-simplify-control';
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
    allowSimplifyLifecycle?: boolean;
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
    keyMap: Record<string, { sequences: string[] }>;
    canvasInstance: Canvas | Canvas3d;
    focusedObjectPadding: number;
    defaultApproxPolyAccuracy: number;
    simplifyState: {
        objectState: ObjectState | null;
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
    switchSimplifyVisibility: (clientID: number | null) => void;
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
        shortcuts: { normalizedKeyMap, keyMap },
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
        keyMap,
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
        updateState(state: any): Promise<void> {
            return dispatch(updateAnnotationsAsync([state]));
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
        switchSimplifyVisibility(clientID: number | null): void {
            dispatch(switchSimplifyVisibilityAction(clientID));
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
    previewPoints: number[] | null;
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
            previewPoints: null,
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
        const {
            objectState, simplifyState, defaultApproxPolyAccuracy, allowSimplifyLifecycle = true,
        } = this.props;
        const { simplifyMode } = this.state;

        if (
            allowSimplifyLifecycle &&
            !simplifyMode &&
            simplifyState.objectState &&
            simplifyState.objectState.clientID === objectState.clientID &&
            (!prevProps.simplifyState.objectState ||
                prevProps.simplifyState.objectState.clientID !== objectState.clientID)
        ) {
            this.simplify();
        }

        // Update approxPolyAccuracy when default setting changes (but not during active simplification)
        if (!simplifyMode && prevProps.defaultApproxPolyAccuracy !== defaultApproxPolyAccuracy) {
            this.setState({
                approxPolyAccuracy: defaultApproxPolyAccuracy,
            });
        }
    }

    public componentWillUnmount(): void {
        const {
            objectState, jobInstance, switchSimplifyVisibility, updateState, allowSimplifyLifecycle = true,
        } = this.props;
        const { simplifyMode, originalPoints } = this.state;

        if (allowSimplifyLifecycle && simplifyMode) {
            if (originalPoints) {
                objectState.points = originalPoints;
                updateState(objectState);
            }
            jobInstance.actions.freeze(false);
            switchSimplifyVisibility(null);
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

    private simplify = async (): Promise<void> => {
        const {
            objectState, canvasInstance, activateObject, jobInstance,
        } = this.props;
        if ([ShapeType.POLYGON, ShapeType.POLYLINE].includes(objectState.shapeType)) {
            const originalPoints = objectState.points ? [...objectState.points] : [];

            activateObject(objectState.clientID as number, null);

            if (canvasInstance instanceof Canvas && canvasInstance.mode() !== CanvasMode.IDLE) {
                canvasInstance.cancel();
            }

            await jobInstance.actions.freeze(true);

            this.setState({
                simplifyMode: true,
                originalPoints,
            });
        }
    };

    private requestSimplification = (): void => {
        const { objectState, switchSimplifyVisibility } = this.props;
        switchSimplifyVisibility(objectState.clientID as number);
    };

    private applySimplification = async (simplifiedPoints: number[]): Promise<void> => {
        const {
            objectState, updateState, switchSimplifyVisibility, jobInstance,
        } = this.props;
        const { originalPoints } = this.state;

        try {
            // Initialize OpenCV if needed
            if (!openCVWrapper.isInitialized) {
                await openCVWrapper.initialize(() => {});
            }

            if (originalPoints) {
                objectState.points = [...originalPoints];
                await updateState(objectState);
            }

            jobInstance.actions.freeze(false);

            objectState.points = [...simplifiedPoints];
            await updateState(objectState);
            switchSimplifyVisibility(null);

            this.setState({ simplifyMode: false, previewPoints: null });
        } catch (error) {
            jobInstance.actions.freeze(false);
            switchSimplifyVisibility(null);
            this.setState({ simplifyMode: false, previewPoints: null });
            throw error;
        }
    };

    private cancelSimplification = async (): Promise<void> => {
        const {
            objectState, updateState, switchSimplifyVisibility, jobInstance,
        } = this.props;
        const { originalPoints } = this.state;

        if (originalPoints) {
            objectState.points = originalPoints;
            await updateState(objectState);
        }

        jobInstance.actions.freeze(false);
        switchSimplifyVisibility(null);
        this.setState({
            simplifyMode: false,
            originalPoints: null,
            previewPoints: null,
        });
    };

    private updateSimplificationPreview = async (points: number[]): Promise<void> => {
        const { objectState, updateState } = this.props;
        this.setState({ previewPoints: points });
        objectState.points = points;
        await updateState(objectState);
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
            keyMap,
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
                    simplify={this.requestSimplification}
                    resetCuboidPerspective={this.resetCuboidPerspective}
                    runAnnotationAction={this.runAnnotationAction}
                />
                {simplifyMode && (
                    <PolySimplifyControl
                        objectState={objectState}
                        approxPolyAccuracy={approxPolyAccuracy}
                        repeatDrawShapeShortcut={keyMap.SWITCH_DRAW_MODE_STANDARD_CONTROLS}
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
