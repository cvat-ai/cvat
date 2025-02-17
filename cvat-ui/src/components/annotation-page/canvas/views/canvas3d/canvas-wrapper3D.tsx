// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useRef } from 'react';
import { connect, useSelector } from 'react-redux';
import {
    ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined, ArrowUpOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Spin from 'antd/lib/spin';

import {
    activateObject,
    confirmCanvasReadyAsync,
    createAnnotationsAsync,
    groupAnnotationsAsync,
    mergeAnnotationsAsync,
    resetCanvas,
    splitAnnotationsAsync,
    updateActiveControl as updateActiveControlAction,
    updateAnnotationsAsync,
    updateCanvasContextMenu,
} from 'actions/annotation-actions';
import {
    ActiveControl,
    ColorBy, CombinedState, ContextMenuType, ObjectType, Workspace,
} from 'reducers';
import { CameraAction, Canvas3d, ViewsDOM } from 'cvat-canvas3d-wrapper';

import CVATTooltip from 'components/common/cvat-tooltip';
import { EventScope } from 'cvat-logger';
import { getCore, ObjectState, Job } from 'cvat-core-wrapper';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';

const cvat = getCore();

const componentShortcuts = {
    TILT_UP: {
        name: 'Camera Roll Angle Up',
        description: 'Increases camera roll angle',
        sequences: ['shift+up'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE'],
    },
    TILT_DOWN: {
        name: 'Camera Roll Angle Down',
        description: 'Decreases camera roll angle',
        sequences: ['shift+down'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE'],
    },
    ROTATE_LEFT: {
        name: 'Camera Pitch Angle Left',
        description: 'Decreases camera pitch angle',
        sequences: ['shift+left'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE'],
    },
    ROTATE_RIGHT: {
        name: 'Camera Pitch Angle Right',
        description: 'Increases camera pitch angle',
        sequences: ['shift+right'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE'],
    },
    MOVE_UP: {
        name: 'Camera Move Up',
        description: 'Move the camera up',
        sequences: ['alt+u'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE'],
    },
    MOVE_DOWN: {
        name: 'Camera Move Down',
        description: 'Move the camera down',
        sequences: ['alt+o'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE'],
    },
    MOVE_LEFT: {
        name: 'Camera Move Left',
        description: 'Move the camera left',
        sequences: ['alt+j'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE'],
    },
    MOVE_RIGHT: {
        name: 'Camera Move Right',
        description: 'Move the camera right',
        sequences: ['alt+l'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE'],
    },
    ZOOM_IN: {
        name: 'Camera Zoom In',
        description: 'Performs zoom in',
        sequences: ['alt+i'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE'],
    },
    ZOOM_OUT: {
        name: 'Camera Zoom Out',
        description: 'Performs zoom out',
        sequences: ['alt+k'],
        scope: ShortcutScope['3D_ANNOTATION_WORKSPACE'],
    },
};

registerComponentShortcuts(componentShortcuts);

interface StateToProps {
    opacity: number;
    selectedOpacity: number;
    outlined: boolean;
    outlineColor: string;
    colorBy: ColorBy;
    frameFetching: boolean;
    canvasInstance: Canvas3d;
    jobInstance: Job;
    frameData: any;
    annotations: any[];
    contextMenuVisibility: boolean;
    activeLabelID: number | null;
    activatedStateID: number | null;
    activeObjectType: ObjectType;
    workspace: Workspace;
    frame: number;
    resetZoom: boolean;
}

interface DispatchToProps {
    onSetupCanvas(): void;
    onResetCanvas(): void;
    onCreateAnnotations(states: ObjectState[]): void;
    onGroupAnnotations(states: ObjectState[]): void;
    onMergeAnnotations(states: ObjectState[]): void;
    onSplitAnnotations(state: ObjectState): void;
    onUpdateAnnotations(states: ObjectState[]): void;
    onActivateObject: (activatedStateID: number | null) => void;
    updateActiveControl: (activeControl: ActiveControl) => void;
    onUpdateContextMenu(visible: boolean, left: number, top: number, type: ContextMenuType, pointID?: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: {
                instance: canvasInstance,
                contextMenu: { visible: contextMenuVisibility },
            },
            drawing: { activeLabelID, activeObjectType },
            job: { instance: jobInstance },
            player: {
                frame: { data: frameData, number: frame, fetching: frameFetching },
            },
            annotations: {
                states: annotations,
                activatedStateID,
            },
            workspace,
        },
        settings: {
            player: {
                resetZoom,
            },
            shapes: {
                opacity, colorBy, selectedOpacity, outlined, outlineColor,
            },
        },
    } = state;

    return {
        canvasInstance: canvasInstance as Canvas3d,
        jobInstance,
        frameData,
        contextMenuVisibility,
        annotations,
        frameFetching,
        frame,
        opacity,
        colorBy,
        selectedOpacity,
        outlined,
        outlineColor,
        activeLabelID,
        activatedStateID,
        activeObjectType,
        resetZoom,
        workspace,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onSetupCanvas(): void {
            dispatch(confirmCanvasReadyAsync());
        },
        onResetCanvas(): void {
            dispatch(resetCanvas());
        },
        onCreateAnnotations(states: ObjectState[]): void {
            dispatch(createAnnotationsAsync(states));
        },
        onGroupAnnotations(states: ObjectState[]): void {
            dispatch(groupAnnotationsAsync(states));
        },
        onMergeAnnotations(states: ObjectState[]): void {
            dispatch(mergeAnnotationsAsync(states));
        },
        onSplitAnnotations(state: ObjectState): void {
            dispatch(splitAnnotationsAsync(state));
        },
        onActivateObject(activatedStateID: number | null): void {
            if (activatedStateID === null) {
                dispatch(updateCanvasContextMenu(false, 0, 0));
            }

            dispatch(activateObject(activatedStateID, null, null));
        },
        onUpdateAnnotations(states: ObjectState[]): void {
            dispatch(updateAnnotationsAsync(states));
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
        updateActiveControl(activeControl: ActiveControl): void {
            dispatch(updateActiveControlAction(activeControl));
        },
    };
}

type Props = StateToProps & DispatchToProps;

const Spinner = React.memo(() => (
    <div className='cvat-spinner-container'>
        <Spin className='cvat-spinner' />
    </div>
));

export const PerspectiveViewComponent = React.memo(
    (): JSX.Element => {
        const ref = useRef<HTMLDivElement>(null);
        const canvas = useSelector((state: CombinedState) => state.annotation.canvas.instance as Canvas3d);
        const canvasIsReady = useSelector((state: CombinedState) => state.annotation.canvas.ready);
        const { keyMap, normalizedKeyMap } = useSelector((state: CombinedState) => state.shortcuts);

        const screenKeyControl = (code: CameraAction, altKey: boolean, shiftKey: boolean): void => {
            canvas.keyControls(new KeyboardEvent('keydown', { code, altKey, shiftKey }));
        };

        const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
            TILT_UP: () => {}, // Handled by CVAT 3D Independently
            TILT_DOWN: () => {},
            ROTATE_LEFT: () => {},
            ROTATE_RIGHT: () => {},
            MOVE_UP: () => {},
            MOVE_DOWN: () => {},
            MOVE_LEFT: () => {},
            MOVE_RIGHT: () => {},
            ZOOM_IN: () => {},
            ZOOM_OUT: () => {},
        };

        function ArrowGroup(): JSX.Element {
            return (
                <div className='cvat-canvas3d-perspective-arrow-directions'>
                    <div>
                        <CVATTooltip title={normalizedKeyMap.TILT_UP} placement='topRight'>
                            <Button
                                size='small'
                                onClick={() => screenKeyControl(CameraAction.TILT_UP, false, true)}
                                className='cvat-canvas3d-perspective-arrow-directions-icons-up'
                            >
                                <ArrowUpOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                            </Button>
                        </CVATTooltip>
                    </div>
                    <div>
                        <CVATTooltip title={normalizedKeyMap.ROTATE_LEFT} placement='topRight'>
                            <Button
                                size='small'
                                onClick={() => screenKeyControl(CameraAction.ROTATE_LEFT, false, true)}
                                className='cvat-canvas3d-perspective-arrow-directions-icons-left'
                            >
                                <ArrowLeftOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                            </Button>
                        </CVATTooltip>
                        <CVATTooltip title={normalizedKeyMap.TILT_DOWN} placement='topRight'>
                            <Button
                                size='small'
                                onClick={() => screenKeyControl(CameraAction.TILT_DOWN, false, true)}
                                className='cvat-canvas3d-perspective-arrow-directions-icons-bottom'
                            >
                                <ArrowDownOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                            </Button>
                        </CVATTooltip>
                        <CVATTooltip title={normalizedKeyMap.ROTATE_RIGHT} placement='topRight'>
                            <Button
                                size='small'
                                onClick={() => screenKeyControl(CameraAction.ROTATE_RIGHT, false, true)}
                                className='cvat-canvas3d-perspective-arrow-directions-icons-right'
                            >
                                <ArrowRightOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                            </Button>
                        </CVATTooltip>
                    </div>
                </div>
            );
        }

        function ControlGroup(): JSX.Element {
            return (
                <span className='cvat-canvas3d-perspective-directions'>
                    <CVATTooltip title={normalizedKeyMap.MOVE_UP} placement='topLeft'>
                        <Button
                            size='small'
                            onClick={() => screenKeyControl(CameraAction.MOVE_UP, true, false)}
                            className='cvat-canvas3d-perspective-directions-icon cvat-canvas3d-perspective-shift-down'
                        >
                            U
                        </Button>
                    </CVATTooltip>
                    <CVATTooltip title={normalizedKeyMap.ZOOM_IN} placement='topLeft'>
                        <Button
                            size='small'
                            onClick={() => screenKeyControl(CameraAction.ZOOM_IN, true, false)}
                            className='cvat-canvas3d-perspective-directions-icon cvat-canvas3d-perspective-zoom-in'
                        >
                            I
                        </Button>
                    </CVATTooltip>
                    <CVATTooltip title={normalizedKeyMap.MOVE_DOWN} placement='topLeft'>
                        <Button
                            size='small'
                            onClick={() => screenKeyControl(CameraAction.MOVE_DOWN, true, false)}
                            className='cvat-canvas3d-perspective-directions-icon cvat-canvas3d-perspective-shift-up'
                        >
                            O
                        </Button>
                    </CVATTooltip>
                    <br />
                    <CVATTooltip title={normalizedKeyMap.MOVE_LEFT} placement='topLeft'>
                        <Button
                            size='small'
                            onClick={() => screenKeyControl(CameraAction.MOVE_LEFT, true, false)}
                            className='cvat-canvas3d-perspective-directions-icon cvat-canvas3d-perspective-shift-left'
                        >
                            J
                        </Button>
                    </CVATTooltip>
                    <CVATTooltip title={normalizedKeyMap.ZOOM_OUT} placement='topLeft'>
                        <Button
                            size='small'
                            onClick={() => screenKeyControl(CameraAction.ZOOM_OUT, true, false)}
                            className='cvat-canvas3d-perspective-directions-icon cvat-canvas3d-perspective-zoom-out'
                        >
                            K
                        </Button>
                    </CVATTooltip>
                    <CVATTooltip title={normalizedKeyMap.MOVE_RIGHT} placement='topLeft'>
                        <Button
                            size='small'
                            onClick={() => screenKeyControl(CameraAction.MOVE_RIGHT, true, false)}
                            className='cvat-canvas3d-perspective-directions-icon cvat-canvas3d-perspective-shift-right'
                        >
                            L
                        </Button>
                    </CVATTooltip>
                </span>
            );
        }

        useEffect(() => {
            if (ref.current) {
                ref.current.appendChild(canvas.html().perspective);
            }
        }, []);

        return (
            <div className='cvat-canvas3d-perspective'>
                { !canvasIsReady && <Spinner /> }
                <div
                    className='cvat-canvas-container cvat-canvas-container-overflow'
                    ref={ref}
                />
                <GlobalHotKeys handlers={handlers} keyMap={subKeyMap(componentShortcuts, keyMap)} />
                <ArrowGroup />
                <ControlGroup />
            </div>
        );
    },
);

export const TopViewComponent = React.memo(
    (): JSX.Element => {
        const ref = useRef<HTMLDivElement>(null);
        const canvas = useSelector((state: CombinedState) => state.annotation.canvas.instance as Canvas3d);
        const canvasIsReady = useSelector((state: CombinedState) => state.annotation.canvas.ready);

        useEffect(() => {
            if (ref.current) {
                ref.current.appendChild(canvas.html().top);
            }
        }, []);

        return (
            <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-topview'>
                { !canvasIsReady && <Spinner /> }
                <div className='cvat-canvas3d-header'>Top</div>
                <div
                    className='cvat-canvas3d-fullsize'
                    ref={ref}
                />
            </div>
        );
    },
);

export const SideViewComponent = React.memo(
    (): JSX.Element => {
        const ref = useRef<HTMLDivElement>(null);
        const canvas = useSelector((state: CombinedState) => state.annotation.canvas.instance as Canvas3d);
        const canvasIsReady = useSelector((state: CombinedState) => state.annotation.canvas.ready);

        useEffect(() => {
            if (ref.current) {
                ref.current.appendChild(canvas.html().side);
            }
        }, []);

        return (
            <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-sideview'>
                { !canvasIsReady && <Spinner /> }
                <div className='cvat-canvas3d-header'>Side</div>
                <div
                    className='cvat-canvas3d-fullsize'
                    ref={ref}
                />
            </div>
        );
    },
);

export const FrontViewComponent = React.memo(
    (): JSX.Element => {
        const ref = useRef<HTMLDivElement>(null);
        const canvas = useSelector((state: CombinedState) => state.annotation.canvas.instance as Canvas3d);
        const canvasIsReady = useSelector((state: CombinedState) => state.annotation.canvas.ready);

        useEffect(() => {
            if (ref.current) {
                ref.current.appendChild(canvas.html().front);
            }
        }, []);

        return (
            <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-frontview'>
                { !canvasIsReady && <Spinner /> }
                <div className='cvat-canvas3d-header'>Front</div>
                <div
                    className='cvat-canvas3d-fullsize'
                    ref={ref}
                />
            </div>
        );
    },
);

const Canvas3DWrapperComponent = React.memo((props: Props): null => {
    const animateId = useRef(0);

    const {
        opacity,
        outlined,
        outlineColor,
        selectedOpacity,
        colorBy,
        contextMenuVisibility,
        frameData,
        annotations,
        frame,
        jobInstance,
        activeLabelID,
        activatedStateID,
        resetZoom,
        activeObjectType,
        onResetCanvas,
        onSetupCanvas,
        updateActiveControl,
        onCreateAnnotations,
        onMergeAnnotations,
        onSplitAnnotations,
        onGroupAnnotations,
    } = props;

    const { canvasInstance } = props as { canvasInstance: Canvas3d };

    const onCanvasSetup = (): void => {
        onSetupCanvas();
    };

    const onCanvasDragStart = (): void => {
        updateActiveControl(ActiveControl.DRAG_CANVAS);
    };

    const onCanvasDragDone = (): void => {
        updateActiveControl(ActiveControl.CURSOR);
    };

    const animateCanvas = (): void => {
        canvasInstance.render();
        animateId.current = requestAnimationFrame(animateCanvas);
    };

    const updateCanvas = (): void => {
        if (frameData !== null) {
            canvasInstance.setup(
                frameData,
                annotations.filter((e) => e.objectType !== ObjectType.TAG),
            );
        }
    };

    const onCanvasCancel = (): void => {
        onResetCanvas();
    };

    const onCanvasShapeDrawn = (event: any): void => {
        if (!event.detail.continue) {
            updateActiveControl(ActiveControl.CURSOR);
        }

        const { state, duration } = event.detail;
        const isDrawnFromScratch = !state.label;
        if (isDrawnFromScratch) {
            jobInstance.logger.log(EventScope.drawObject, { count: 1, duration });
        } else {
            jobInstance.logger.log(EventScope.pasteObject, { count: 1, duration });
        }

        state.objectType = state.objectType || activeObjectType;
        state.label = state.label || jobInstance.labels.filter((label: any) => label.id === activeLabelID)[0];
        state.occluded = state.occluded || false;
        state.frame = frame;
        state.zOrder = 0;
        const objectState = new cvat.classes.ObjectState(state);
        onCreateAnnotations([objectState]);
    };

    const onCanvasClick = (e: MouseEvent): void => {
        const { onUpdateContextMenu } = props;
        if (contextMenuVisibility) {
            onUpdateContextMenu(false, e.clientX, e.clientY, ContextMenuType.CANVAS_SHAPE);
        }
    };

    const initialSetup = (): void => {
        const canvasInstanceDOM = canvasInstance.html() as ViewsDOM;
        canvasInstanceDOM.perspective.addEventListener('canvas.setup', () => {
            canvasInstance.fit();
        }, { once: true });
        canvasInstanceDOM.perspective.addEventListener('canvas.setup', onCanvasSetup);
        canvasInstanceDOM.perspective.addEventListener('canvas.canceled', onCanvasCancel);
        canvasInstanceDOM.perspective.addEventListener('canvas.dragstart', onCanvasDragStart);
        canvasInstanceDOM.perspective.addEventListener('canvas.dragstop', onCanvasDragDone);
    };

    const keyControlsKeyDown = (key: KeyboardEvent): void => {
        canvasInstance.keyControls(key);
    };

    const keyControlsKeyUp = (key: KeyboardEvent): void => {
        if (key.code === 'ControlLeft') {
            canvasInstance.keyControls(key);
        }
    };

    const onCanvasShapeSelected = (event: any): void => {
        const { onActivateObject } = props;
        const { clientID } = event.detail;
        onActivateObject(clientID);
        canvasInstance.activate(clientID);
    };

    const onCanvasEditDone = (event: any): void => {
        const { onUpdateAnnotations } = props;
        const { state, points } = event.detail;
        state.points = points;
        onUpdateAnnotations([state]);
    };

    useEffect(() => {
        const canvasInstanceDOM = canvasInstance.html();

        document.addEventListener('keydown', keyControlsKeyDown);
        document.addEventListener('keyup', keyControlsKeyUp);

        initialSetup();
        updateCanvas();
        animateCanvas();

        return () => {
            canvasInstanceDOM.perspective.removeEventListener('canvas.setup', onCanvasSetup);
            canvasInstanceDOM.perspective.removeEventListener('canvas.canceled', onCanvasCancel);
            canvasInstanceDOM.perspective.removeEventListener('canvas.dragstart', onCanvasDragStart);
            canvasInstanceDOM.perspective.removeEventListener('canvas.dragstop', onCanvasDragDone);
            document.removeEventListener('keydown', keyControlsKeyDown);
            document.removeEventListener('keyup', keyControlsKeyUp);
            cancelAnimationFrame(animateId.current);
        };
    }, []);

    useEffect(() => {
        canvasInstance.activate(activatedStateID);
    }, [activatedStateID]);

    useEffect(() => {
        let listener: EventListener | null = null;
        if (resetZoom) {
            listener = () => canvasInstance.fit();
            canvasInstance.html().perspective.addEventListener('canvas.setup', listener);
        }

        return () => {
            if (listener) {
                canvasInstance.html().perspective.removeEventListener('canvas.setup', listener);
            }
        };
    }, [resetZoom]);

    const updateShapesView = (): void => {
        (canvasInstance as Canvas3d).configureShapes({
            opacity,
            outlined,
            outlineColor,
            selectedOpacity,
            colorBy,
        });
    };

    const onContextMenu = (event: any): void => {
        const { onUpdateContextMenu, onActivateObject } = props;
        onActivateObject(event.detail.clientID);
        onUpdateContextMenu(
            event.detail.clientID !== null,
            event.detail.clientX,
            event.detail.clientY,
            ContextMenuType.CANVAS_SHAPE,
        );
    };

    const onCanvasObjectsGroupped = (event: CustomEvent<{ states: ObjectState[] }>): void => {
        const { states } = event.detail;
        updateActiveControl(ActiveControl.CURSOR);
        onGroupAnnotations(states);
    };

    const onCanvasObjectsMerged = (event: CustomEvent<{ states: ObjectState[] }>): void => {
        const { states } = event.detail;
        onMergeAnnotations(states);
    };

    const onCanvasTrackSplitted = (event: CustomEvent<{ state: ObjectState }>): void => {
        const { state } = event.detail;
        onSplitAnnotations(state);
    };

    useEffect(() => {
        updateShapesView();
    }, [opacity, outlined, outlineColor, selectedOpacity, colorBy]);

    useEffect(() => {
        const canvasInstanceDOM = canvasInstance.html() as ViewsDOM;
        updateCanvas();
        canvasInstanceDOM.perspective.addEventListener('canvas.drawn', onCanvasShapeDrawn);
        canvasInstanceDOM.perspective.addEventListener('canvas.selected', onCanvasShapeSelected);
        canvasInstanceDOM.perspective.addEventListener('canvas.edited', onCanvasEditDone);
        canvasInstanceDOM.perspective.addEventListener('canvas.contextmenu', onContextMenu);
        canvasInstanceDOM.perspective.addEventListener('click', onCanvasClick);
        canvasInstanceDOM.perspective.addEventListener('canvas.groupped', onCanvasObjectsGroupped as EventListener);
        canvasInstanceDOM.perspective.addEventListener('canvas.merged', onCanvasObjectsMerged as EventListener);
        canvasInstanceDOM.perspective.addEventListener('canvas.splitted', onCanvasTrackSplitted as EventListener);

        return () => {
            canvasInstanceDOM.perspective.removeEventListener('canvas.drawn', onCanvasShapeDrawn);
            canvasInstanceDOM.perspective.removeEventListener('canvas.selected', onCanvasShapeSelected);
            canvasInstanceDOM.perspective.removeEventListener('canvas.edited', onCanvasEditDone);
            canvasInstanceDOM.perspective.removeEventListener('canvas.contextmenu', onContextMenu);
            canvasInstanceDOM.perspective.removeEventListener('click', onCanvasClick);
            canvasInstanceDOM.perspective.removeEventListener('canvas.groupped', onCanvasObjectsGroupped as EventListener);
            canvasInstanceDOM.perspective.removeEventListener('canvas.merged', onCanvasObjectsMerged as EventListener);
            canvasInstanceDOM.perspective.removeEventListener('canvas.splitted', onCanvasTrackSplitted as EventListener);
        };
    }, [frameData, annotations, activeLabelID, contextMenuVisibility, activeObjectType]);

    return null;
});

export default connect(mapStateToProps, mapDispatchToProps)(Canvas3DWrapperComponent);
