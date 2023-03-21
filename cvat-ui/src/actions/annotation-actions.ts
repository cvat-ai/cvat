// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    ActionCreator, AnyAction, Dispatch, Store,
} from 'redux';
import { ThunkAction } from 'utils/redux';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import { CanvasMode as Canvas3DMode } from 'cvat-canvas3d-wrapper';
import {
    RectDrawingMethod, CuboidDrawingMethod, Canvas, CanvasMode as Canvas2DMode,
} from 'cvat-canvas-wrapper';
import { getCore, MLModel, DimensionType } from 'cvat-core-wrapper';
import logger, { LogType } from 'cvat-logger';
import { getCVATStore } from 'cvat-store';

import {
    ActiveControl,
    CombinedState,
    ContextMenuType,
    FrameSpeed,
    ObjectType,
    OpenCVTool,
    Rotation,
    ShapeType,
    Workspace,
} from 'reducers';
import { updateJobAsync } from './tasks-actions';
import { switchToolsBlockerState } from './settings-actions';

interface AnnotationsParameters {
    filters: string[];
    frame: number;
    showAllInterpolationTracks: boolean;
    jobInstance: any;
}

const cvat = getCore();
let store: null | Store<CombinedState> = null;

function getStore(): Store<CombinedState> {
    if (store === null) {
        store = getCVATStore();
    }
    return store;
}

export function receiveAnnotationsParameters(): AnnotationsParameters {
    if (store === null) {
        store = getCVATStore();
    }

    const state: CombinedState = getStore().getState();
    const {
        annotation: {
            annotations: { filters },
            player: {
                frame: { number: frame },
            },
            job: { instance: jobInstance },
        },
        settings: {
            workspace: { showAllInterpolationTracks },
        },
    } = state;

    return {
        filters,
        frame,
        jobInstance,
        showAllInterpolationTracks,
    };
}

export function computeZRange(states: any[]): number[] {
    const filteredStates = states.filter((state: any): any => state.objectType !== ObjectType.TAG);
    let minZ = filteredStates.length ? filteredStates[0].zOrder : 0;
    let maxZ = filteredStates.length ? filteredStates[0].zOrder : 0;
    filteredStates.forEach((state: any): void => {
        minZ = Math.min(minZ, state.zOrder);
        maxZ = Math.max(maxZ, state.zOrder);
    });

    return [minZ, maxZ];
}

export async function jobInfoGenerator(job: any): Promise<Record<string, number>> {
    const { total } = await job.annotations.statistics();
    return {
        'frame count': job.stopFrame - job.startFrame + 1,
        'track count':
            total.rectangle.shape +
            total.rectangle.track +
            total.polygon.shape +
            total.polygon.track +
            total.polyline.shape +
            total.polyline.track +
            total.points.shape +
            total.points.track +
            total.cuboid.shape +
            total.cuboid.track,
        'object count': total.total,
        'box count': total.rectangle.shape + total.rectangle.track,
        'polygon count': total.polygon.shape + total.polygon.track,
        'polyline count': total.polyline.shape + total.polyline.track,
        'points count': total.points.shape + total.points.track,
        'cuboids count': total.cuboid.shape + total.cuboid.track,
        'tag count': total.tag,
    };
}

export enum AnnotationActionTypes {
    GET_JOB = 'GET_JOB',
    GET_JOB_SUCCESS = 'GET_JOB_SUCCESS',
    GET_JOB_FAILED = 'GET_JOB_FAILED',
    CLOSE_JOB = 'CLOSE_JOB',
    CHANGE_FRAME = 'CHANGE_FRAME',
    CHANGE_FRAME_SUCCESS = 'CHANGE_FRAME_SUCCESS',
    CHANGE_FRAME_FAILED = 'CHANGE_FRAME_FAILED',
    SAVE_ANNOTATIONS = 'SAVE_ANNOTATIONS',
    SAVE_ANNOTATIONS_SUCCESS = 'SAVE_ANNOTATIONS_SUCCESS',
    SAVE_ANNOTATIONS_FAILED = 'SAVE_ANNOTATIONS_FAILED',
    SWITCH_PLAY = 'SWITCH_PLAY',
    CONFIRM_CANVAS_READY = 'CONFIRM_CANVAS_READY',
    DRAG_CANVAS = 'DRAG_CANVAS',
    ZOOM_CANVAS = 'ZOOM_CANVAS',
    SELECT_ISSUE_POSITION = 'SELECT_ISSUE_POSITION',
    MERGE_OBJECTS = 'MERGE_OBJECTS',
    GROUP_OBJECTS = 'GROUP_OBJECTS',
    SPLIT_TRACK = 'SPLIT_TRACK',
    COPY_SHAPE = 'COPY_SHAPE',
    PASTE_SHAPE = 'PASTE_SHAPE',
    EDIT_SHAPE = 'EDIT_SHAPE',
    REPEAT_DRAW_SHAPE = 'REPEAT_DRAW_SHAPE',
    SHAPE_DRAWN = 'SHAPE_DRAWN',
    RESET_CANVAS = 'RESET_CANVAS',
    REMEMBER_OBJECT = 'REMEMBER_OBJECT',
    UPDATE_ANNOTATIONS_SUCCESS = 'UPDATE_ANNOTATIONS_SUCCESS',
    UPDATE_ANNOTATIONS_FAILED = 'UPDATE_ANNOTATIONS_FAILED',
    CREATE_ANNOTATIONS_SUCCESS = 'CREATE_ANNOTATIONS_SUCCESS',
    CREATE_ANNOTATIONS_FAILED = 'CREATE_ANNOTATIONS_FAILED',
    MERGE_ANNOTATIONS_SUCCESS = 'MERGE_ANNOTATIONS_SUCCESS',
    MERGE_ANNOTATIONS_FAILED = 'MERGE_ANNOTATIONS_FAILED',
    RESET_ANNOTATIONS_GROUP = 'RESET_ANNOTATIONS_GROUP',
    GROUP_ANNOTATIONS = 'GROUP_ANNOTATIONS',
    GROUP_ANNOTATIONS_SUCCESS = 'GROUP_ANNOTATIONS_SUCCESS',
    GROUP_ANNOTATIONS_FAILED = 'GROUP_ANNOTATIONS_FAILED',
    SPLIT_ANNOTATIONS_SUCCESS = 'SPLIT_ANNOTATIONS_SUCCESS',
    SPLIT_ANNOTATIONS_FAILED = 'SPLIT_ANNOTATIONS_FAILED',
    COLLAPSE_SIDEBAR = 'COLLAPSE_SIDEBAR',
    COLLAPSE_APPEARANCE = 'COLLAPSE_APPEARANCE',
    COLLAPSE_OBJECT_ITEMS = 'COLLAPSE_OBJECT_ITEMS',
    ACTIVATE_OBJECT = 'ACTIVATE_OBJECT',
    REMOVE_OBJECT = 'REMOVE_OBJECT',
    REMOVE_OBJECT_SUCCESS = 'REMOVE_OBJECT_SUCCESS',
    REMOVE_OBJECT_FAILED = 'REMOVE_OBJECT_FAILED',
    PROPAGATE_OBJECT_SUCCESS = 'PROPAGATE_OBJECT_SUCCESS',
    PROPAGATE_OBJECT_FAILED = 'PROPAGATE_OBJECT_FAILED',
    SWITCH_PROPAGATE_VISIBILITY = 'SWITCH_PROPAGATE_VISIBILITY',
    SWITCH_SHOWING_STATISTICS = 'SWITCH_SHOWING_STATISTICS',
    SWITCH_SHOWING_FILTERS = 'SWITCH_SHOWING_FILTERS',
    COLLECT_STATISTICS = 'COLLECT_STATISTICS',
    COLLECT_STATISTICS_SUCCESS = 'COLLECT_STATISTICS_SUCCESS',
    COLLECT_STATISTICS_FAILED = 'COLLECT_STATISTICS_FAILED',
    UPLOAD_JOB_ANNOTATIONS = 'UPLOAD_JOB_ANNOTATIONS',
    UPLOAD_JOB_ANNOTATIONS_SUCCESS = 'UPLOAD_JOB_ANNOTATIONS_SUCCESS',
    UPLOAD_JOB_ANNOTATIONS_FAILED = 'UPLOAD_JOB_ANNOTATIONS_FAILED',
    REMOVE_JOB_ANNOTATIONS_SUCCESS = 'REMOVE_JOB_ANNOTATIONS_SUCCESS',
    REMOVE_JOB_ANNOTATIONS_FAILED = 'REMOVE_JOB_ANNOTATIONS_FAILED',
    UPDATE_CANVAS_CONTEXT_MENU = 'UPDATE_CANVAS_CONTEXT_MENU',
    UNDO_ACTION_SUCCESS = 'UNDO_ACTION_SUCCESS',
    UNDO_ACTION_FAILED = 'UNDO_ACTION_FAILED',
    REDO_ACTION_SUCCESS = 'REDO_ACTION_SUCCESS',
    REDO_ACTION_FAILED = 'REDO_ACTION_FAILED',
    CHANGE_ANNOTATIONS_FILTERS = 'CHANGE_ANNOTATIONS_FILTERS',
    FETCH_ANNOTATIONS_SUCCESS = 'FETCH_ANNOTATIONS_SUCCESS',
    FETCH_ANNOTATIONS_FAILED = 'FETCH_ANNOTATIONS_FAILED',
    ROTATE_FRAME = 'ROTATE_FRAME',
    SWITCH_Z_LAYER = 'SWITCH_Z_LAYER',
    ADD_Z_LAYER = 'ADD_Z_LAYER',
    SEARCH_ANNOTATIONS_FAILED = 'SEARCH_ANNOTATIONS_FAILED',
    SEARCH_EMPTY_FRAME_FAILED = 'SEARCH_EMPTY_FRAME_FAILED',
    CHANGE_WORKSPACE = 'CHANGE_WORKSPACE',
    SAVE_LOGS_SUCCESS = 'SAVE_LOGS_SUCCESS',
    SAVE_LOGS_FAILED = 'SAVE_LOGS_FAILED',
    INTERACT_WITH_CANVAS = 'INTERACT_WITH_CANVAS',
    GET_DATA_FAILED = 'GET_DATA_FAILED',
    SET_FORCE_EXIT_ANNOTATION_PAGE_FLAG = 'SET_FORCE_EXIT_ANNOTATION_PAGE_FLAG',
    SWITCH_NAVIGATION_BLOCKED = 'SWITCH_NAVIGATION_BLOCKED',
    DELETE_FRAME = 'DELETE_FRAME',
    DELETE_FRAME_SUCCESS = 'DELETE_FRAME_SUCCESS',
    DELETE_FRAME_FAILED = 'DELETE_FRAME_FAILED',
    RESTORE_FRAME = 'RESTORE_FRAME',
    RESTORE_FRAME_SUCCESS = 'RESTORE_FRAME_SUCCESS',
    RESTORE_FRAME_FAILED = 'RESTORE_FRAME_FAILED',
    UPDATE_BRUSH_TOOLS_CONFIG = 'UPDATE_BRUSH_TOOLS_CONFIG',
}

export function saveLogsAsync(): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>) => {
        try {
            await logger.save();
            dispatch({
                type: AnnotationActionTypes.SAVE_LOGS_SUCCESS,
                payload: {},
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SAVE_LOGS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function changeWorkspace(workspace: Workspace): AnyAction {
    return {
        type: AnnotationActionTypes.CHANGE_WORKSPACE,
        payload: {
            workspace,
        },
    };
}

export function getDataFailed(error: any): AnyAction {
    return {
        type: AnnotationActionTypes.GET_DATA_FAILED,
        payload: {
            error,
        },
    };
}

export function addZLayer(): AnyAction {
    return {
        type: AnnotationActionTypes.ADD_Z_LAYER,
        payload: {},
    };
}

export function switchZLayer(cur: number): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_Z_LAYER,
        payload: {
            cur,
        },
    };
}

export function fetchAnnotationsAsync(): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const {
                filters, frame, showAllInterpolationTracks, jobInstance,
            } = receiveAnnotationsParameters();
            const states = await jobInstance.annotations.get(frame, showAllInterpolationTracks, filters);
            const history = await jobInstance.actions.get();
            const [minZ, maxZ] = computeZRange(states);

            dispatch({
                type: AnnotationActionTypes.FETCH_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
                    history,
                    minZ,
                    maxZ,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.FETCH_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function changeAnnotationsFilters(filters: any[]): AnyAction {
    return {
        type: AnnotationActionTypes.CHANGE_ANNOTATIONS_FILTERS,
        payload: { filters },
    };
}

export function updateCanvasContextMenu(
    visible: boolean,
    left: number,
    top: number,
    pointID: number | null = null,
    type?: ContextMenuType,
): AnyAction {
    return {
        type: AnnotationActionTypes.UPDATE_CANVAS_CONTEXT_MENU,
        payload: {
            visible,
            left,
            top,
            type,
            pointID,
        },
    };
}

export function updateCanvasBrushTools(config: {
    visible?: boolean, left?: number, top?: number
}): AnyAction {
    return {
        type: AnnotationActionTypes.UPDATE_BRUSH_TOOLS_CONFIG,
        payload: config,
    };
}

export function removeAnnotationsAsync(
    startFrame: number, endFrame: number, delTrackKeyframesOnly: boolean,
): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const {
                filters, frame, showAllInterpolationTracks, jobInstance,
            } = receiveAnnotationsParameters();
            await jobInstance.annotations.clear(false, startFrame, endFrame, delTrackKeyframesOnly);
            await jobInstance.actions.clear();
            const history = await jobInstance.actions.get();
            const states = await jobInstance.annotations.get(frame, showAllInterpolationTracks, filters);

            dispatch({
                type: AnnotationActionTypes.REMOVE_JOB_ANNOTATIONS_SUCCESS,
                payload: {
                    history,
                    states,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.REMOVE_JOB_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function collectStatisticsAsync(sessionInstance: any): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch({
                type: AnnotationActionTypes.COLLECT_STATISTICS,
                payload: {},
            });

            const data = await sessionInstance.annotations.statistics();

            dispatch({
                type: AnnotationActionTypes.COLLECT_STATISTICS_SUCCESS,
                payload: {
                    data,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.COLLECT_STATISTICS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function showStatistics(visible: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_SHOWING_STATISTICS,
        payload: {
            visible,
        },
    };
}
export function showFilters(visible: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_SHOWING_FILTERS,
        payload: {
            visible,
        },
    };
}

export function switchPropagateVisibility(visible: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_PROPAGATE_VISIBILITY,
        payload: { visible },
    };
}

export function propagateObjectAsync(from: number, to: number): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>, getState): Promise<void> => {
        const state = getState();
        const {
            job: {
                instance: sessionInstance,
            },
            annotations: {
                activatedStateID,
                states: objectStates,
            },
        } = state.annotation;

        try {
            const objectState = objectStates.find((_state: any) => _state.clientID === activatedStateID);
            if (!objectState) {
                throw new Error('There is not an activated object state to be propagated');
            }

            const getCopyFromState = (_objectState: any): any => ({
                attributes: _objectState.attributes,
                points: _objectState.shapeType === 'skeleton' ? null : _objectState.points,
                occluded: _objectState.occluded,
                objectType: _objectState.objectType !== ObjectType.TRACK ? _objectState.objectType : ObjectType.SHAPE,
                shapeType: _objectState.shapeType,
                label: _objectState.label,
                zOrder: _objectState.zOrder,
                rotation: _objectState.rotation,
                frame: from,
                elements: _objectState.shapeType === 'skeleton' ? _objectState.elements
                    .map((element: any): any => getCopyFromState(element)) : [],
                source: _objectState.source,
            });

            const copy = getCopyFromState(objectState);
            await sessionInstance.logger.log(LogType.propagateObject, { count: Math.abs(to - from) });
            const states = [];
            const sign = Math.sign(to - from);
            for (let frame = from + sign; sign > 0 ? frame <= to : frame >= to; frame += sign) {
                copy.frame = frame;
                copy.elements.forEach((element: any) => { element.frame = frame; });
                const newState = new cvat.classes.ObjectState(copy);
                states.push(newState);
            }

            await sessionInstance.annotations.put(states);
            const history = await sessionInstance.actions.get();

            dispatch({
                type: AnnotationActionTypes.PROPAGATE_OBJECT_SUCCESS,
                payload: { history },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.PROPAGATE_OBJECT_FAILED,
                payload: { error },
            });
        }
    };
}

export function removeObjectAsync(sessionInstance: any, objectState: any, force: boolean): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            await sessionInstance.logger.log(LogType.deleteObject, { count: 1 });
            const { frame } = receiveAnnotationsParameters();

            const removed = await objectState.delete(frame, force);
            const history = await sessionInstance.actions.get();

            if (removed) {
                dispatch({
                    type: AnnotationActionTypes.REMOVE_OBJECT_SUCCESS,
                    payload: {
                        objectState,
                        history,
                    },
                });
            } else {
                throw new Error('Could not remove the locked object');
            }
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.REMOVE_OBJECT_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function removeObject(objectState: any, force: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.REMOVE_OBJECT,
        payload: {
            objectState,
            force,
        },
    };
}

export function editShape(enabled: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.EDIT_SHAPE,
        payload: {
            enabled,
        },
    };
}

export function copyShape(objectState: any): AnyAction {
    const job = getStore().getState().annotation.job.instance;
    job.logger.log(LogType.copyObject, { count: 1 });

    return {
        type: AnnotationActionTypes.COPY_SHAPE,
        payload: {
            objectState,
        },
    };
}

export function activateObject(
    activatedStateID: number | null,
    activatedElementID: number | null,
    activatedAttributeID: number | null,
): AnyAction {
    return {
        type: AnnotationActionTypes.ACTIVATE_OBJECT,
        payload: {
            activatedStateID,
            activatedElementID,
            activatedAttributeID,
        },
    };
}

export function collapseSidebar(): AnyAction {
    return {
        type: AnnotationActionTypes.COLLAPSE_SIDEBAR,
        payload: {},
    };
}

export function collapseAppearance(): AnyAction {
    return {
        type: AnnotationActionTypes.COLLAPSE_APPEARANCE,
        payload: {},
    };
}

export function collapseObjectItems(states: any[], collapsed: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.COLLAPSE_OBJECT_ITEMS,
        payload: {
            states,
            collapsed,
        },
    };
}

export function switchPlay(playing: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_PLAY,
        payload: {
            playing,
        },
    };
}

export function confirmCanvasReady(): AnyAction {
    return {
        type: AnnotationActionTypes.CONFIRM_CANVAS_READY,
        payload: {},
    };
}

export function changeFrameAsync(
    toFrame: number,
    fillBuffer?: boolean,
    frameStep?: number,
    forceUpdate?: boolean,
): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>, getState: () => CombinedState): Promise<void> => {
        const state: CombinedState = getState();
        const { instance: job } = state.annotation.job;
        const {
            propagate: {
                visible: propagateVisible,
            },
            statistics: {
                visible: statisticsVisible,
            },
        } = state.annotation;
        const { filters, frame, showAllInterpolationTracks } = receiveAnnotationsParameters();

        try {
            if (toFrame < job.startFrame || toFrame > job.stopFrame) {
                throw Error(`Required frame ${toFrame} is out of the current job`);
            }

            const abortAction = (): void => {
                const currentState = getState();
                dispatch({
                    type: AnnotationActionTypes.CHANGE_FRAME_SUCCESS,
                    payload: {
                        number: currentState.annotation.player.frame.number,
                        data: currentState.annotation.player.frame.data,
                        filename: currentState.annotation.player.frame.filename,
                        relatedFiles: currentState.annotation.player.frame.relatedFiles,
                        delay: currentState.annotation.player.frame.delay,
                        changeTime: currentState.annotation.player.frame.changeTime,
                        states: currentState.annotation.annotations.states,
                        minZ: currentState.annotation.annotations.zLayer.min,
                        maxZ: currentState.annotation.annotations.zLayer.max,
                        curZ: currentState.annotation.annotations.zLayer.cur,
                    },
                });

                dispatch(confirmCanvasReady());
            };

            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME,
                payload: {},
            });

            if (toFrame === frame && !forceUpdate) {
                abortAction();
                return;
            }

            const data = await job.frames.get(toFrame, fillBuffer, frameStep);
            const states = await job.annotations.get(toFrame, showAllInterpolationTracks, filters);

            if (!isAbleToChangeFrame() || statisticsVisible || propagateVisible) {
                // while doing async actions above, canvas can become used by a user in another way
                // so, we need an additional check and if it is used, we do not update state
                abortAction();
                return;
            }

            // commit the latest job frame to local storage
            localStorage.setItem(`Job_${job.id}_frame`, `${toFrame}`);
            await job.logger.log(LogType.changeFrame, {
                from: frame,
                to: toFrame,
            });

            const [minZ, maxZ] = computeZRange(states);
            const currentTime = new Date().getTime();
            let frameSpeed;
            switch (state.settings.player.frameSpeed) {
                case FrameSpeed.Fast: {
                    frameSpeed = (FrameSpeed.Fast as number) / 2;
                    break;
                }
                case FrameSpeed.Fastest: {
                    frameSpeed = (FrameSpeed.Fastest as number) / 3;
                    break;
                }
                default: {
                    frameSpeed = state.settings.player.frameSpeed as number;
                }
            }
            const delay = Math.max(
                0,
                Math.round(1000 / frameSpeed) - currentTime + (state.annotation.player.frame.changeTime as number),
            );

            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME_SUCCESS,
                payload: {
                    number: toFrame,
                    data,
                    filename: data.filename,
                    relatedFiles: data.relatedFiles,
                    states,
                    minZ,
                    maxZ,
                    curZ: maxZ,
                    changeTime: currentTime + delay,
                    delay,
                },
            });
        } catch (error) {
            if (error !== 'not needed') {
                dispatch({
                    type: AnnotationActionTypes.CHANGE_FRAME_FAILED,
                    payload: {
                        number: toFrame,
                        error,
                    },
                });
            }
        }
    };
}

export function undoActionAsync(sessionInstance: any, frame: number): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const state = getStore().getState();
            const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();

            // TODO: use affected IDs as an optimization
            const [undo] = state.annotation.annotations.history.undo.slice(-1);
            const undoLog = await sessionInstance.logger.log(
                LogType.undoAction,
                {
                    name: undo[0],
                    frame: undo[1],
                    count: 1,
                },
                true,
            );

            await sessionInstance.actions.undo();
            const history = await sessionInstance.actions.get();
            const states = await sessionInstance.annotations.get(frame, showAllInterpolationTracks, filters);
            const frameData = await sessionInstance.frames.get(frame);
            const [minZ, maxZ] = computeZRange(states);
            await undoLog.close();

            dispatch({
                type: AnnotationActionTypes.UNDO_ACTION_SUCCESS,
                payload: {
                    history,
                    states,
                    minZ,
                    maxZ,
                    frameData,
                },
            });

            const undoOnFrame = undo[1];
            if (frame !== undoOnFrame || ['Removed frame', 'Restored frame'].includes(undo[0])) {
                dispatch(changeFrameAsync(undoOnFrame, undefined, undefined, true));
            }
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.UNDO_ACTION_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function redoActionAsync(sessionInstance: any, frame: number): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const state = getStore().getState();
            const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();

            // TODO: use affected IDs as an optimization
            const [redo] = state.annotation.annotations.history.redo.slice(-1);
            const redoLog = await sessionInstance.logger.log(
                LogType.redoAction,
                {
                    name: redo[0],
                    frame: redo[1],
                    count: 1,
                },
                true,
            );

            await sessionInstance.actions.redo();
            const history = await sessionInstance.actions.get();
            const states = await sessionInstance.annotations.get(frame, showAllInterpolationTracks, filters);
            const [minZ, maxZ] = computeZRange(states);
            const frameData = await sessionInstance.frames.get(frame);
            await redoLog.close();
            dispatch({
                type: AnnotationActionTypes.REDO_ACTION_SUCCESS,
                payload: {
                    history,
                    states,
                    minZ,
                    maxZ,
                    frameData,
                },
            });

            const redoOnFrame = redo[1];

            if (frame !== redoOnFrame || ['Removed frame', 'Restored frame'].includes(redo[0])) {
                dispatch(changeFrameAsync(redoOnFrame, undefined, undefined, true));
            }
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.REDO_ACTION_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function rotateCurrentFrame(rotation: Rotation): AnyAction {
    const state: CombinedState = getStore().getState();
    const {
        annotation: {
            player: {
                frame: { number: frameNumber },
                frameAngles,
            },
            job: {
                instance: job,
                instance: { startFrame },
            },
        },
        settings: {
            player: { rotateAll },
        },
    } = state;

    const frameAngle = (frameAngles[frameNumber - startFrame] + (rotation === Rotation.CLOCKWISE90 ? 90 : 270)) % 360;

    job.logger.log(LogType.rotateImage, { angle: frameAngle });

    return {
        type: AnnotationActionTypes.ROTATE_FRAME,
        payload: {
            offset: frameNumber - state.annotation.job.instance.startFrame,
            angle: frameAngle,
            rotateAll,
        },
    };
}

export function dragCanvas(enabled: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.DRAG_CANVAS,
        payload: {
            enabled,
        },
    };
}

export function zoomCanvas(enabled: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.ZOOM_CANVAS,
        payload: {
            enabled,
        },
    };
}

export function resetCanvas(): AnyAction {
    return {
        type: AnnotationActionTypes.RESET_CANVAS,
        payload: {},
    };
}

export function closeJob(): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const { jobInstance } = receiveAnnotationsParameters();
        if (jobInstance) {
            await jobInstance.close();
        }

        dispatch({
            type: AnnotationActionTypes.CLOSE_JOB,
        });
    };
}

export function getJobAsync(
    tid: number, jid: number, initialFrame: number | null, initialFilters: object[],
): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>, getState): Promise<void> => {
        try {
            const state = getState();
            const filters = initialFilters;
            const {
                settings: {
                    workspace: { showAllInterpolationTracks },
                    player: { showDeletedFrames },
                },
            } = state;

            dispatch({
                type: AnnotationActionTypes.GET_JOB,
                payload: {
                    requestedId: jid,
                },
            });

            if (!Number.isInteger(tid) || !Number.isInteger(jid)) {
                throw new Error('Requested resource id is not valid');
            }

            const loadJobEvent = await logger.log(
                LogType.loadJob,
                {
                    task_id: tid,
                    job_id: jid,
                },
                true,
            );

            const [job] = await cvat.jobs.get({ jobID: jid });
            // navigate to correct first frame according to setup
            let frameNumber;
            if (initialFrame === null && !showDeletedFrames) {
                frameNumber = (await job.frames.search(
                    { notDeleted: true }, job.startFrame, job.stopFrame,
                )) || job.startFrame;
            } else {
                frameNumber = Math.max(Math.min(job.stopFrame, initialFrame || 0), job.startFrame);
            }

            const frameData = await job.frames.get(frameNumber);
            // call first getting of frame data before rendering interface
            // to load and decode first chunk
            try {
                await frameData.data();
            } catch (error) {
                dispatch({
                    type: AnnotationActionTypes.GET_DATA_FAILED,
                    payload: {
                        error,
                    },
                });
            }
            const states = await job.annotations.get(frameNumber, showAllInterpolationTracks, filters);
            const issues = await job.issues();
            const [minZ, maxZ] = computeZRange(states);
            const colors = [...cvat.enums.colors];

            loadJobEvent.close(await jobInfoGenerator(job));

            const openTime = Date.now();
            dispatch({
                type: AnnotationActionTypes.GET_JOB_SUCCESS,
                payload: {
                    openTime,
                    job,
                    issues,
                    states,
                    frameNumber,
                    frameFilename: frameData.filename,
                    relatedFiles: frameData.relatedFiles,
                    frameData,
                    colors,
                    filters,
                    minZ,
                    maxZ,
                },
            });

            if (job.dimension === DimensionType.DIMENSION_3D) {
                const workspace = Workspace.STANDARD3D;
                dispatch(changeWorkspace(workspace));
            }

            dispatch(changeFrameAsync(frameNumber, false));
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.GET_JOB_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function saveAnnotationsAsync(sessionInstance: any, afterSave?: () => void): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();

        dispatch({
            type: AnnotationActionTypes.SAVE_ANNOTATIONS,
            payload: {},
        });

        try {
            const saveJobEvent = await sessionInstance.logger.log(LogType.saveJob, {}, true);

            await sessionInstance.frames.save();
            await sessionInstance.annotations.save();
            await saveJobEvent.close();
            dispatch(saveLogsAsync());

            const { frame } = receiveAnnotationsParameters();
            const states = await sessionInstance.annotations.get(frame, showAllInterpolationTracks, filters);
            if (typeof afterSave === 'function') {
                afterSave();
            }

            if (sessionInstance instanceof cvat.classes.Job && sessionInstance.state === cvat.enums.JobState.NEW) {
                sessionInstance.state = cvat.enums.JobState.IN_PROGRESS;
                dispatch(updateJobAsync(sessionInstance));
            }

            dispatch({
                type: AnnotationActionTypes.SAVE_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SAVE_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

// used to reproduce the latest drawing (in case of tags just creating) by using N
export function rememberObject(createParams: {
    activeObjectType?: ObjectType;
    activeLabelID?: number;
    activeShapeType?: ShapeType;
    activeNumOfPoints?: number;
    activeRectDrawingMethod?: RectDrawingMethod;
    activeCuboidDrawingMethod?: CuboidDrawingMethod;
}): AnyAction {
    return {
        type: AnnotationActionTypes.REMEMBER_OBJECT,
        payload: createParams,
    };
}

export function shapeDrawn(): AnyAction {
    return {
        type: AnnotationActionTypes.SHAPE_DRAWN,
        payload: {},
    };
}

export function selectIssuePosition(enabled: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SELECT_ISSUE_POSITION,
        payload: {
            enabled,
        },
    };
}

export function mergeObjects(enabled: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.MERGE_OBJECTS,
        payload: {
            enabled,
        },
    };
}

export function groupObjects(enabled: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.GROUP_OBJECTS,
        payload: {
            enabled,
        },
    };
}

export function splitTrack(enabled: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SPLIT_TRACK,
        payload: {
            enabled,
        },
    };
}

export function updateAnnotationsAsync(statesToUpdate: any[]): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const {
            jobInstance, filters, frame, showAllInterpolationTracks,
        } = receiveAnnotationsParameters();

        try {
            if (statesToUpdate.some((state: any): boolean => state.updateFlags.zOrder)) {
                // deactivate object to visualize changes immediately (UX)
                dispatch(activateObject(null, null, null));
            }

            const promises = statesToUpdate.map((objectState: any): Promise<any> => objectState.save());
            const states = await Promise.all(promises);

            const needToUpdateAll = states
                .some((state: any) => state.shapeType === ShapeType.MASK || state.parentID !== null);
            if (needToUpdateAll) {
                dispatch(fetchAnnotationsAsync());
                return;
            }

            const history = await jobInstance.actions.get();
            const [minZ, maxZ] = computeZRange(states);

            dispatch({
                type: AnnotationActionTypes.UPDATE_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
                    history,
                    minZ,
                    maxZ,
                },
            });
        } catch (error) {
            const states = await jobInstance.annotations.get(frame, showAllInterpolationTracks, filters);
            dispatch({
                type: AnnotationActionTypes.UPDATE_ANNOTATIONS_FAILED,
                payload: {
                    error,
                    states,
                },
            });
        }
    };
}

export function createAnnotationsAsync(sessionInstance: any, frame: number, statesToCreate: any[]): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();
            await sessionInstance.annotations.put(statesToCreate);
            const states = await sessionInstance.annotations.get(frame, showAllInterpolationTracks, filters);
            const history = await sessionInstance.actions.get();

            dispatch({
                type: AnnotationActionTypes.CREATE_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
                    history,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.CREATE_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function mergeAnnotationsAsync(sessionInstance: any, frame: number, statesToMerge: any[]): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();
            await sessionInstance.annotations.merge(statesToMerge);
            const states = await sessionInstance.annotations.get(frame, showAllInterpolationTracks, filters);
            const history = await sessionInstance.actions.get();

            dispatch({
                type: AnnotationActionTypes.MERGE_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
                    history,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.MERGE_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function resetAnnotationsGroup(): AnyAction {
    return {
        type: AnnotationActionTypes.RESET_ANNOTATIONS_GROUP,
        payload: {},
    };
}

export function groupAnnotationsAsync(sessionInstance: any, frame: number, statesToGroup: any[]): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();
            const reset = getStore().getState().annotation.annotations.resetGroupFlag;

            // The action below set resetFlag to false
            dispatch({
                type: AnnotationActionTypes.GROUP_ANNOTATIONS,
                payload: {},
            });

            await sessionInstance.annotations.group(statesToGroup, reset);
            const states = await sessionInstance.annotations.get(frame, showAllInterpolationTracks, filters);
            const history = await sessionInstance.actions.get();

            dispatch({
                type: AnnotationActionTypes.GROUP_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
                    history,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.GROUP_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function splitAnnotationsAsync(sessionInstance: any, frame: number, stateToSplit: any): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();
        try {
            await sessionInstance.annotations.split(stateToSplit, frame);
            const states = await sessionInstance.annotations.get(frame, showAllInterpolationTracks, filters);
            const history = await sessionInstance.actions.get();

            dispatch({
                type: AnnotationActionTypes.SPLIT_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
                    history,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SPLIT_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function changeGroupColorAsync(group: number, color: string): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const state: CombinedState = getStore().getState();
        const groupStates = state.annotation.annotations.states.filter(
            (_state: any): boolean => _state.group.id === group,
        );

        for (const objectState of groupStates) {
            objectState.group.color = color;
        }

        dispatch(updateAnnotationsAsync(groupStates));
    };
}

export function searchAnnotationsAsync(sessionInstance: any, frameFrom: number, frameTo: number): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>, getState): Promise<void> => {
        try {
            const {
                settings: {
                    player: { showDeletedFrames },
                },
                annotation: {
                    annotations: { filters },
                },
            } = getState();

            const sign = Math.sign(frameTo - frameFrom);
            let frame = await sessionInstance.annotations.search(filters, frameFrom, frameTo);
            while (frame !== null) {
                const isDeleted = (await sessionInstance.frames.get(frame)).deleted;
                if (!isDeleted || showDeletedFrames) {
                    break;
                } else if (sign > 0 ? frame < frameTo : frame > frameTo) {
                    frame = await sessionInstance.annotations.search(filters, frame + sign, frameTo);
                } else {
                    frame = null;
                }
            }
            if (frame !== null) {
                dispatch(changeFrameAsync(frame));
            }
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SEARCH_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function searchEmptyFrameAsync(sessionInstance: any, frameFrom: number, frameTo: number): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>, getState): Promise<void> => {
        try {
            const {
                settings: {
                    player: { showDeletedFrames },
                },
            } = getState();

            const sign = Math.sign(frameTo - frameFrom);
            let frame = await sessionInstance.annotations.searchEmpty(frameFrom, frameTo);
            while (frame !== null) {
                const isDeleted = (await sessionInstance.frames.get(frame)).deleted;
                if (!isDeleted || showDeletedFrames) {
                    break;
                } else if (sign > 0 ? frame < frameTo : frame > frameTo) {
                    frame = await sessionInstance.annotations.searchEmpty(frame + sign, frameTo);
                } else {
                    frame = null;
                }
            }
            if (frame !== null) {
                dispatch(changeFrameAsync(frame));
            }
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SEARCH_EMPTY_FRAME_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

const ShapeTypeToControl: Record<ShapeType, ActiveControl> = {
    [ShapeType.RECTANGLE]: ActiveControl.DRAW_RECTANGLE,
    [ShapeType.POLYLINE]: ActiveControl.DRAW_POLYLINE,
    [ShapeType.POLYGON]: ActiveControl.DRAW_POLYGON,
    [ShapeType.POINTS]: ActiveControl.DRAW_POINTS,
    [ShapeType.CUBOID]: ActiveControl.DRAW_CUBOID,
    [ShapeType.ELLIPSE]: ActiveControl.DRAW_ELLIPSE,
    [ShapeType.SKELETON]: ActiveControl.DRAW_SKELETON,
    [ShapeType.MASK]: ActiveControl.DRAW_MASK,
};

export function pasteShapeAsync(): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const {
            canvas: { instance: canvasInstance },
            job: { instance: jobInstance },
            player: {
                frame: { number: frameNumber },
            },
            drawing: { activeInitialState: initialState },
        } = getStore().getState().annotation;

        if (initialState && canvasInstance) {
            const activeControl = ShapeTypeToControl[initialState.shapeType as ShapeType] || ActiveControl.CURSOR;

            canvasInstance.cancel();
            dispatch({
                type: AnnotationActionTypes.PASTE_SHAPE,
                payload: {
                    activeControl,
                },
            });

            if (initialState.objectType === ObjectType.TAG) {
                const objectState = new cvat.classes.ObjectState({
                    objectType: ObjectType.TAG,
                    label: initialState.label,
                    attributes: initialState.attributes,
                    frame: frameNumber,
                });
                dispatch(createAnnotationsAsync(jobInstance, frameNumber, [objectState]));
            } else {
                canvasInstance.draw({
                    enabled: true,
                    initialState,
                    ...(initialState.shapeType === ShapeType.SKELETON ?
                        { skeletonSVG: initialState.label.structure.svg } : {}),
                });
            }
        }
    };
}

export function interactWithCanvas(activeInteractor: MLModel | OpenCVTool, activeLabelID: number): AnyAction {
    return {
        type: AnnotationActionTypes.INTERACT_WITH_CANVAS,
        payload: {
            activeInteractor,
            activeLabelID,
        },
    };
}

export function repeatDrawShapeAsync(): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const {
            canvas: { instance: canvasInstance },
            annotations: { states },
            job: { labels, instance: jobInstance },
            player: {
                frame: { number: frameNumber },
            },
            drawing: {
                activeInteractor,
                activeObjectType,
                activeLabelID,
                activeShapeType,
                activeNumOfPoints,
                activeRectDrawingMethod,
                activeCuboidDrawingMethod,
            },
        } = getStore().getState().annotation;

        let activeControl = ActiveControl.CURSOR;
        if (activeInteractor && canvasInstance instanceof Canvas) {
            if (activeInteractor.kind.includes('tracker')) {
                canvasInstance.interact({
                    enabled: true,
                    shapeType: 'rectangle',
                });
                dispatch(interactWithCanvas(activeInteractor, activeLabelID));
                dispatch(switchToolsBlockerState({ buttonVisible: false }));
            } else {
                canvasInstance.interact({
                    enabled: true,
                    shapeType: 'points',
                    ...activeInteractor.params.canvas,
                });
                dispatch(interactWithCanvas(activeInteractor, activeLabelID));
            }

            return;
        }

        activeControl = ShapeTypeToControl[activeShapeType];

        dispatch({
            type: AnnotationActionTypes.REPEAT_DRAW_SHAPE,
            payload: {
                activeControl,
            },
        });

        if (canvasInstance instanceof Canvas) {
            canvasInstance.cancel();
        }

        const [activeLabel] = labels.filter((label: any) => label.id === activeLabelID);
        if (!activeLabel) {
            throw new Error(`Label with ID ${activeLabelID}, was not found`);
        }

        if (activeObjectType === ObjectType.TAG) {
            const tags = states.filter((objectState: any): boolean => objectState.objectType === ObjectType.TAG);
            if (tags.every((objectState: any): boolean => objectState.label.id !== activeLabelID)) {
                const objectState = new cvat.classes.ObjectState({
                    objectType: ObjectType.TAG,
                    label: labels.filter((label: any) => label.id === activeLabelID)[0],
                    frame: frameNumber,
                });
                dispatch(createAnnotationsAsync(jobInstance, frameNumber, [objectState]));
            }
        } else if (canvasInstance) {
            canvasInstance.draw({
                enabled: true,
                rectDrawingMethod: activeRectDrawingMethod,
                cuboidDrawingMethod: activeCuboidDrawingMethod,
                numberOfPoints: activeNumOfPoints,
                shapeType: activeShapeType,
                crosshair: [ShapeType.RECTANGLE, ShapeType.CUBOID, ShapeType.ELLIPSE].includes(activeShapeType),
                skeletonSVG: activeShapeType === ShapeType.SKELETON ? activeLabel.structure.svg : undefined,
            });
        }
    };
}

export function redrawShapeAsync(): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const {
            annotations: { activatedStateID, states },
            canvas: { instance: canvasInstance },
        } = getStore().getState().annotation;

        if (activatedStateID !== null) {
            const [state] = states.filter((_state: any): boolean => _state.clientID === activatedStateID);
            if (state && state.objectType !== ObjectType.TAG) {
                const activeControl = ShapeTypeToControl[state.shapeType as ShapeType] || ActiveControl.CURSOR;
                dispatch({
                    type: AnnotationActionTypes.REPEAT_DRAW_SHAPE,
                    payload: {
                        activeControl,
                    },
                });

                if (canvasInstance instanceof Canvas) {
                    canvasInstance.cancel();
                }

                canvasInstance.draw({
                    skeletonSVG: state.shapeType === ShapeType.SKELETON ? state.label.structure.svg : undefined,
                    enabled: true,
                    redraw: activatedStateID,
                    shapeType: state.shapeType,
                    crosshair: [ShapeType.RECTANGLE, ShapeType.CUBOID, ShapeType.ELLIPSE].includes(state.shapeType),
                });
            }
        }
    };
}

export function setForceExitAnnotationFlag(forceExit: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SET_FORCE_EXIT_ANNOTATION_PAGE_FLAG,
        payload: {
            forceExit,
        },
    };
}

export function switchNavigationBlocked(navigationBlocked: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_NAVIGATION_BLOCKED,
        payload: {
            navigationBlocked,
        },
    };
}

export function deleteFrameAsync(frame: number): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const state: CombinedState = getStore().getState();
        const {
            annotation: {
                annotations: { filters },
                job: {
                    instance: jobInstance,
                },
                canvas: {
                    instance: canvasInstance,
                },
            },
            settings: {
                player: { showDeletedFrames },
                workspace: { showAllInterpolationTracks },
            },
        } = state;

        try {
            dispatch({ type: AnnotationActionTypes.DELETE_FRAME });

            if (canvasInstance &&
                canvasInstance.mode() !== Canvas2DMode.IDLE &&
                canvasInstance.mode() !== Canvas3DMode.IDLE) {
                canvasInstance.cancel();
            }
            await jobInstance.frames.delete(frame);
            dispatch({
                type: AnnotationActionTypes.DELETE_FRAME_SUCCESS,
                payload: {
                    data: await jobInstance.frames.get(frame),
                    history: await jobInstance.actions.get(),
                    states: await jobInstance.annotations.get(frame, showAllInterpolationTracks, filters),
                },
            });

            if (!showDeletedFrames) {
                let notDeletedFrame = await jobInstance.frames.search(
                    { notDeleted: true }, frame, jobInstance.stopFrame,
                );
                if (notDeletedFrame === null && jobInstance.startFrame !== frame) {
                    notDeletedFrame = await jobInstance.frames.search(
                        { notDeleted: true }, frame, jobInstance.startFrame,
                    );
                }
                if (notDeletedFrame !== null) {
                    dispatch(changeFrameAsync(notDeletedFrame));
                }
            }
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.DELETE_FRAME_FAILED,
                payload: { error },
            });
        }
    };
}

export function restoreFrameAsync(frame: number): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const state: CombinedState = getStore().getState();
        const {
            annotation: {
                job: {
                    instance: jobInstance,
                },
                annotations: { filters },
            },
            settings: {
                workspace: { showAllInterpolationTracks },
            },
        } = state;

        try {
            dispatch({ type: AnnotationActionTypes.RESTORE_FRAME });

            await jobInstance.frames.restore(frame);
            dispatch({
                type: AnnotationActionTypes.RESTORE_FRAME_SUCCESS,
                payload: {
                    data: await jobInstance.frames.get(frame),
                    history: await jobInstance.actions.get(),
                    states: await jobInstance.annotations.get(frame, showAllInterpolationTracks, filters),
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.RESTORE_FRAME_FAILED,
                payload: { error },
            });
        }
    };
}
