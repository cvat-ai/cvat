// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction, Store } from 'redux';
import { ThunkAction, ThunkDispatch } from 'utils/redux';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import { CanvasMode as Canvas3DMode } from 'cvat-canvas3d-wrapper';
import {
    RectDrawingMethod, CuboidDrawingMethod, Canvas, CanvasMode as Canvas2DMode,
} from 'cvat-canvas-wrapper';
import {
    getCore, MLModel, JobType, Job, QualityConflict,
    ObjectState, JobState, JobValidationLayout,
} from 'cvat-core-wrapper';
import logger, { EventScope } from 'cvat-logger';
import { getCVATStore } from 'cvat-store';

import {
    ActiveControl,
    CombinedState,
    ContextMenuType,
    FrameSpeed,
    NavigationType,
    ObjectType,
    OpenCVTool,
    Rotation,
    ShapeType,
    Workspace,
} from 'reducers';
import { switchToolsBlockerState } from './settings-actions';

interface AnnotationsParameters {
    filters: object[];
    frame: number;
    showAllInterpolationTracks: boolean;
    showGroundTruth: boolean;
    jobInstance: Job;
    groundTruthInstance: Job | null;
    validationLayout: JobValidationLayout | null;
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
    const state: CombinedState = getStore().getState();
    const {
        annotation: {
            annotations: { filters },
            player: {
                frame: { number: frame },
            },
            job: { instance: jobInstance, groundTruthInfo: { groundTruthInstance, validationLayout } },
        },
        settings: {
            workspace: { showAllInterpolationTracks },
            shapes: { showGroundTruth },
        },
    } = state;

    return {
        filters,
        frame,
        jobInstance: jobInstance as Job,
        groundTruthInstance,
        validationLayout,
        showAllInterpolationTracks,
        showGroundTruth,
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

export enum AnnotationActionTypes {
    GET_JOB = 'GET_JOB',
    GET_JOB_SUCCESS = 'GET_JOB_SUCCESS',
    GET_JOB_FAILED = 'GET_JOB_FAILED',
    UPDATE_CURRENT_JOB_FAILED = 'UPDATE_CURRENT_JOB_FAILED',
    CLOSE_JOB = 'CLOSE_JOB',
    CHANGE_FRAME = 'CHANGE_FRAME',
    CHANGE_FRAME_SUCCESS = 'CHANGE_FRAME_SUCCESS',
    CHANGE_FRAME_FAILED = 'CHANGE_FRAME_FAILED',
    SAVE_ANNOTATIONS = 'SAVE_ANNOTATIONS',
    SAVE_ANNOTATIONS_SUCCESS = 'SAVE_ANNOTATIONS_SUCCESS',
    SAVE_ANNOTATIONS_FAILED = 'SAVE_ANNOTATIONS_FAILED',
    SWITCH_PLAY = 'SWITCH_PLAY',
    CONFIRM_CANVAS_READY = 'CONFIRM_CANVAS_READY',

    UPDATE_ACTIVE_CONTROL = 'UPDATE_ACTIVE_CONTROL',

    COPY_SHAPE = 'COPY_SHAPE',
    PASTE_SHAPE = 'PASTE_SHAPE',
    REPEAT_DRAW_SHAPE = 'REPEAT_DRAW_SHAPE',
    RESET_CANVAS = 'RESET_CANVAS',
    REMEMBER_OBJECT = 'REMEMBER_OBJECT',
    UPDATE_ANNOTATIONS_SUCCESS = 'UPDATE_ANNOTATIONS_SUCCESS',
    UPDATE_ANNOTATIONS_FAILED = 'UPDATE_ANNOTATIONS_FAILED',
    CREATE_ANNOTATIONS_FAILED = 'CREATE_ANNOTATIONS_FAILED',
    MERGE_ANNOTATIONS_FAILED = 'MERGE_ANNOTATIONS_FAILED',
    RESET_ANNOTATIONS_GROUP = 'RESET_ANNOTATIONS_GROUP',
    GROUP_ANNOTATIONS = 'GROUP_ANNOTATIONS',
    GROUP_ANNOTATIONS_FAILED = 'GROUP_ANNOTATIONS_FAILED',
    JOIN_ANNOTATIONS_FAILED = 'JOIN_ANNOTATIONS_FAILED',
    SLICE_ANNOTATIONS_FAILED = 'SLICE_ANNOTATIONS_FAILED',
    SPLIT_ANNOTATIONS_FAILED = 'SPLIT_ANNOTATIONS_FAILED',
    COLLAPSE_SIDEBAR = 'COLLAPSE_SIDEBAR',
    COLLAPSE_APPEARANCE = 'COLLAPSE_APPEARANCE',
    COLLAPSE_OBJECT_ITEMS = 'COLLAPSE_OBJECT_ITEMS',
    ACTIVATE_OBJECT = 'ACTIVATE_OBJECT',
    UPDATE_EDITED_STATE = 'UPDATE_EDITED_STATE',
    HIDE_ACTIVE_OBJECT = 'HIDE_ACTIVE_OBJECT',
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
    UNDO_ACTION_FAILED = 'UNDO_ACTION_FAILED',
    REDO_ACTION_FAILED = 'REDO_ACTION_FAILED',
    CHANGE_ANNOTATIONS_FILTERS = 'CHANGE_ANNOTATIONS_FILTERS',
    FETCH_ANNOTATIONS_SUCCESS = 'FETCH_ANNOTATIONS_SUCCESS',
    FETCH_ANNOTATIONS_FAILED = 'FETCH_ANNOTATIONS_FAILED',
    ROTATE_FRAME = 'ROTATE_FRAME',
    SWITCH_Z_LAYER = 'SWITCH_Z_LAYER',
    ADD_Z_LAYER = 'ADD_Z_LAYER',
    SEARCH_ANNOTATIONS_FAILED = 'SEARCH_ANNOTATIONS_FAILED',
    CHANGE_WORKSPACE = 'CHANGE_WORKSPACE',
    SAVE_LOGS_SUCCESS = 'SAVE_LOGS_SUCCESS',
    SAVE_LOGS_FAILED = 'SAVE_LOGS_FAILED',
    INTERACT_WITH_CANVAS = 'INTERACT_WITH_CANVAS',
    GET_DATA_FAILED = 'GET_DATA_FAILED',
    CANVAS_ERROR_OCCURRED = 'CANVAS_ERROR_OCCURRED',
    SET_FORCE_EXIT_ANNOTATION_PAGE_FLAG = 'SET_FORCE_EXIT_ANNOTATION_PAGE_FLAG',
    SWITCH_NAVIGATION_BLOCKED = 'SWITCH_NAVIGATION_BLOCKED',
    SET_NAVIGATION_TYPE = 'SET_NAVIGATION_TYPE',
    DELETE_FRAME = 'DELETE_FRAME',
    DELETE_FRAME_SUCCESS = 'DELETE_FRAME_SUCCESS',
    DELETE_FRAME_FAILED = 'DELETE_FRAME_FAILED',
    RESTORE_FRAME = 'RESTORE_FRAME',
    RESTORE_FRAME_SUCCESS = 'RESTORE_FRAME_SUCCESS',
    RESTORE_FRAME_FAILED = 'RESTORE_FRAME_FAILED',
    UPDATE_BRUSH_TOOLS_CONFIG = 'UPDATE_BRUSH_TOOLS_CONFIG',
    HIGHLIGHT_CONFLICT = 'HIGHLIGHT_CONFCLICT',
}

export function saveLogsAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch) => {
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

export function getDataFailed(error: Error): AnyAction {
    return {
        type: AnnotationActionTypes.GET_DATA_FAILED,
        payload: {
            error,
        },
    };
}

export function canvasErrorOccurred(error: Error): AnyAction {
    return {
        type: AnnotationActionTypes.CANVAS_ERROR_OCCURRED,
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

export function highlightConflict(conflict: QualityConflict | null): AnyAction {
    return {
        type: AnnotationActionTypes.HIGHLIGHT_CONFLICT,
        payload: {
            conflict,
        },
    };
}

function wrapAnnotationsInGTJob(states: ObjectState[]): ObjectState[] {
    return states.map((state: ObjectState) => new Proxy(state, {
        get(_state, prop) {
            if (prop === 'isGroundTruth') {
                // ground truth objects are not considered as gt objects, relatively to a gt jobs
                // to avoid extra css styles, or restrictions applied
                return false;
            }

            return Reflect.get(_state, prop);
        },
    }));
}

async function fetchAnnotations(predefinedFrame?: number): Promise<{
    states: CombinedState['annotation']['annotations']['states'];
    history: CombinedState['annotation']['annotations']['history'];
    minZ: number;
    maxZ: number;
}> {
    const {
        filters, frame, showAllInterpolationTracks, jobInstance,
        showGroundTruth, groundTruthInstance, validationLayout,
    } = receiveAnnotationsParameters();

    const fetchFrame = typeof predefinedFrame === 'undefined' ? frame : predefinedFrame;
    let states = await jobInstance.annotations.get(fetchFrame, showAllInterpolationTracks, filters);
    const [minZ, maxZ] = computeZRange(states);

    if (jobInstance.type === JobType.GROUND_TRUTH) {
        states = wrapAnnotationsInGTJob(states);
    } else if (showGroundTruth && groundTruthInstance) {
        let gtFrame: number | null = fetchFrame;

        if (validationLayout) {
            gtFrame = await validationLayout.getRealFrame(gtFrame);
        }

        if (gtFrame !== null) {
            const gtStates = await groundTruthInstance.annotations.get(gtFrame, showAllInterpolationTracks, filters);
            states.push(...gtStates);
        }
    }

    const history = await jobInstance.actions.get();

    return {
        states,
        history,
        minZ,
        maxZ,
    };
}

export function fetchAnnotationsAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const {
                states, history, minZ, maxZ,
            } = await fetchAnnotations();

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

export function changeAnnotationsFilters(filters: object[]): AnyAction {
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
    startFrame: number, stopFrame: number, delTrackKeyframesOnly: boolean,
): ThunkAction {
    return async (dispatch: ThunkDispatch, getState: () => CombinedState): Promise<void> => {
        try {
            const { jobInstance } = receiveAnnotationsParameters();
            await jobInstance.annotations.clear({
                reload: false,
                startFrame,
                stopFrame,
                delTrackKeyframesOnly,
            });
            await jobInstance.actions.clear();
            dispatch(fetchAnnotationsAsync());

            const state = getState();
            if (!state.annotation.job.groundTruthInfo.groundTruthInstance) {
                getCore().config.globalObjectsCounter = 0;
            }

            dispatch({
                type: AnnotationActionTypes.REMOVE_JOB_ANNOTATIONS_SUCCESS,
                payload: {},
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

export function collectStatisticsAsync(sessionInstance: NonNullable<CombinedState['annotation']['job']['instance']>): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
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
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const state = getState();
        const {
            job: {
                instance: sessionInstance,
                frameNumbers,
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

            if (!sessionInstance) {
                throw new Error('SessionInstance is not defined, propagation is not possible');
            }

            const states = cvat.utils.propagateShapes<ObjectState>([objectState], from, to, frameNumbers);
            if (states.length) {
                await sessionInstance.logger.log(EventScope.propagateObject, { count: states.length });
                await sessionInstance.annotations.put(states);
            }

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

export function removeObjectAsync(objectState: ObjectState, force: boolean): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const { frame, jobInstance } = receiveAnnotationsParameters();
            await jobInstance.logger.log(EventScope.deleteObject, { count: 1 });

            const removed = await objectState.delete(frame, force);
            const history = await jobInstance.actions.get();

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

export function copyShape(objectState: any): AnyAction {
    const job = getStore().getState().annotation.job.instance;
    job?.logger.log(EventScope.copyObject, { count: 1 });

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

function confirmCanvasReady(ranges?: string): AnyAction {
    return {
        type: AnnotationActionTypes.CONFIRM_CANVAS_READY,
        payload: { ranges },
    };
}

export function confirmCanvasReadyAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch, getState: () => CombinedState): Promise<void> => {
        try {
            const state: CombinedState = getState();
            const job = state.annotation.job.instance as Job;
            const includedFrames = state.annotation.job.frameNumbers;
            const { changeFrameEvent } = state.annotation.player.frame;
            const chunks = await job.frames.cachedChunks() as number[];
            const { frameCount, dataChunkSize } = job;

            const ranges = chunks.map((chunk) => (
                [
                    includedFrames[chunk * dataChunkSize],
                    includedFrames[Math.min(frameCount - 1, (chunk + 1) * dataChunkSize - 1)],
                ]
            )).reduce<Array<[number, number]>>((acc, val) => {
                if (acc.length && acc[acc.length - 1][1] + 1 === val[0]) {
                    const newMax = val[1];
                    acc[acc.length - 1][1] = newMax;
                } else {
                    acc.push(val as [number, number]);
                }
                return acc;
            }, []).map(([start, end]) => `${start}:${end}`).join(';');

            dispatch(confirmCanvasReady(ranges));
            await changeFrameEvent?.close();
        } catch (error) {
            // even if error happens here, do not need to notify the users
            dispatch(confirmCanvasReady());
        }
    };
}

export function changeFrameAsync(
    toFrame: number,
    fillBuffer?: boolean,
    frameStep?: number,
    forceUpdate?: boolean,
): ThunkAction {
    return async (dispatch: ThunkDispatch, getState: () => CombinedState): Promise<void> => {
        const { jobInstance: job, frame } = receiveAnnotationsParameters();
        const state: CombinedState = getState();
        const {
            propagate: {
                visible: propagateVisible,
            },
            statistics: {
                visible: statisticsVisible,
            },
        } = state.annotation;

        try {
            if (toFrame < job.startFrame || toFrame > job.stopFrame) {
                throw Error(`Required frame ${toFrame} is out of the current job`);
            }

            if (toFrame === frame && !forceUpdate) {
                return;
            }

            if (!isAbleToChangeFrame(toFrame) || statisticsVisible || propagateVisible) {
                return;
            }

            const data = await job.frames.get(toFrame, fillBuffer, frameStep);

            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME,
                payload: {},
            });

            const changeFrameEvent = await job.logger.log(EventScope.changeFrame, {
                from: frame,
                to: toFrame,
                step: toFrame - frame,
                count: 1,
            }, true);

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

            const {
                states, maxZ, minZ, history,
            } = await fetchAnnotations(toFrame);
            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME_SUCCESS,
                payload: {
                    number: toFrame,
                    data,
                    filename: data.filename,
                    relatedFiles: data.relatedFiles,
                    states,
                    history,
                    minZ,
                    maxZ,
                    curZ: maxZ,
                    changeTime: currentTime + delay,
                    delay,
                    changeFrameEvent,
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

export function undoActionAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const state = getStore().getState();
            const { jobInstance, frame } = receiveAnnotationsParameters();

            // TODO: use affected IDs as an optimization
            const [undo] = state.annotation.annotations.history.undo.slice(-1);
            const undoOnFrame = undo[1];
            const undoLog = await jobInstance.logger.log(
                EventScope.undoAction,
                {
                    name: undo[0],
                    frame: undo[1],
                    count: 1,
                },
                true,
            );

            await jobInstance.actions.undo();
            await undoLog.close();

            if (frame !== undoOnFrame || ['Removed frame', 'Restored frame'].includes(undo[0])) {
                // the action below fetches annotations
                dispatch(changeFrameAsync(undoOnFrame, undefined, undefined, true));
            } else {
                dispatch(fetchAnnotationsAsync());
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

export function redoActionAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const state = getStore().getState();
            const { jobInstance, frame } = receiveAnnotationsParameters();

            // TODO: use affected IDs as an optimization
            const [redo] = state.annotation.annotations.history.redo.slice(-1);
            const redoOnFrame = redo[1];
            const redoLog = await jobInstance.logger.log(
                EventScope.redoAction,
                {
                    name: redo[0],
                    frame: redo[1],
                    count: 1,
                },
                true,
            );

            await jobInstance.actions.redo();
            await redoLog.close();

            if (frame !== redoOnFrame || ['Removed frame', 'Restored frame'].includes(redo[0])) {
                // the action below fetches annotations
                dispatch(changeFrameAsync(redoOnFrame, undefined, undefined, true));
            } else {
                dispatch(fetchAnnotationsAsync());
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

    job.logger.log(EventScope.rotateImage);

    return {
        type: AnnotationActionTypes.ROTATE_FRAME,
        payload: {
            offset: frameNumber - state.annotation.job.instance.startFrame,
            angle: frameAngle,
            rotateAll,
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
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const state = getState();
        const { instance: canvasInstance } = state.annotation.canvas;
        const { jobInstance, groundTruthInstance } = receiveAnnotationsParameters();

        if (groundTruthInstance) {
            await groundTruthInstance.close();
        }

        if (jobInstance) {
            await jobInstance.close();
        }

        if (canvasInstance) {
            canvasInstance.destroy();
        }

        dispatch({
            type: AnnotationActionTypes.CLOSE_JOB,
        });
    };
}

export function getJobAsync({
    taskID, jobID, initialFrame, initialFilters, queryParameters,
}: {
    taskID: number;
    jobID: number;
    initialFrame: number | null;
    initialFilters: object[];
    queryParameters: {
        initialOpenGuide: boolean;
        initialWorkspace: Workspace | null;
        defaultLabel: string | null;
        defaultPointsCount: number | null;
    }
}): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        try {
            const state = getState();
            const filters = initialFilters;

            const {
                settings: {
                    player: { showDeletedFrames },
                },
            } = state;

            dispatch({
                type: AnnotationActionTypes.GET_JOB,
                payload: {
                    requestedId: jobID,
                },
            });

            if (!Number.isInteger(taskID) || !Number.isInteger(jobID)) {
                throw new Error('Requested resource id is not valid');
            }

            const start = Date.now();

            getCore().config.globalObjectsCounter = 0;
            const [job] = await cvat.jobs.get({ jobID });
            let gtJob: Job | null = null;
            if (job.type === JobType.ANNOTATION) {
                try {
                    [gtJob] = await cvat.jobs.get({ taskID, type: JobType.GROUND_TRUTH });
                } catch (e) {
                    // gtJob is not available for workers
                    // do nothing
                }
            }

            // frame query parameter does not work for GT job
            const frameNumber = Number.isInteger(initialFrame) && gtJob?.id !== job.id ?
                initialFrame as number :
                (await job.frames.search(
                    { notDeleted: !showDeletedFrames }, job.startFrame, job.stopFrame,
                )) || job.startFrame;

            const frameData = await job.frames.get(frameNumber);
            const jobMeta = await cvat.frames.getMeta('job', job.id);
            const frameNumbers = await job.frames.frameNumbers();
            try {
                // call first getting of frame data before rendering interface
                // to load and decode first chunk
                await frameData.data();
            } catch (error) {
                // do nothing, user will be notified when data request is done
            }

            await job.annotations.clear({ reload: true });

            const issues = await job.issues();
            const colors = [...cvat.enums.colors];

            let groundTruthJobFramesMeta = null;
            let validationLayout = null;
            if (gtJob) {
                await gtJob.annotations.clear({ reload: true }); // fetch gt annotations from the server
                groundTruthJobFramesMeta = await cvat.frames.getMeta('job', gtJob.id);
                validationLayout = await job.validationLayout();
            }

            let conflicts: QualityConflict[] = [];
            if (gtJob) {
                const [report] = await cvat.analytics.quality.reports({ jobID: job.id, target: 'job' });
                if (report) {
                    conflicts = await cvat.analytics.quality.conflicts({ reportID: report.id });
                }
            }

            await job.logger.log(EventScope.loadJob, { duration: Date.now() - start });

            const openTime = Date.now();
            dispatch({
                type: AnnotationActionTypes.GET_JOB_SUCCESS,
                payload: {
                    openTime,
                    job,
                    frameNumbers,
                    jobMeta,
                    queryParameters,
                    groundTruthInstance: gtJob || null,
                    groundTruthJobFramesMeta,
                    validationLayout,
                    issues,
                    conflicts,
                    frameNumber,
                    frameFilename: frameData.filename,
                    relatedFiles: frameData.relatedFiles,
                    frameData,
                    colors,
                    filters,
                },
            });

            dispatch(fetchAnnotationsAsync());
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

export function updateCurrentJobAsync(
    jobFieldsToUpdate: {
        state?: JobState;
    },
): ThunkAction {
    return async (dispatch: ThunkDispatch) => {
        const { jobInstance } = receiveAnnotationsParameters();
        try {
            await jobInstance.save(jobFieldsToUpdate);
        } catch (error: unknown) {
            dispatch({
                type: AnnotationActionTypes.UPDATE_CURRENT_JOB_FAILED,
                payload: { error },
            });

            throw error;
        }
    };
}

export function saveAnnotationsAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const { jobInstance } = receiveAnnotationsParameters();

        dispatch({
            type: AnnotationActionTypes.SAVE_ANNOTATIONS,
            payload: {},
        });

        try {
            const saveJobEvent = await jobInstance.logger.log(EventScope.saveJob, {}, true);

            await jobInstance.frames.save();
            await jobInstance.annotations.save();
            await saveJobEvent.close();
            dispatch(saveLogsAsync());

            if (jobInstance instanceof cvat.classes.Job && jobInstance.state === cvat.enums.JobState.NEW) {
                await dispatch(updateCurrentJobAsync({ state: JobState.IN_PROGRESS }));
            }

            dispatch({
                type: AnnotationActionTypes.SAVE_ANNOTATIONS_SUCCESS,
                payload: {},
            });

            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SAVE_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });

            throw error;
        }
    };
}

export function finishCurrentJobAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch, getState) => {
        const state = getState();
        const beforeCallbacks = state.plugins.callbacks.annotationPage.header.menu.beforeJobFinish;
        const { jobInstance } = receiveAnnotationsParameters();

        await dispatch(saveAnnotationsAsync());

        for await (const callback of beforeCallbacks) {
            await callback();
        }

        if (jobInstance.state !== JobState.COMPLETED) {
            await dispatch(updateCurrentJobAsync({ state: JobState.COMPLETED }));
        }
    };
}

// used to reproduce the latest drawing (in case of tags just creating) by using N
export function rememberObject(createParams: {
    activeObjectType?: ObjectType;
    activeLabelID?: number;
    activeShapeType?: ShapeType | null;
    activeNumOfPoints?: number;
    activeRectDrawingMethod?: RectDrawingMethod;
    activeCuboidDrawingMethod?: CuboidDrawingMethod;
}, updateCurrentControl = true): AnyAction {
    return {
        type: AnnotationActionTypes.REMEMBER_OBJECT,
        payload: { ...createParams, updateCurrentControl },
    };
}

export function updateActiveControl(activeControl: ActiveControl): AnyAction {
    return {
        type: AnnotationActionTypes.UPDATE_ACTIVE_CONTROL,
        payload: {
            activeControl,
        },
    };
}

export function updateAnnotationsAsync(statesToUpdate: any[]): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const { jobInstance } = receiveAnnotationsParameters();

        try {
            if (statesToUpdate.some((state: any): boolean => state.updateFlags.zOrder)) {
                // deactivate object to visualize changes immediately (UX)
                dispatch(activateObject(null, null, null));
            }

            const promises = statesToUpdate.map((objectState: any): Promise<any> => objectState.save());
            let states = await Promise.all(promises);

            if (jobInstance.type === JobType.GROUND_TRUTH) {
                states = wrapAnnotationsInGTJob(states);
            }

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
            dispatch({
                type: AnnotationActionTypes.UPDATE_ANNOTATIONS_FAILED,
                payload: { error },
            });
            dispatch(fetchAnnotationsAsync());
        }
    };
}

export function createAnnotationsAsync(statesToCreate: any[]): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const { jobInstance } = receiveAnnotationsParameters();
            await jobInstance.annotations.put(statesToCreate);
            dispatch(fetchAnnotationsAsync());
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

export function mergeAnnotationsAsync(statesToMerge: any[]): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const { jobInstance } = receiveAnnotationsParameters();
            await jobInstance.annotations.merge(statesToMerge);
            dispatch(fetchAnnotationsAsync());
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

export function groupAnnotationsAsync(statesToGroup: any[]): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const { jobInstance } = receiveAnnotationsParameters();
            const reset = getStore().getState().annotation.annotations.resetGroupFlag;

            // The action below set resetFlag to false
            dispatch({
                type: AnnotationActionTypes.GROUP_ANNOTATIONS,
                payload: {},
            });

            await jobInstance.annotations.group(statesToGroup, reset);
            dispatch(fetchAnnotationsAsync());
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

export function joinAnnotationsAsync(
    statesToJoin: CombinedState['annotation']['annotations']['states'],
    points: number[],
): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const { jobInstance } = receiveAnnotationsParameters();

            await jobInstance.annotations.join(statesToJoin, points);
            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.JOIN_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function sliceAnnotationsAsync(
    state: CombinedState['annotation']['annotations']['states'][0],
    results: number[][],
): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const { jobInstance } = receiveAnnotationsParameters();
            await jobInstance.annotations.slice(state, results);
            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SLICE_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function splitAnnotationsAsync(state: CombinedState['annotation']['annotations']['states'][0]): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const { jobInstance, frame } = receiveAnnotationsParameters();
        try {
            await jobInstance.annotations.split(state, frame);
            dispatch(fetchAnnotationsAsync());
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
    return async (dispatch: ThunkDispatch): Promise<void> => {
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

export function searchAnnotationsAsync(
    sessionInstance: NonNullable<CombinedState['annotation']['job']['instance']>,
    frameFrom: number,
    frameTo: number,
    generalFilters?: {
        isEmptyFrame: boolean;
    },
): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        try {
            const {
                settings: {
                    player: { showDeletedFrames },
                },
                annotation: {
                    annotations: { filters },
                },
            } = getState();

            const frame = await sessionInstance.annotations
                .search(
                    frameFrom,
                    frameTo,
                    {
                        allowDeletedFrames: showDeletedFrames,
                        ...(
                            generalFilters ? { generalFilters } : { annotationsFilters: filters }
                        ),
                    },
                );
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

export const ShapeTypeToControl: Record<ShapeType, ActiveControl> = {
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
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const {
            canvas: { instance: canvasInstance },
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
                dispatch(createAnnotationsAsync([objectState]));
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

export function interactWithCanvas(
    activeInteractor: MLModel | OpenCVTool,
    activeLabelID: number,
    activeInteractorParameters: MLModel['params']['canvas'],
): AnyAction {
    return {
        type: AnnotationActionTypes.INTERACT_WITH_CANVAS,
        payload: {
            activeInteractor,
            activeLabelID,
            activeInteractorParameters,
        },
    };
}

export function repeatDrawShapeAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const {
            canvas: { instance: canvasInstance },
            annotations: { states },
            job: { labels },
            player: {
                frame: { number: frameNumber },
            },
            drawing: {
                activeInteractor,
                activeInteractorParameters,
                activeObjectType,
                activeLabelID,
                activeShapeType,
                activeNumOfPoints,
                activeRectDrawingMethod,
                activeCuboidDrawingMethod,
            },
        } = getStore().getState().annotation;

        let activeControl = ActiveControl.CURSOR;
        if (activeInteractor && activeInteractorParameters && activeLabelID && canvasInstance instanceof Canvas) {
            if (activeInteractor.kind.includes('tracker')) {
                canvasInstance.interact({
                    enabled: true,
                    shapeType: 'rectangle',
                });
                dispatch(interactWithCanvas(activeInteractor, activeLabelID, {}));
                dispatch(switchToolsBlockerState({ buttonVisible: false }));
            } else {
                canvasInstance.interact({
                    enabled: true,
                    shapeType: 'points',
                    ...activeInteractorParameters,
                });
                dispatch(interactWithCanvas(activeInteractor, activeLabelID, activeInteractorParameters));
            }

            return;
        }

        if (activeObjectType !== ObjectType.TAG) {
            activeControl = ShapeTypeToControl[activeShapeType];
        }

        if (canvasInstance instanceof Canvas) {
            canvasInstance.cancel();
        }

        dispatch({
            type: AnnotationActionTypes.REPEAT_DRAW_SHAPE,
            payload: {
                activeControl,
            },
        });

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
                dispatch(createAnnotationsAsync([objectState]));
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
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const {
            annotations: { activatedStateID, states },
            canvas: { instance: canvasInstance },
        } = getStore().getState().annotation;

        if (activatedStateID !== null) {
            const [state] = states.filter((_state: any): boolean => _state.clientID === activatedStateID);
            if (state && state.objectType !== ObjectType.TAG) {
                const activeControl = ShapeTypeToControl[state.shapeType as ShapeType] || ActiveControl.CURSOR;
                if (canvasInstance instanceof Canvas) {
                    canvasInstance.cancel();
                }

                dispatch({
                    type: AnnotationActionTypes.REPEAT_DRAW_SHAPE,
                    payload: {
                        activeControl,
                    },
                });

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

export function setNavigationType(navigationType: NavigationType): AnyAction {
    return {
        type: AnnotationActionTypes.SET_NAVIGATION_TYPE,
        payload: {
            navigationType,
        },
    };
}

export function deleteFrameAsync(frame: number): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const { jobInstance } = receiveAnnotationsParameters();
        const state: CombinedState = getStore().getState();
        const {
            annotation: {
                canvas: {
                    instance: canvasInstance,
                },
            },
            settings: {
                player: { showDeletedFrames },
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
                },
            });
            dispatch(fetchAnnotationsAsync());
            let notDeletedFrame = await jobInstance.frames.search(
                { notDeleted: !showDeletedFrames }, frame, jobInstance.stopFrame,
            );
            if (notDeletedFrame === null && jobInstance.startFrame !== frame) {
                notDeletedFrame = await jobInstance.frames.search(
                    { notDeleted: !showDeletedFrames }, frame, jobInstance.startFrame,
                );
            }
            if (notDeletedFrame !== null) {
                dispatch(changeFrameAsync(notDeletedFrame));
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
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const { jobInstance } = receiveAnnotationsParameters();

        try {
            dispatch({ type: AnnotationActionTypes.RESTORE_FRAME });

            await jobInstance.frames.restore(frame);
            dispatch({
                type: AnnotationActionTypes.RESTORE_FRAME_SUCCESS,
                payload: {
                    data: await jobInstance.frames.get(frame),
                },
            });
            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.RESTORE_FRAME_FAILED,
                payload: { error },
            });
        }
    };
}

export function changeHideActiveObjectAsync(hide: boolean): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const state = getState();
        const { instance: canvas } = state.annotation.canvas;
        if (canvas) {
            (canvas as Canvas).configure({
                hideEditedObject: hide,
            });

            const { objectState } = state.annotation.editing;
            if (objectState) {
                objectState.hidden = hide;
                await dispatch(updateAnnotationsAsync([objectState]));
            }

            dispatch({
                type: AnnotationActionTypes.HIDE_ACTIVE_OBJECT,
                payload: {
                    hide,
                },
            });
        }
    };
}

export function updateEditedStateAsync(objectState: ObjectState | null): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        let newActiveObjectHidden = false;
        if (objectState) {
            newActiveObjectHidden = objectState.hidden;
        }

        dispatch({
            type: AnnotationActionTypes.UPDATE_EDITED_STATE,
            payload: {
                objectState,
            },
        });

        const state = getState();
        const { activeObjectHidden } = state.annotation.canvas;
        if (activeObjectHidden !== newActiveObjectHidden) {
            dispatch(changeHideActiveObjectAsync(newActiveObjectHidden));
        }
    };
}
