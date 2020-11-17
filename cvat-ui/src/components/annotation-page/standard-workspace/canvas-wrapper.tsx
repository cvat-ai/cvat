// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { GlobalHotKeys, ExtendedKeyMapOptions } from 'react-hotkeys';

import Tooltip from 'antd/lib/tooltip';
import Icon from 'antd/lib/icon';
import Layout from 'antd/lib/layout/layout';
import Slider, { SliderValue } from 'antd/lib/slider';

import {
    ColorBy, GridColor, ObjectType, ContextMenuType, Workspace, ShapeType,
} from 'reducers/interfaces';
import { LogType } from 'cvat-logger';
import { Canvas } from 'cvat-canvas-wrapper';
import getCore from 'cvat-core-wrapper';
import consts from 'consts';

const cvat = getCore();

const MAX_DISTANCE_TO_OPEN_SHAPE = 50;

interface Props {
    sidebarCollapsed: boolean;
    canvasInstance: Canvas;
    jobInstance: any;
    activatedStateID: number | null;
    activatedAttributeID: number | null;
    selectedStatesID: number[];
    annotations: any[];
    frameData: any;
    frameAngle: number;
    frameFetching: boolean;
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
    curZLayer: number;
    minZLayer: number;
    maxZLayer: number;
    brightnessLevel: number;
    contrastLevel: number;
    saturationLevel: number;
    resetZoom: boolean;
    aamZoomMargin: number;
    showObjectsTextAlways: boolean;
    showAllInterpolationTracks: boolean;
    workspace: Workspace;
    automaticBordering: boolean;
    keyMap: Record<string, ExtendedKeyMapOptions>;
    canvasBackgroundColor: string;
    switchableAutomaticBordering: boolean;
    onSetupCanvas: () => void;
    onDragCanvas: (enabled: boolean) => void;
    onZoomCanvas: (enabled: boolean) => void;
    onMergeObjects: (enabled: boolean) => void;
    onGroupObjects: (enabled: boolean) => void;
    onSplitTrack: (enabled: boolean) => void;
    onEditShape: (enabled: boolean) => void;
    onShapeDrawn: () => void;
    onResetCanvas: () => void;
    onUpdateAnnotations(states: any[]): void;
    onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onMergeAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onSplitAnnotations(sessionInstance: any, frame: number, state: any): void;
    onActivateObject(activatedStateID: number | null): void;
    onSelectObjects(selectedStatesID: number[]): void;
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
}

export default class CanvasWrapperComponent extends React.PureComponent<Props> {
    public componentDidMount(): void {
        const { automaticBordering, showObjectsTextAlways, canvasInstance } = this.props;

        // It's awful approach from the point of view React
        // But we do not have another way because cvat-canvas returns regular DOM element
        const [wrapper] = window.document.getElementsByClassName('cvat-canvas-container');
        wrapper.appendChild(canvasInstance.html());

        canvasInstance.configure({
            autoborders: automaticBordering,
            undefinedAttrValue: consts.UNDEFINED_ATTRIBUTE_VALUE,
            displayAllText: showObjectsTextAlways,
        });

        this.initialSetup();
        this.updateCanvas();
    }

    public componentDidUpdate(prevProps: Props): void {
        const {
            opacity,
            colorBy,
            selectedOpacity,
            outlined,
            outlineColor,
            showBitmap,
            frameData,
            frameAngle,
            annotations,
            canvasInstance,
            sidebarCollapsed,
            activatedStateID,
            curZLayer,
            resetZoom,
            grid,
            gridSize,
            gridOpacity,
            gridColor,
            brightnessLevel,
            contrastLevel,
            saturationLevel,
            workspace,
            frameFetching,
            showObjectsTextAlways,
            showAllInterpolationTracks,
            automaticBordering,
            showProjections,
            canvasBackgroundColor,
            onFetchAnnotation,
        } = this.props;

        if (
            prevProps.showObjectsTextAlways !== showObjectsTextAlways ||
            prevProps.automaticBordering !== automaticBordering ||
            prevProps.showProjections !== showProjections
        ) {
            canvasInstance.configure({
                undefinedAttrValue: consts.UNDEFINED_ATTRIBUTE_VALUE,
                displayAllText: showObjectsTextAlways,
                autoborders: automaticBordering,
                showProjections,
            });
        }

        if (prevProps.showAllInterpolationTracks !== showAllInterpolationTracks) {
            onFetchAnnotation();
        }

        if (prevProps.sidebarCollapsed !== sidebarCollapsed) {
            const [sidebar] = window.document.getElementsByClassName('cvat-objects-sidebar');
            if (sidebar) {
                sidebar.addEventListener(
                    'transitionend',
                    () => {
                        canvasInstance.fitCanvas();
                    },
                    { once: true },
                );
            }
        }

        if (prevProps.activatedStateID !== null && prevProps.activatedStateID !== activatedStateID) {
            canvasInstance.activate(null);
            const el = window.document.getElementById(`cvat_canvas_shape_${prevProps.activatedStateID}`);
            if (el) {
                (el as any).instance.fill({ opacity: opacity / 100 });
            }
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
                gridPattern.style.opacity = `${gridOpacity / 100}`;
            }
        }

        if (
            brightnessLevel !== prevProps.brightnessLevel ||
            contrastLevel !== prevProps.contrastLevel ||
            saturationLevel !== prevProps.saturationLevel
        ) {
            const backgroundElement = window.document.getElementById('cvat_canvas_background');
            if (backgroundElement) {
                backgroundElement.style.filter =
                    `brightness(${brightnessLevel / 100})` +
                    `contrast(${contrastLevel / 100})` +
                    `saturate(${saturationLevel / 100})`;
            }
        }

        if (
            prevProps.annotations !== annotations ||
            prevProps.frameData !== frameData ||
            prevProps.curZLayer !== curZLayer
        ) {
            this.updateCanvas();
        }

        if (prevProps.frame !== frameData.number && resetZoom && workspace !== Workspace.ATTRIBUTE_ANNOTATION) {
            canvasInstance.html().addEventListener(
                'canvas.setup',
                () => {
                    canvasInstance.fit();
                },
                { once: true },
            );
        }

        if (
            prevProps.opacity !== opacity ||
            prevProps.outlined !== outlined ||
            prevProps.outlineColor !== outlineColor ||
            prevProps.selectedOpacity !== selectedOpacity ||
            prevProps.colorBy !== colorBy
        ) {
            this.updateShapesView();
        }

        if (prevProps.showBitmap !== showBitmap) {
            canvasInstance.bitmap(showBitmap);
        }

        if (prevProps.frameAngle !== frameAngle) {
            canvasInstance.rotate(frameAngle);
        }

        const loadingAnimation = window.document.getElementById('cvat_canvas_loading_animation');
        if (loadingAnimation && frameFetching !== prevProps.frameFetching) {
            if (frameFetching) {
                loadingAnimation.classList.remove('cvat_canvas_hidden');
            } else {
                loadingAnimation.classList.add('cvat_canvas_hidden');
            }
        }

        if (prevProps.canvasBackgroundColor !== canvasBackgroundColor) {
            const canvasWrapperElement = window.document
                .getElementsByClassName('cvat-canvas-container')
                .item(0) as HTMLElement | null;
            if (canvasWrapperElement) {
                canvasWrapperElement.style.backgroundColor = canvasBackgroundColor;
            }
        }

        this.activateOnCanvas();
    }

    public componentWillUnmount(): void {
        const { canvasInstance } = this.props;

        canvasInstance.html().removeEventListener('mousedown', this.onCanvasMouseDown);
        canvasInstance.html().removeEventListener('click', this.onCanvasClicked);
        canvasInstance.html().removeEventListener('contextmenu', this.onCanvasContextMenu);
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
        canvasInstance.html().removeEventListener('canvas.splitted', this.onCanvasTrackSplitted);

        canvasInstance.html().removeEventListener('canvas.contextmenu', this.onCanvasPointContextMenu);

        window.removeEventListener('resize', this.fitCanvas);
    }

    private onCanvasShapeDrawn = (event: any): void => {
        const {
            jobInstance, activeLabelID, activeObjectType, frame, onShapeDrawn, onCreateAnnotations,
        } = this.props;

        if (!event.detail.continue) {
            onShapeDrawn();
        }

        const { state, duration } = event.detail;
        const isDrawnFromScratch = !state.label;
        if (isDrawnFromScratch) {
            jobInstance.logger.log(LogType.drawObject, { count: 1, duration });
        } else {
            jobInstance.logger.log(LogType.pasteObject, { count: 1, duration });
        }

        state.objectType = state.objectType || activeObjectType;
        state.label = state.label || jobInstance.task.labels.filter((label: any) => label.id === activeLabelID)[0];
        state.occluded = state.occluded || false;
        state.frame = frame;
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

    private onCanvasTrackSplitted = (event: any): void => {
        const {
            jobInstance, frame, onSplitAnnotations, onSplitTrack,
        } = this.props;

        onSplitTrack(false);

        const { state } = event.detail;
        onSplitAnnotations(jobInstance, frame, state);
    };

    private fitCanvas = (): void => {
        const { canvasInstance } = this.props;
        canvasInstance.fitCanvas();
    };

    private onCanvasMouseDown = (e: MouseEvent): void => {
        const { workspace, activatedStateID, onActivateObject } = this.props;

        if ((e.target as HTMLElement).tagName === 'svg') {
            if (activatedStateID !== null && workspace !== Workspace.ATTRIBUTE_ANNOTATION) {
                onActivateObject(null);
            }
        }
    };

    private onCanvasClicked = (): void => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    private onCanvasContextMenu = (e: MouseEvent): void => {
        const { activatedStateID, onUpdateContextMenu } = this.props;

        if (e.target && !(e.target as HTMLElement).classList.contains('svg_select_points')) {
            onUpdateContextMenu(activatedStateID !== null, e.clientX, e.clientY, ContextMenuType.CANVAS_SHAPE);
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
        const { clientID } = e.detail.state;
        const sidebarItem = window.document.getElementById(`cvat-objects-sidebar-state-item-${clientID}`);
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
            onActivateObject(null);
        }
    };

    private onCanvasCursorMoved = async (event: any): Promise<void> => {
        const {
            jobInstance, activatedStateID, workspace, onActivateObject,
        } = this.props;

        if (workspace !== Workspace.STANDARD) {
            return;
        }

        const result = await jobInstance.annotations.select(event.detail.states, event.detail.x, event.detail.y);

        if (result && result.state) {
            if (result.state.shapeType === 'polyline' || result.state.shapeType === 'points') {
                if (result.distance > MAX_DISTANCE_TO_OPEN_SHAPE) {
                    return;
                }
            }

            if (activatedStateID !== result.state.clientID) {
                onActivateObject(result.state.clientID);
            }
        }
    };

    private onCanvasEditStart = (): void => {
        const { onActivateObject, onEditShape } = this.props;
        onActivateObject(null);
        onEditShape(true);
    };

    private onCanvasEditDone = (event: any): void => {
        const { onEditShape, onUpdateAnnotations } = this.props;

        onEditShape(false);

        const { state, points } = event.detail;
        state.points = points;
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
        this.updateShapesView();
        this.activateOnCanvas();
    };

    private onCanvasCancel = (): void => {
        const { onResetCanvas } = this.props;
        onResetCanvas();
    };

    private onCanvasFindObject = async (e: any): Promise<void> => {
        const { jobInstance, canvasInstance } = this.props;

        const result = await jobInstance.annotations.select(e.detail.states, e.detail.x, e.detail.y);

        if (result && result.state) {
            if (result.state.shapeType === 'polyline' || result.state.shapeType === 'points') {
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
        if (![ShapeType.CUBOID, ShapeType.RECTANGLE].includes(state.shapeType)) {
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
            canvasInstance,
            selectedOpacity,
            aamZoomMargin,
            workspace,
            annotations,
        } = this.props;

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
            const el = window.document.getElementById(`cvat_canvas_shape_${activatedStateID}`);
            if (el) {
                ((el as any) as SVGElement).setAttribute('fill-opacity', `${selectedOpacity / 100}`);
            }
        }
    }

    private updateShapesView(): void {
        const {
            annotations, opacity, colorBy, outlined, outlineColor,
        } = this.props;

        for (const state of annotations) {
            let shapeColor = '';

            if (colorBy === ColorBy.INSTANCE) {
                shapeColor = state.color;
            } else if (colorBy === ColorBy.GROUP) {
                shapeColor = state.group.color;
            } else if (colorBy === ColorBy.LABEL) {
                shapeColor = state.label.color;
            }

            // TODO: In this approach CVAT-UI know details of implementations CVAT-CANVAS (svg.js)
            const shapeView = window.document.getElementById(`cvat_canvas_shape_${state.clientID}`);
            if (shapeView) {
                const handler = (shapeView as any).instance.remember('_selectHandler');
                if (handler && handler.nested) {
                    handler.nested.fill({ color: shapeColor });
                }

                (shapeView as any).instance.fill({ color: shapeColor, opacity: opacity / 100 });
                (shapeView as any).instance.stroke({ color: outlined ? outlineColor : shapeColor });
            }
        }
    }

    private updateCanvas(): void {
        const {
            curZLayer, annotations, frameData, canvasInstance,
        } = this.props;

        if (frameData !== null) {
            canvasInstance.setup(
                frameData,
                annotations.filter((e) => e.objectType !== ObjectType.TAG),
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
            canvasInstance,
            brightnessLevel,
            contrastLevel,
            saturationLevel,
            canvasBackgroundColor,
        } = this.props;

        // Size
        window.addEventListener('resize', this.fitCanvas);
        this.fitCanvas();

        // Grid
        const gridElement = window.document.getElementById('cvat_canvas_grid');
        const gridPattern = window.document.getElementById('cvat_canvas_grid_pattern');
        if (gridElement) {
            gridElement.style.display = grid ? 'block' : 'none';
        }
        if (gridPattern) {
            gridPattern.style.stroke = gridColor.toLowerCase();
            gridPattern.style.opacity = `${gridOpacity / 100}`;
        }
        canvasInstance.grid(gridSize, gridSize);

        // Filters
        const backgroundElement = window.document.getElementById('cvat_canvas_background');
        if (backgroundElement) {
            backgroundElement.style.filter =
                `brightness(${brightnessLevel / 100})` +
                `contrast(${contrastLevel / 100})` +
                `saturate(${saturationLevel / 100})`;
        }

        const canvasWrapperElement = window.document
            .getElementsByClassName('cvat-canvas-container')
            .item(0) as HTMLElement | null;
        if (canvasWrapperElement) {
            canvasWrapperElement.style.backgroundColor = canvasBackgroundColor;
        }

        // Events
        canvasInstance.html().addEventListener(
            'canvas.setup',
            () => {
                const { activatedStateID, activatedAttributeID } = this.props;
                canvasInstance.fit();
                canvasInstance.activate(activatedStateID, activatedAttributeID);
            },
            { once: true },
        );

        canvasInstance.html().addEventListener('mousedown', this.onCanvasMouseDown);
        canvasInstance.html().addEventListener('click', this.onCanvasClicked);
        canvasInstance.html().addEventListener('contextmenu', this.onCanvasContextMenu);
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
        canvasInstance.html().addEventListener('canvas.splitted', this.onCanvasTrackSplitted);

        canvasInstance.html().addEventListener('canvas.contextmenu', this.onCanvasPointContextMenu);
    }

    public render(): JSX.Element {
        const {
            maxZLayer,
            curZLayer,
            minZLayer,
            onSwitchZLayer,
            onAddZLayer,
            brightnessLevel,
            contrastLevel,
            saturationLevel,
            keyMap,
            grid,
            gridColor,
            gridOpacity,
            switchableAutomaticBordering,
            automaticBordering,
            onChangeBrightnessLevel,
            onChangeSaturationLevel,
            onChangeContrastLevel,
            onChangeGridColor,
            onChangeGridOpacity,
            onSwitchGrid,
            onSwitchAutomaticBordering,
        } = this.props;

        const preventDefault = (event: KeyboardEvent | undefined): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const subKeyMap = {
            INCREASE_BRIGHTNESS: keyMap.INCREASE_BRIGHTNESS,
            DECREASE_BRIGHTNESS: keyMap.DECREASE_BRIGHTNESS,
            INCREASE_CONTRAST: keyMap.INCREASE_CONTRAST,
            DECREASE_CONTRAST: keyMap.DECREASE_CONTRAST,
            INCREASE_SATURATION: keyMap.INCREASE_SATURATION,
            DECREASE_SATURATION: keyMap.DECREASE_SATURATION,
            INCREASE_GRID_OPACITY: keyMap.INCREASE_GRID_OPACITY,
            DECREASE_GRID_OPACITY: keyMap.DECREASE_GRID_OPACITY,
            CHANGE_GRID_COLOR: keyMap.CHANGE_GRID_COLOR,
            SWITCH_AUTOMATIC_BORDERING: keyMap.SWITCH_AUTOMATIC_BORDERING,
        };

        const step = 10;
        const handlers = {
            INCREASE_BRIGHTNESS: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const maxLevel = 200;
                if (brightnessLevel < maxLevel) {
                    onChangeBrightnessLevel(Math.min(brightnessLevel + step, maxLevel));
                }
            },
            DECREASE_BRIGHTNESS: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const minLevel = 50;
                if (brightnessLevel > minLevel) {
                    onChangeBrightnessLevel(Math.max(brightnessLevel - step, minLevel));
                }
            },
            INCREASE_CONTRAST: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const maxLevel = 200;
                if (contrastLevel < maxLevel) {
                    onChangeContrastLevel(Math.min(contrastLevel + step, maxLevel));
                }
            },
            DECREASE_CONTRAST: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const minLevel = 50;
                if (contrastLevel > minLevel) {
                    onChangeContrastLevel(Math.max(contrastLevel - step, minLevel));
                }
            },
            INCREASE_SATURATION: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const maxLevel = 300;
                if (saturationLevel < maxLevel) {
                    onChangeSaturationLevel(Math.min(saturationLevel + step, maxLevel));
                }
            },
            DECREASE_SATURATION: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const minLevel = 0;
                if (saturationLevel > minLevel) {
                    onChangeSaturationLevel(Math.max(saturationLevel - step, minLevel));
                }
            },
            INCREASE_GRID_OPACITY: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const maxLevel = 100;
                if (!grid) {
                    onSwitchGrid(true);
                }

                if (gridOpacity < maxLevel) {
                    onChangeGridOpacity(Math.min(gridOpacity + step, maxLevel));
                }
            },
            DECREASE_GRID_OPACITY: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const minLevel = 0;
                if (gridOpacity - step <= minLevel) {
                    onSwitchGrid(false);
                }

                if (gridOpacity > minLevel) {
                    onChangeGridOpacity(Math.max(gridOpacity - step, minLevel));
                }
            },
            CHANGE_GRID_COLOR: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                const colors = [GridColor.Black, GridColor.Blue, GridColor.Green, GridColor.Red, GridColor.White];
                const indexOf = colors.indexOf(gridColor) + 1;
                const color = colors[indexOf >= colors.length ? 0 : indexOf];
                onChangeGridColor(color);
            },
            SWITCH_AUTOMATIC_BORDERING: (event: KeyboardEvent | undefined) => {
                if (switchableAutomaticBordering) {
                    preventDefault(event);
                    onSwitchAutomaticBordering(!automaticBordering);
                }
            },
        };

        return (
            <Layout.Content style={{ position: 'relative' }}>
                <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} allowChanges />
                {/*
                    This element doesn't have any props
                    So, React isn't going to rerender it
                    And it's a reason why cvat-canvas appended in mount function works
                */}
                <div
                    className='cvat-canvas-container'
                    style={{
                        overflow: 'hidden',
                        width: '100%',
                        height: '100%',
                    }}
                />
                <div className='cvat-canvas-z-axis-wrapper'>
                    <Slider
                        disabled={minZLayer === maxZLayer}
                        min={minZLayer}
                        max={maxZLayer}
                        value={curZLayer}
                        vertical
                        reverse
                        defaultValue={0}
                        onChange={(value: SliderValue): void => onSwitchZLayer(value as number)}
                    />
                    <Tooltip title={`Add new layer ${maxZLayer + 1} and switch to it`} mouseLeaveDelay={0}>
                        <Icon type='plus-circle' onClick={onAddZLayer} />
                    </Tooltip>
                </div>
            </Layout.Content>
        );
    }
}
