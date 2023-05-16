// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import Slider from 'antd/lib/slider';
import Spin from 'antd/lib/spin';
import Dropdown from 'antd/lib/dropdown';
import { PlusCircleOutlined, UpOutlined } from '@ant-design/icons';

import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import {
    ColorBy, GridColor, ObjectType, ContextMenuType, Workspace, ShapeType, ActiveControl, CombinedState,
} from 'reducers';
import { LogType } from 'cvat-logger';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { getCore } from 'cvat-core-wrapper';
import config from 'config';
import CVATTooltip from 'components/common/cvat-tooltip';
import FrameTags from 'components/annotation-page/tag-annotation-workspace/frame-tags';
import {
    confirmCanvasReady,
    dragCanvas,
    zoomCanvas,
    resetCanvas,
    shapeDrawn,
    mergeObjects,
    groupObjects,
    splitTrack,
    editShape,
    updateAnnotationsAsync,
    createAnnotationsAsync,
    mergeAnnotationsAsync,
    groupAnnotationsAsync,
    splitAnnotationsAsync,
    activateObject,
    updateCanvasContextMenu,
    addZLayer,
    switchZLayer,
    fetchAnnotationsAsync,
    getDataFailed,
} from 'actions/annotation-actions';
import {
    switchGrid,
    changeGridColor,
    changeGridOpacity,
    changeBrightnessLevel,
    changeContrastLevel,
    changeSaturationLevel,
    switchAutomaticBordering,
} from 'actions/settings-actions';
import { reviewActions } from 'actions/review-actions';

import ImageSetupsContent from './image-setups-content';
import BrushTools from './brush-tools';

const cvat = getCore();
const MAX_DISTANCE_TO_OPEN_SHAPE = 50;

interface StateToProps {
    canvasInstance: Canvas | Canvas3d | null;
    jobInstance: any;
    activatedStateID: number | null;
    activatedElementID: number | null;
    activatedAttributeID: number | null;
    annotations: any[];
    frameData: any;
    frameAngle: number;
    canvasIsReady: boolean;
    frame: number;
    opacity: number;
    colorBy: ColorBy;
    selectedOpacity: number;
    outlined: boolean;
    outlineColor: string;
    showBitmap: boolean;
    showProjections: boolean;
    grid: boolean;
    gridSize: number;
    gridColor: GridColor;
    gridOpacity: number;
    activeLabelID: number;
    activeObjectType: ObjectType;
    brightnessLevel: number;
    contrastLevel: number;
    saturationLevel: number;
    resetZoom: boolean;
    smoothImage: boolean;
    aamZoomMargin: number;
    showObjectsTextAlways: boolean;
    textFontSize: number;
    controlPointsSize: number;
    textPosition: 'auto' | 'center';
    textContent: string;
    showAllInterpolationTracks: boolean;
    workspace: Workspace;
    minZLayer: number;
    maxZLayer: number;
    curZLayer: number;
    automaticBordering: boolean;
    intelligentPolygonCrop: boolean;
    switchableAutomaticBordering: boolean;
    keyMap: KeyMap;
    showTagsOnFrame: boolean;
}

interface DispatchToProps {
    onSetupCanvas(): void;
    onDragCanvas: (enabled: boolean) => void;
    onZoomCanvas: (enabled: boolean) => void;
    onResetCanvas: () => void;
    onShapeDrawn: () => void;
    onMergeObjects: (enabled: boolean) => void;
    onGroupObjects: (enabled: boolean) => void;
    onSplitTrack: (enabled: boolean) => void;
    onEditShape: (enabled: boolean) => void;
    onUpdateAnnotations(states: any[]): void;
    onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onMergeAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onSplitAnnotations(sessionInstance: any, frame: number, state: any): void;
    onActivateObject: (activatedStateID: number | null, activatedElementID: number | null) => void;
    onUpdateContextMenu(visible: boolean, left: number, top: number, type: ContextMenuType, pointID?: number): void;
    onAddZLayer(): void;
    onSwitchZLayer(cur: number): void;
    onChangeBrightnessLevel(level: number): void;
    onChangeContrastLevel(level: number): void;
    onChangeSaturationLevel(level: number): void;
    onChangeGridOpacity(opacity: number): void;
    onChangeGridColor(color: GridColor): void;
    onSwitchGrid(enabled: boolean): void;
    onSwitchAutomaticBordering(enabled: boolean): void;
    onFetchAnnotation(): void;
    onGetDataFailed(error: any): void;
    onStartIssue(position: number[]): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: { activeControl, instance: canvasInstance, ready: canvasIsReady },
            drawing: { activeLabelID, activeObjectType },
            job: { instance: jobInstance },
            player: {
                frame: { data: frameData, number: frame },
                frameAngles,
            },
            annotations: {
                states: annotations,
                activatedStateID,
                activatedElementID,
                activatedAttributeID,
                zLayer: { cur: curZLayer, min: minZLayer, max: maxZLayer },
            },
            workspace,
        },
        settings: {
            player: {
                grid,
                gridSize,
                gridColor,
                gridOpacity,
                brightnessLevel,
                contrastLevel,
                saturationLevel,
                resetZoom,
                smoothImage,
            },
            workspace: {
                aamZoomMargin,
                showObjectsTextAlways,
                showAllInterpolationTracks,
                showTagsOnFrame,
                automaticBordering,
                intelligentPolygonCrop,
                textFontSize,
                controlPointsSize,
                textPosition,
                textContent,
            },
            shapes: {
                opacity, colorBy, selectedOpacity, outlined, outlineColor, showBitmap, showProjections,
            },
        },
        shortcuts: { keyMap },
    } = state;

    return {
        canvasInstance,
        jobInstance,
        frameData,
        frameAngle: frameAngles[frame - jobInstance.startFrame],
        canvasIsReady,
        frame,
        activatedStateID,
        activatedElementID,
        activatedAttributeID,
        annotations,
        opacity: opacity / 100,
        colorBy,
        selectedOpacity: selectedOpacity / 100,
        outlined,
        outlineColor,
        showBitmap,
        showProjections,
        grid,
        gridSize,
        gridColor,
        gridOpacity: gridOpacity / 100,
        activeLabelID,
        activeObjectType,
        brightnessLevel: brightnessLevel / 100,
        contrastLevel: contrastLevel / 100,
        saturationLevel: saturationLevel / 100,
        resetZoom,
        smoothImage,
        aamZoomMargin,
        showObjectsTextAlways,
        textFontSize,
        controlPointsSize,
        textPosition,
        textContent,
        showAllInterpolationTracks,
        showTagsOnFrame,
        curZLayer,
        minZLayer,
        maxZLayer,
        automaticBordering,
        intelligentPolygonCrop,
        workspace,
        keyMap,
        switchableAutomaticBordering:
            activeControl === ActiveControl.DRAW_POLYGON ||
            activeControl === ActiveControl.DRAW_POLYLINE ||
            activeControl === ActiveControl.DRAW_MASK ||
            activeControl === ActiveControl.EDIT,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onSetupCanvas(): void {
            dispatch(confirmCanvasReady());
        },
        onDragCanvas(enabled: boolean): void {
            dispatch(dragCanvas(enabled));
        },
        onZoomCanvas(enabled: boolean): void {
            dispatch(zoomCanvas(enabled));
        },
        onResetCanvas(): void {
            dispatch(resetCanvas());
        },
        onShapeDrawn(): void {
            dispatch(shapeDrawn());
        },
        onMergeObjects(enabled: boolean): void {
            dispatch(mergeObjects(enabled));
        },
        onGroupObjects(enabled: boolean): void {
            dispatch(groupObjects(enabled));
        },
        onSplitTrack(enabled: boolean): void {
            dispatch(splitTrack(enabled));
        },
        onEditShape(enabled: boolean): void {
            dispatch(editShape(enabled));
        },
        onUpdateAnnotations(states: any[]): void {
            dispatch(updateAnnotationsAsync(states));
        },
        onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(createAnnotationsAsync(sessionInstance, frame, states));
        },
        onMergeAnnotations(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(mergeAnnotationsAsync(sessionInstance, frame, states));
        },
        onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(groupAnnotationsAsync(sessionInstance, frame, states));
        },
        onSplitAnnotations(sessionInstance: any, frame: number, state: any): void {
            dispatch(splitAnnotationsAsync(sessionInstance, frame, state));
        },
        onActivateObject(activatedStateID: number | null, activatedElementID: number | null = null): void {
            if (activatedStateID === null) {
                dispatch(updateCanvasContextMenu(false, 0, 0));
            }

            dispatch(activateObject(activatedStateID, activatedElementID, null));
        },
        onUpdateContextMenu(
            visible: boolean,
            left: number,
            top: number,
            type: ContextMenuType,
            pointID?: number,
        ): void {
            dispatch(updateCanvasContextMenu(visible, left, top, pointID, type));
        },
        onAddZLayer(): void {
            dispatch(addZLayer());
        },
        onSwitchZLayer(cur: number): void {
            dispatch(switchZLayer(cur));
        },
        onChangeBrightnessLevel(level: number): void {
            dispatch(changeBrightnessLevel(level));
        },
        onChangeContrastLevel(level: number): void {
            dispatch(changeContrastLevel(level));
        },
        onChangeSaturationLevel(level: number): void {
            dispatch(changeSaturationLevel(level));
        },
        onChangeGridOpacity(opacity: number): void {
            dispatch(changeGridOpacity(opacity));
        },
        onChangeGridColor(color: GridColor): void {
            dispatch(changeGridColor(color));
        },
        onSwitchGrid(enabled: boolean): void {
            dispatch(switchGrid(enabled));
        },
        onSwitchAutomaticBordering(enabled: boolean): void {
            dispatch(switchAutomaticBordering(enabled));
        },
        onFetchAnnotation(): void {
            dispatch(fetchAnnotationsAsync());
        },
        onGetDataFailed(error: any): void {
            dispatch(getDataFailed(error));
        },
        onStartIssue(position: number[]): void {
            dispatch(reviewActions.startIssue(position));
        },
    };
}

type Props = StateToProps & DispatchToProps;

class CanvasWrapperComponent extends React.PureComponent<Props> {
    public componentDidMount(): void {
        const {
            automaticBordering,
            intelligentPolygonCrop,
            showObjectsTextAlways,
            workspace,
            showProjections,
            selectedOpacity,
            opacity,
            smoothImage,
            textFontSize,
            controlPointsSize,
            textPosition,
            textContent,
            colorBy,
            outlined,
            outlineColor,
            resetZoom,
        } = this.props;
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        // It's awful approach from the point of view React
        // But we do not have another way because cvat-canvas returns regular DOM element
        const [wrapper] = window.document.getElementsByClassName('cvat-canvas-container');
        wrapper.appendChild(canvasInstance.html());

        canvasInstance.configure({
            forceDisableEditing: workspace === Workspace.REVIEW_WORKSPACE,
            undefinedAttrValue: config.UNDEFINED_ATTRIBUTE_VALUE,
            displayAllText: showObjectsTextAlways,
            autoborders: automaticBordering,
            showProjections,
            intelligentPolygonCrop,
            selectedShapeOpacity: selectedOpacity,
            controlPointsSize,
            shapeOpacity: opacity,
            smoothImage,
            colorBy,
            outlinedBorders: outlined ? outlineColor || 'black' : false,
            textFontSize,
            textPosition,
            textContent,
            resetZoom,
        });

        this.initialSetup();
        this.updateCanvas();
    }

    public componentDidUpdate(prevProps: Props): void {
        const {
            opacity,
            selectedOpacity,
            outlined,
            outlineColor,
            showBitmap,
            frameData,
            frameAngle,
            annotations,
            activatedStateID,
            curZLayer,
            resetZoom,
            smoothImage,
            grid,
            gridSize,
            gridOpacity,
            gridColor,
            brightnessLevel,
            contrastLevel,
            saturationLevel,
            workspace,
            showObjectsTextAlways,
            textFontSize,
            controlPointsSize,
            textPosition,
            textContent,
            showAllInterpolationTracks,
            automaticBordering,
            intelligentPolygonCrop,
            showProjections,
            colorBy,
            onFetchAnnotation,
        } = this.props;
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        if (
            prevProps.showObjectsTextAlways !== showObjectsTextAlways ||
            prevProps.automaticBordering !== automaticBordering ||
            prevProps.showProjections !== showProjections ||
            prevProps.intelligentPolygonCrop !== intelligentPolygonCrop ||
            prevProps.opacity !== opacity ||
            prevProps.selectedOpacity !== selectedOpacity ||
            prevProps.smoothImage !== smoothImage ||
            prevProps.textFontSize !== textFontSize ||
            prevProps.controlPointsSize !== controlPointsSize ||
            prevProps.textPosition !== textPosition ||
            prevProps.textContent !== textContent ||
            prevProps.colorBy !== colorBy ||
            prevProps.outlineColor !== outlineColor ||
            prevProps.outlined !== outlined ||
            prevProps.resetZoom !== resetZoom
        ) {
            canvasInstance.configure({
                undefinedAttrValue: config.UNDEFINED_ATTRIBUTE_VALUE,
                displayAllText: showObjectsTextAlways,
                autoborders: automaticBordering,
                showProjections,
                intelligentPolygonCrop,
                selectedShapeOpacity: selectedOpacity,
                shapeOpacity: opacity,
                smoothImage,
                colorBy,
                outlinedBorders: outlined ? outlineColor || 'black' : false,
                textFontSize,
                controlPointsSize,
                textPosition,
                textContent,
                resetZoom,
            });
        }

        if (prevProps.showAllInterpolationTracks !== showAllInterpolationTracks) {
            onFetchAnnotation();
        }

        if (prevProps.activatedStateID !== null && prevProps.activatedStateID !== activatedStateID) {
            canvasInstance.activate(null);
        }

        if (gridSize !== prevProps.gridSize) {
            canvasInstance.grid(gridSize, gridSize);
        }

        if (gridOpacity !== prevProps.gridOpacity || gridColor !== prevProps.gridColor || grid !== prevProps.grid) {
            const gridElement = window.document.getElementById('cvat_canvas_grid');
            const gridPattern = window.document.getElementById('cvat_canvas_grid_pattern');
            if (gridElement) {
                gridElement.style.display = grid ? 'block' : 'none';
            }
            if (gridPattern) {
                gridPattern.style.stroke = gridColor.toLowerCase();
                gridPattern.style.opacity = `${gridOpacity}`;
            }
        }

        if (
            brightnessLevel !== prevProps.brightnessLevel ||
            contrastLevel !== prevProps.contrastLevel ||
            saturationLevel !== prevProps.saturationLevel
        ) {
            canvasInstance.configure({
                CSSImageFilter:
                    `brightness(${brightnessLevel}) contrast(${contrastLevel}) saturate(${saturationLevel})`,
            });
        }

        if (
            prevProps.annotations !== annotations ||
            prevProps.frameData !== frameData ||
            prevProps.curZLayer !== curZLayer
        ) {
            this.updateCanvas();
        }

        if (prevProps.showBitmap !== showBitmap) {
            canvasInstance.bitmap(showBitmap);
        }

        if (prevProps.frameAngle !== frameAngle) {
            canvasInstance.rotate(frameAngle);
            if (prevProps.frameData === frameData) {
                // explicitly rotated, not a new frame
                canvasInstance.fit();
            }
        }

        if (prevProps.workspace !== workspace) {
            if (workspace === Workspace.REVIEW_WORKSPACE) {
                canvasInstance.configure({
                    forceDisableEditing: true,
                });
            } else if (prevProps.workspace === Workspace.REVIEW_WORKSPACE) {
                canvasInstance.configure({
                    forceDisableEditing: false,
                });
            }
        }

        this.activateOnCanvas();
    }

    public componentWillUnmount(): void {
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        canvasInstance.html().removeEventListener('mousedown', this.onCanvasMouseDown);
        canvasInstance.html().removeEventListener('click', this.onCanvasClicked);
        canvasInstance.html().removeEventListener('canvas.editstart', this.onCanvasEditStart);
        canvasInstance.html().removeEventListener('canvas.edited', this.onCanvasEditDone);
        canvasInstance.html().removeEventListener('canvas.dragstart', this.onCanvasDragStart);
        canvasInstance.html().removeEventListener('canvas.dragstop', this.onCanvasDragDone);
        canvasInstance.html().removeEventListener('canvas.zoomstart', this.onCanvasZoomStart);
        canvasInstance.html().removeEventListener('canvas.zoomstop', this.onCanvasZoomDone);

        canvasInstance.html().removeEventListener('canvas.setup', this.onCanvasSetup);
        canvasInstance.html().removeEventListener('canvas.canceled', this.onCanvasCancel);
        canvasInstance.html().removeEventListener('canvas.find', this.onCanvasFindObject);
        canvasInstance.html().removeEventListener('canvas.deactivated', this.onCanvasShapeDeactivated);
        canvasInstance.html().removeEventListener('canvas.moved', this.onCanvasCursorMoved);

        canvasInstance.html().removeEventListener('canvas.zoom', this.onCanvasZoomChanged);
        canvasInstance.html().removeEventListener('canvas.fit', this.onCanvasImageFitted);
        canvasInstance.html().removeEventListener('canvas.dragshape', this.onCanvasShapeDragged);
        canvasInstance.html().removeEventListener('canvas.resizeshape', this.onCanvasShapeResized);
        canvasInstance.html().removeEventListener('canvas.clicked', this.onCanvasShapeClicked);
        canvasInstance.html().removeEventListener('canvas.drawn', this.onCanvasShapeDrawn);
        canvasInstance.html().removeEventListener('canvas.merged', this.onCanvasObjectsMerged);
        canvasInstance.html().removeEventListener('canvas.groupped', this.onCanvasObjectsGroupped);
        canvasInstance.html().removeEventListener('canvas.regionselected', this.onCanvasPositionSelected);
        canvasInstance.html().removeEventListener('canvas.splitted', this.onCanvasTrackSplitted);

        canvasInstance.html().removeEventListener('canvas.error', this.onCanvasErrorOccurrence);
    }

    private onCanvasErrorOccurrence = (event: any): void => {
        const { exception } = event.detail;
        const { onGetDataFailed } = this.props;
        onGetDataFailed(exception);
    };

    private onCanvasShapeDrawn = (event: any): void => {
        const {
            jobInstance, activeLabelID, activeObjectType, frame, onShapeDrawn, onCreateAnnotations,
        } = this.props;

        if (!event.detail.continue) {
            onShapeDrawn();
        }

        const { state, duration } = event.detail;
        const isDrawnFromScratch = !state.label;

        state.objectType = state.objectType || activeObjectType;
        state.label = state.label || jobInstance.labels.filter((label: any) => label.id === activeLabelID)[0];
        state.frame = frame;
        state.rotation = state.rotation || 0;
        state.occluded = state.occluded || false;
        state.outside = state.outside || false;
        if (state.shapeType === ShapeType.SKELETON && Array.isArray(state.elements)) {
            state.elements.forEach((element: Record<string, any>) => {
                element.objectType = state.objectType;
                element.label = element.label || state.label.structure
                    .sublabels.find((label: any) => label.id === element.labelID);
                element.frame = state.frame;
                element.rotation = 0;
                element.occluded = element.occluded || false;
                element.outside = element.outside || false;
            });
        }

        const payload = {
            object_type: state.objectType,
            label: state.label.name,
            frame: state.frame,
            rotation: state.rotation,
            occluded: state.occluded,
            outside: state.outside,
            shape_type: state.shapeType,
        };

        if (isDrawnFromScratch) {
            jobInstance.logger.log(LogType.drawObject, { count: 1, duration, ...payload });
        } else {
            jobInstance.logger.log(LogType.pasteObject, { count: 1, duration, ...payload });
        }

        const objectState = new cvat.classes.ObjectState(state);
        onCreateAnnotations(jobInstance, frame, [objectState]);
    };

    private onCanvasObjectsMerged = (event: any): void => {
        const {
            jobInstance, frame, onMergeAnnotations, onMergeObjects,
        } = this.props;

        onMergeObjects(false);

        const { states, duration } = event.detail;
        jobInstance.logger.log(LogType.mergeObjects, {
            duration,
            count: states.length,
        });
        onMergeAnnotations(jobInstance, frame, states);
    };

    private onCanvasObjectsGroupped = (event: any): void => {
        const {
            jobInstance, frame, onGroupAnnotations, onGroupObjects,
        } = this.props;

        onGroupObjects(false);

        const { states } = event.detail;
        onGroupAnnotations(jobInstance, frame, states);
    };

    private onCanvasPositionSelected = (event: any): void => {
        const { onResetCanvas, onStartIssue } = this.props;
        const { points } = event.detail;
        onStartIssue(points);
        onResetCanvas();
    };

    private onCanvasTrackSplitted = (event: any): void => {
        const {
            jobInstance, frame, onSplitAnnotations, onSplitTrack,
        } = this.props;

        onSplitTrack(false);

        const { state } = event.detail;
        onSplitAnnotations(jobInstance, frame, state);
    };

    private onCanvasMouseDown = (e: MouseEvent): void => {
        const { workspace, activatedStateID, onActivateObject } = this.props;

        if ((e.target as HTMLElement).tagName === 'svg' && e.button !== 2) {
            if (activatedStateID !== null && workspace !== Workspace.ATTRIBUTE_ANNOTATION) {
                onActivateObject(null, null);
            }
        }
    };

    private onCanvasClicked = (): void => {
        const { canvasInstance } = this.props as { canvasInstance: Canvas };
        if (!canvasInstance.html().contains(document.activeElement) && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    private onCanvasShapeDragged = (e: any): void => {
        const { jobInstance } = this.props;
        const { id } = e.detail;
        jobInstance.logger.log(LogType.dragObject, { id });
    };

    private onCanvasShapeResized = (e: any): void => {
        const { jobInstance } = this.props;
        const { id } = e.detail;
        jobInstance.logger.log(LogType.resizeObject, { id });
    };

    private onCanvasImageFitted = (): void => {
        const { jobInstance } = this.props;
        jobInstance.logger.log(LogType.fitImage);
    };

    private onCanvasZoomChanged = (): void => {
        const { jobInstance } = this.props;
        jobInstance.logger.log(LogType.zoomImage);
    };

    private onCanvasShapeClicked = (e: any): void => {
        const { clientID, parentID } = e.detail.state;
        let sidebarItem = null;
        if (Number.isInteger(parentID)) {
            sidebarItem = window.document.getElementById(`cvat-objects-sidebar-state-item-element-${clientID}`);
        } else {
            sidebarItem = window.document.getElementById(`cvat-objects-sidebar-state-item-${clientID}`);
        }

        if (sidebarItem) {
            sidebarItem.scrollIntoView();
        }
    };

    private onCanvasShapeDeactivated = (e: any): void => {
        const { onActivateObject, activatedStateID } = this.props;
        const { state } = e.detail;

        // when we activate element, canvas deactivates the previous
        // and triggers this event
        // in this case we do not need to update our state
        if (state.clientID === activatedStateID) {
            onActivateObject(null, null);
        }
    };

    private onCanvasCursorMoved = async (event: any): Promise<void> => {
        const {
            jobInstance, activatedStateID, activatedElementID, workspace, onActivateObject,
        } = this.props;

        if (![Workspace.STANDARD, Workspace.REVIEW_WORKSPACE].includes(workspace)) {
            return;
        }

        const result = await jobInstance.annotations.select(event.detail.states, event.detail.x, event.detail.y);

        if (result && result.state) {
            if (['polyline', 'points'].includes(result.state.shapeType)) {
                if (result.distance > MAX_DISTANCE_TO_OPEN_SHAPE) {
                    return;
                }
            }

            const newActivatedElement = event.detail.activatedElementID || null;
            if (activatedStateID !== result.state.clientID || activatedElementID !== newActivatedElement) {
                onActivateObject(result.state.clientID, event.detail.activatedElementID || null);
            }
        }
    };

    private onCanvasEditStart = (): void => {
        const { onActivateObject, onEditShape } = this.props;
        onActivateObject(null, null);
        onEditShape(true);
    };

    private onCanvasEditDone = (event: any): void => {
        const { onEditShape, onUpdateAnnotations } = this.props;

        onEditShape(false);

        const { state, points, rotation } = event.detail;
        state.points = points;
        state.rotation = rotation;
        onUpdateAnnotations([state]);
    };

    private onCanvasDragStart = (): void => {
        const { onDragCanvas } = this.props;
        onDragCanvas(true);
    };

    private onCanvasDragDone = (): void => {
        const { onDragCanvas } = this.props;
        onDragCanvas(false);
    };

    private onCanvasZoomStart = (): void => {
        const { onZoomCanvas } = this.props;
        onZoomCanvas(true);
    };

    private onCanvasZoomDone = (): void => {
        const { onZoomCanvas } = this.props;
        onZoomCanvas(false);
    };

    private onCanvasSetup = (): void => {
        const { onSetupCanvas } = this.props;
        onSetupCanvas();
        this.activateOnCanvas();
    };

    private onCanvasCancel = (): void => {
        const { onResetCanvas } = this.props;
        onResetCanvas();
    };

    private onCanvasFindObject = async (e: any): Promise<void> => {
        const { jobInstance } = this.props;
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        const result = await jobInstance.annotations.select(e.detail.states, e.detail.x, e.detail.y);

        if (result && result.state) {
            if (['polyline', 'points'].includes(result.state.shapeType)) {
                if (result.distance > MAX_DISTANCE_TO_OPEN_SHAPE) {
                    return;
                }
            }

            canvasInstance.select(result.state);
        }
    };

    private onCanvasPointContextMenu = (e: any): void => {
        const { activatedStateID, onUpdateContextMenu, annotations } = this.props;

        const [state] = annotations.filter((el: any) => el.clientID === activatedStateID);
        if (![ShapeType.CUBOID, ShapeType.RECTANGLE, ShapeType.ELLIPSE, ShapeType.SKELETON].includes(state.shapeType)) {
            onUpdateContextMenu(
                activatedStateID !== null,
                e.detail.mouseEvent.clientX,
                e.detail.mouseEvent.clientY,
                ContextMenuType.CANVAS_SHAPE_POINT,
                e.detail.pointID,
            );
        }
    };

    private activateOnCanvas(): void {
        const {
            activatedStateID,
            activatedAttributeID,
            aamZoomMargin,
            workspace,
            annotations,
        } = this.props;
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        if (activatedStateID !== null) {
            const [activatedState] = annotations.filter((state: any): boolean => state.clientID === activatedStateID);
            if (workspace === Workspace.ATTRIBUTE_ANNOTATION) {
                if (activatedState.objectType !== ObjectType.TAG) {
                    canvasInstance.focus(activatedStateID, aamZoomMargin);
                } else {
                    canvasInstance.fit();
                }
            }
            if (activatedState && activatedState.objectType !== ObjectType.TAG) {
                canvasInstance.activate(activatedStateID, activatedAttributeID);
            }
        } else if (workspace === Workspace.ATTRIBUTE_ANNOTATION) {
            canvasInstance.fit();
        }
    }

    private updateCanvas(): void {
        const {
            curZLayer, annotations, frameData, canvasInstance,
        } = this.props;

        if (frameData !== null && canvasInstance) {
            canvasInstance.setup(
                frameData,
                frameData.deleted ? [] : annotations.filter((e) => e.objectType !== ObjectType.TAG),
                curZLayer,
            );
        }
    }

    private initialSetup(): void {
        const {
            grid,
            gridSize,
            gridColor,
            gridOpacity,
            brightnessLevel,
            contrastLevel,
            saturationLevel,
        } = this.props;
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        // Grid
        const gridElement = window.document.getElementById('cvat_canvas_grid');
        const gridPattern = window.document.getElementById('cvat_canvas_grid_pattern');
        if (gridElement) {
            gridElement.style.display = grid ? 'block' : 'none';
        }
        if (gridPattern) {
            gridPattern.style.stroke = gridColor.toLowerCase();
            gridPattern.style.opacity = `${gridOpacity}`;
        }
        canvasInstance.grid(gridSize, gridSize);

        canvasInstance.configure({
            CSSImageFilter:
                `brightness(${brightnessLevel}) contrast(${contrastLevel}) saturate(${saturationLevel})`,
        });

        canvasInstance.fitCanvas();
        canvasInstance.html().addEventListener(
            'canvas.setup',
            () => {
                const { activatedStateID, activatedAttributeID } = this.props;
                canvasInstance.activate(activatedStateID, activatedAttributeID);
            },
            { once: true },
        );

        canvasInstance.html().addEventListener('mousedown', this.onCanvasMouseDown);
        canvasInstance.html().addEventListener('click', this.onCanvasClicked);
        canvasInstance.html().addEventListener('canvas.editstart', this.onCanvasEditStart);
        canvasInstance.html().addEventListener('canvas.edited', this.onCanvasEditDone);
        canvasInstance.html().addEventListener('canvas.dragstart', this.onCanvasDragStart);
        canvasInstance.html().addEventListener('canvas.dragstop', this.onCanvasDragDone);
        canvasInstance.html().addEventListener('canvas.zoomstart', this.onCanvasZoomStart);
        canvasInstance.html().addEventListener('canvas.zoomstop', this.onCanvasZoomDone);

        canvasInstance.html().addEventListener('canvas.setup', this.onCanvasSetup);
        canvasInstance.html().addEventListener('canvas.canceled', this.onCanvasCancel);
        canvasInstance.html().addEventListener('canvas.find', this.onCanvasFindObject);
        canvasInstance.html().addEventListener('canvas.deactivated', this.onCanvasShapeDeactivated);
        canvasInstance.html().addEventListener('canvas.moved', this.onCanvasCursorMoved);

        canvasInstance.html().addEventListener('canvas.zoom', this.onCanvasZoomChanged);
        canvasInstance.html().addEventListener('canvas.fit', this.onCanvasImageFitted);
        canvasInstance.html().addEventListener('canvas.dragshape', this.onCanvasShapeDragged);
        canvasInstance.html().addEventListener('canvas.resizeshape', this.onCanvasShapeResized);
        canvasInstance.html().addEventListener('canvas.clicked', this.onCanvasShapeClicked);
        canvasInstance.html().addEventListener('canvas.drawn', this.onCanvasShapeDrawn);
        canvasInstance.html().addEventListener('canvas.merged', this.onCanvasObjectsMerged);
        canvasInstance.html().addEventListener('canvas.groupped', this.onCanvasObjectsGroupped);
        canvasInstance.html().addEventListener('canvas.regionselected', this.onCanvasPositionSelected);
        canvasInstance.html().addEventListener('canvas.splitted', this.onCanvasTrackSplitted);

        canvasInstance.html().addEventListener('canvas.error', this.onCanvasErrorOccurrence);
    }

    public render(): JSX.Element {
        const {
            maxZLayer,
            curZLayer,
            minZLayer,
            keyMap,
            switchableAutomaticBordering,
            automaticBordering,
            showTagsOnFrame,
            canvasIsReady,
            onSwitchAutomaticBordering,
            onSwitchZLayer,
            onAddZLayer,
        } = this.props;

        const preventDefault = (event: KeyboardEvent | undefined): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const subKeyMap = {
            SWITCH_AUTOMATIC_BORDERING: keyMap.SWITCH_AUTOMATIC_BORDERING,
        };

        const handlers = {
            SWITCH_AUTOMATIC_BORDERING: (event: KeyboardEvent | undefined) => {
                if (switchableAutomaticBordering) {
                    preventDefault(event);
                    onSwitchAutomaticBordering(!automaticBordering);
                }
            },
        };

        return (
            <>
                <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />
                {/*
                    This element doesn't have any props
                    So, React isn't going to rerender it
                    And it's a reason why cvat-canvas appended in mount function works
                */}
                {
                    !canvasIsReady && (
                        <div className='cvat-spinner-container'>
                            <Spin className='cvat-spinner' />
                        </div>
                    )
                }
                <div
                    className='cvat-canvas-container'
                    style={{
                        overflow: 'hidden',
                        width: '100%',
                        height: '100%',
                    }}
                />

                <BrushTools />

                <Dropdown trigger={['click']} placement='topCenter' overlay={<ImageSetupsContent />}>
                    <UpOutlined className='cvat-canvas-image-setups-trigger' />
                </Dropdown>

                <div className='cvat-canvas-z-axis-wrapper'>
                    <Slider
                        disabled={minZLayer === maxZLayer}
                        min={minZLayer}
                        max={maxZLayer}
                        value={curZLayer}
                        vertical
                        reverse
                        defaultValue={0}
                        onChange={(value: number): void => onSwitchZLayer(value as number)}
                    />
                    <CVATTooltip title={`Add new layer ${maxZLayer + 1} and switch to it`}>
                        <PlusCircleOutlined onClick={onAddZLayer} />
                    </CVATTooltip>
                </div>

                {showTagsOnFrame ? (
                    <div className='cvat-canvas-frame-tags'>
                        <FrameTags />
                    </div>
                ) : null}
            </>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(CanvasWrapperComponent);
