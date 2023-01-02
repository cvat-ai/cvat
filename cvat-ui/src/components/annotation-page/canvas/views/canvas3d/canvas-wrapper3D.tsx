// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, {
    ReactElement, useEffect, useRef,
} from 'react';
import { connect, useSelector } from 'react-redux';
import {
    ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined, ArrowUpOutlined,
} from '@ant-design/icons';

import {
    activateObject,
    confirmCanvasReady,
    createAnnotationsAsync,
    dragCanvas,
    editShape,
    groupAnnotationsAsync,
    groupObjects,
    resetCanvas,
    shapeDrawn,
    updateAnnotationsAsync,
    updateCanvasContextMenu,
} from 'actions/annotation-actions';
import {
    ColorBy, CombinedState, ContextMenuType, ObjectType, Workspace,
} from 'reducers';
import { CameraAction, Canvas3d, ViewsDOM } from 'cvat-canvas3d-wrapper';

import CVATTooltip from 'components/common/cvat-tooltip';
import { LogType } from 'cvat-logger';
import { getCore } from 'cvat-core-wrapper';

const cvat = getCore();

interface StateToProps {
    opacity: number;
    selectedOpacity: number;
    outlined: boolean;
    outlineColor: string;
    colorBy: ColorBy;
    frameFetching: boolean;
    canvasInstance: Canvas3d;
    jobInstance: any;
    frameData: any;
    annotations: any[];
    contextMenuVisibility: boolean;
    activeLabelID: number | null;
    activatedStateID: number | null;
    activeObjectType: ObjectType;
    workspace: Workspace;
    frame: number;
    resetZoom: boolean;
};

interface DispatchToProps {
    onDragCanvas: (enabled: boolean) => void;
    onSetupCanvas(): void;
    onGroupObjects: (enabled: boolean) => void;
    onResetCanvas(): void;
    onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onUpdateAnnotations(states: any[]): void;
    onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onActivateObject: (activatedStateID: number | null) => void;
    onShapeDrawn: () => void;
    onEditShape: (enabled: boolean) => void;
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
        onDragCanvas(enabled: boolean): void {
            dispatch(dragCanvas(enabled));
        },
        onSetupCanvas(): void {
            dispatch(confirmCanvasReady());
        },
        onResetCanvas(): void {
            dispatch(resetCanvas());
        },
        onGroupObjects(enabled: boolean): void {
            dispatch(groupObjects(enabled));
        },
        onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(createAnnotationsAsync(sessionInstance, frame, states));
        },
        onShapeDrawn(): void {
            dispatch(shapeDrawn());
        },
        onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void {
            dispatch(groupAnnotationsAsync(sessionInstance, frame, states));
        },
        onActivateObject(activatedStateID: number | null): void {
            if (activatedStateID === null) {
                dispatch(updateCanvasContextMenu(false, 0, 0));
            }

            dispatch(activateObject(activatedStateID, null, null));
        },
        onEditShape(enabled: boolean): void {
            dispatch(editShape(enabled));
        },
        onUpdateAnnotations(states: any[]): void {
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
    };
}

type Props = StateToProps & DispatchToProps;

export const PerspectiveViewComponent = React.memo(
    (): JSX.Element => {
        const ref = useRef<HTMLDivElement>(null);
        const canvas = useSelector((state: CombinedState) => state.annotation.canvas.instance as Canvas3d);
        const frameFetching = useSelector((state: CombinedState) => state.annotation.player.frame.fetching);

        const screenKeyControl = (code: CameraAction, altKey: boolean, shiftKey: boolean): void => {
            canvas.keyControls(new KeyboardEvent('keydown', { code, altKey, shiftKey }));
        };

        const ArrowGroup = (): ReactElement => (
            <span className='cvat-canvas3d-perspective-arrow-directions'>
                <CVATTooltip title='Shift+Arrow Up' placement='topRight'>
                    <button
                        data-cy='arrow-up'
                        onClick={() => screenKeyControl(CameraAction.TILT_UP, false, true)}
                        type='button'
                        className='cvat-canvas3d-perspective-arrow-directions-icons-up'
                    >
                        <ArrowUpOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                    </button>
                </CVATTooltip>
                <br />
                <CVATTooltip title='Shift+Arrow Left' placement='topRight'>
                    <button
                        onClick={() => screenKeyControl(CameraAction.ROTATE_LEFT, false, true)}
                        type='button'
                        className='cvat-canvas3d-perspective-arrow-directions-icons-bottom'
                    >
                        <ArrowLeftOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                    </button>
                </CVATTooltip>
                <CVATTooltip title='Shift+Arrow Bottom' placement='topRight'>
                    <button
                        onClick={() => screenKeyControl(CameraAction.TILT_DOWN, false, true)}
                        type='button'
                        className='cvat-canvas3d-perspective-arrow-directions-icons-bottom'
                    >
                        <ArrowDownOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                    </button>
                </CVATTooltip>
                <CVATTooltip title='Shift+Arrow Right' placement='topRight'>
                    <button
                        onClick={() => screenKeyControl(CameraAction.ROTATE_RIGHT, false, true)}
                        type='button'
                        className='cvat-canvas3d-perspective-arrow-directions-icons-bottom'
                    >
                        <ArrowRightOutlined className='cvat-canvas3d-perspective-arrow-directions-icons-color' />
                    </button>
                </CVATTooltip>
            </span>
        );

        const ControlGroup = (): ReactElement => (
            <span className='cvat-canvas3d-perspective-directions'>
                <CVATTooltip title='Alt+U' placement='topLeft'>
                    <button
                        onClick={() => screenKeyControl(CameraAction.MOVE_UP, true, false)}
                        type='button'
                        className='cvat-canvas3d-perspective-directions-icon'
                    >
                        U
                    </button>
                </CVATTooltip>
                <CVATTooltip title='Alt+I' placement='topLeft'>
                    <button
                        onClick={() => screenKeyControl(CameraAction.ZOOM_IN, true, false)}
                        type='button'
                        className='cvat-canvas3d-perspective-directions-icon'
                    >
                        I
                    </button>
                </CVATTooltip>
                <CVATTooltip title='Alt+O' placement='topLeft'>
                    <button
                        onClick={() => screenKeyControl(CameraAction.MOVE_DOWN, true, false)}
                        type='button'
                        className='cvat-canvas3d-perspective-directions-icon'
                    >
                        O
                    </button>
                </CVATTooltip>
                <br />
                <CVATTooltip title='Alt+J' placement='topLeft'>
                    <button
                        onClick={() => screenKeyControl(CameraAction.MOVE_LEFT, true, false)}
                        type='button'
                        className='cvat-canvas3d-perspective-directions-icon'
                    >
                        J
                    </button>
                </CVATTooltip>
                <CVATTooltip title='Alt+K' placement='topLeft'>
                    <button
                        onClick={() => screenKeyControl(CameraAction.ZOOM_OUT, true, false)}
                        type='button'
                        className='cvat-canvas3d-perspective-directions-icon'
                    >
                        K
                    </button>
                </CVATTooltip>
                <CVATTooltip title='Alt+L' placement='topLeft'>
                    <button
                        onClick={() => screenKeyControl(CameraAction.MOVE_RIGHT, true, false)}
                        type='button'
                        className='cvat-canvas3d-perspective-directions-icon'
                    >
                        L
                    </button>
                </CVATTooltip>
            </span>
        );

        useEffect(() => {
            if (ref.current) {
                ref.current.appendChild(canvas.html().perspective);
            }
        }, []);

        return (
            <div className='cvat-canvas3d-perspective'>
                {
                    frameFetching && (
                        <svg className='cvat_canvas_loading_animation'>
                            <circle className='cvat_canvas_loading_circle' r='30' cx='50%' cy='50%' />
                        </svg>
                    )
                }
                <div
                    className='cvat-canvas-container cvat-canvas-container-overflow'
                    ref={ref}
                    style={{
                        visibility: frameFetching ? 'hidden' : undefined,
                    }}
                />
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
        const frameFetching = useSelector((state: CombinedState) => state.annotation.player.frame.fetching);

        useEffect(() => {
            if (ref.current) {
                ref.current.appendChild(canvas.html().top);
            }
        }, []);

        return (
            <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-topview'>
                {
                    frameFetching && (
                        <svg className='cvat_canvas_loading_animation'>
                            <circle className='cvat_canvas_loading_circle' r='30' cx='50%' cy='50%' />
                        </svg>
                    )
                }
                <div className='cvat-canvas3d-header'>Top</div>
                <div
                    className='cvat-canvas3d-fullsize'
                    ref={ref}
                    style={{
                        visibility: frameFetching ? 'hidden' : undefined,
                    }}
                />
            </div>
        );
    },
);

export const SideViewComponent = React.memo(
    (): JSX.Element => {
        const ref = useRef<HTMLDivElement>(null);
        const canvas = useSelector((state: CombinedState) => state.annotation.canvas.instance as Canvas3d);
        const frameFetching = useSelector((state: CombinedState) => state.annotation.player.frame.fetching);

        useEffect(() => {
            if (ref.current) {
                ref.current.appendChild(canvas.html().side);
            }
        }, []);

        return (
            <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-sideview'>
                {
                    frameFetching && (
                        <svg className='cvat_canvas_loading_animation'>
                            <circle className='cvat_canvas_loading_circle' r='30' cx='50%' cy='50%' />
                        </svg>
                    )
                }
                <div className='cvat-canvas3d-header'>Side</div>
                <div
                    className='cvat-canvas3d-fullsize'
                    ref={ref}
                    style={{
                        visibility: frameFetching ? 'hidden' : undefined,
                    }}
                />
            </div>
        );
    },
);

export const FrontViewComponent = React.memo(
    (): JSX.Element => {
        const ref = useRef<HTMLDivElement>(null);
        const canvas = useSelector((state: CombinedState) => state.annotation.canvas.instance as Canvas3d);
        const frameFetching = useSelector((state: CombinedState) => state.annotation.player.frame.fetching);

        useEffect(() => {
            if (ref.current) {
                ref.current.appendChild(canvas.html().front);
            }
        }, []);

        return (
            <div className='cvat-canvas3d-orthographic-view cvat-canvas3d-frontview'>
                {
                    frameFetching && (
                        <svg className='cvat_canvas_loading_animation'>
                            <circle className='cvat_canvas_loading_circle' r='30' cx='50%' cy='50%' />
                        </svg>
                    )
                }
                <div className='cvat-canvas3d-header'>Front</div>
                <div
                    className='cvat-canvas3d-fullsize'
                    ref={ref}
                    style={{
                        visibility: frameFetching ? 'hidden' : undefined,
                    }}
                />
            </div>
        );
    },
);

const Canvas3DWrapperComponent = React.memo((props: Props): ReactElement => {
    const animateId = useRef(0);

    const {
        opacity,
        outlined,
        outlineColor,
        selectedOpacity,
        colorBy,
        contextMenuVisibility,
        frameData,
        onResetCanvas,
        onSetupCanvas,
        annotations,
        frame,
        jobInstance,
        activeLabelID,
        activatedStateID,
        resetZoom,
        activeObjectType,
        onShapeDrawn,
        onCreateAnnotations,
    } = props;
    const { canvasInstance } = props as { canvasInstance: Canvas3d };

    const onCanvasSetup = (): void => {
        onSetupCanvas();
    };

    const onCanvasDragStart = (): void => {
        const { onDragCanvas } = props;
        onDragCanvas(true);
    };

    const onCanvasDragDone = (): void => {
        const { onDragCanvas } = props;
        onDragCanvas(false);
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
        state.label = state.label || jobInstance.labels.filter((label: any) => label.id === activeLabelID)[0];
        state.occluded = state.occluded || false;
        state.frame = frame;
        state.zOrder = 0;
        const objectState = new cvat.classes.ObjectState(state);
        onCreateAnnotations(jobInstance, frame, [objectState]);
    };

    const onCanvasClick = (e: MouseEvent): void => {
        const { onUpdateContextMenu } = props;
        if (contextMenuVisibility) {
            onUpdateContextMenu(false, e.clientX, e.clientY, ContextMenuType.CANVAS_SHAPE);
        }
    };

    const initialSetup = (): void => {
        const canvasInstanceDOM = canvasInstance.html() as ViewsDOM;
        canvasInstanceDOM.perspective.addEventListener('canvas.setup', onCanvasSetup);
        canvasInstanceDOM.perspective.addEventListener('canvas.canceled', onCanvasCancel);
        canvasInstanceDOM.perspective.addEventListener('canvas.dragstart', onCanvasDragStart);
        canvasInstanceDOM.perspective.addEventListener('canvas.dragstop', onCanvasDragDone);
        canvasInstance.configure({ resetZoom });
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
        const { onEditShape, onUpdateAnnotations } = props;
        onEditShape(false);
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
        canvasInstance.configure({ resetZoom });
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

    const onCanvasObjectsGroupped = (event: any): void => {
        const { onGroupAnnotations, onGroupObjects } = props;

        onGroupObjects(false);

        const { states } = event.detail;
        onGroupAnnotations(jobInstance, frame, states);
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
        canvasInstanceDOM.perspective.addEventListener('canvas.groupped', onCanvasObjectsGroupped);

        return () => {
            canvasInstanceDOM.perspective.removeEventListener('canvas.drawn', onCanvasShapeDrawn);
            canvasInstanceDOM.perspective.removeEventListener('canvas.selected', onCanvasShapeSelected);
            canvasInstanceDOM.perspective.removeEventListener('canvas.edited', onCanvasEditDone);
            canvasInstanceDOM.perspective.removeEventListener('canvas.contextmenu', onContextMenu);
            canvasInstanceDOM.perspective.removeEventListener('click', onCanvasClick);
            canvasInstanceDOM.perspective.removeEventListener('canvas.groupped', onCanvasObjectsGroupped);
        };
    }, [frameData, annotations, activeLabelID, contextMenuVisibility]);

    return <></>;
});

export default connect(mapStateToProps, mapDispatchToProps)(Canvas3DWrapperComponent);
