// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import {
    AnyAction,
    Dispatch,
    ActionCreator,
    Store,
} from 'redux';
import { ThunkAction } from 'redux-thunk';

import {
    CombinedState,
    ActiveControl,
    ShapeType,
    ObjectType,
    Task,
    FrameSpeed,
    Rotation,
    Workspace,
} from 'reducers/interfaces';

import getCore from 'cvat-core';
import logger, { LogType } from 'cvat-logger';
import { RectDrawingMethod } from 'cvat-canvas';
import { getCVATStore } from 'cvat-store';

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

function receiveAnnotationsParameters(): AnnotationsParameters {
    if (store === null) {
        store = getCVATStore();
    }

    const state: CombinedState = getStore().getState();
    const {
        annotation: {
            annotations: {
                filters,
            },
            player: {
                frame: {
                    number: frame,
                },
            },
            job: {
                instance: jobInstance,
            },
        },
        settings: {
            workspace: {
                showAllInterpolationTracks,
            },
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
    let minZ = states.length ? states[0].zOrder : 0;
    let maxZ = states.length ? states[0].zOrder : 0;
    states.forEach((state: any): void => {
        if (state.objectType === ObjectType.TAG) {
            return;
        }

        minZ = Math.min(minZ, state.zOrder);
        maxZ = Math.max(maxZ, state.zOrder);
    });

    return [minZ, maxZ];
}

async function jobInfoGenerator(job: any): Promise<Record<string, number>> {
    const { total } = await job.annotations.statistics();
    return {
        'frame count': job.stopFrame - job.startFrame + 1,
        'track count': total.rectangle.shape + total.rectangle.track
            + total.polygon.shape + total.polygon.track
            + total.polyline.shape + total.polyline.track
            + total.points.shape + total.points.track,
        'object count': total.total,
        'box count': total.rectangle.shape + total.rectangle.track,
        'polygon count': total.polygon.shape + total.polygon.track,
        'polyline count': total.polyline.shape + total.polyline.track,
        'points count': total.points.shape + total.points.track,
        'tag count': total.tags,
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
    SAVE_UPDATE_ANNOTATIONS_STATUS = 'SAVE_UPDATE_ANNOTATIONS_STATUS',
    SWITCH_PLAY = 'SWITCH_PLAY',
    CONFIRM_CANVAS_READY = 'CONFIRM_CANVAS_READY',
    DRAG_CANVAS = 'DRAG_CANVAS',
    ZOOM_CANVAS = 'ZOOM_CANVAS',
    MERGE_OBJECTS = 'MERGE_OBJECTS',
    GROUP_OBJECTS = 'GROUP_OBJECTS',
    SPLIT_TRACK = 'SPLIT_TRACK',
    COPY_SHAPE = 'COPY_SHAPE',
    PASTE_SHAPE = 'PASTE_SHAPE',
    EDIT_SHAPE = 'EDIT_SHAPE',
    REPEAT_DRAW_SHAPE = 'REPEAT_DRAW_SHAPE',
    SHAPE_DRAWN = 'SHAPE_DRAWN',
    RESET_CANVAS = 'RESET_CANVAS',
    REMEMBER_CREATED_OBJECT = 'REMEMBER_CREATED_OBJECT',
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
    CHANGE_LABEL_COLOR_SUCCESS = 'CHANGE_LABEL_COLOR_SUCCESS',
    CHANGE_LABEL_COLOR_FAILED = 'CHANGE_LABEL_COLOR_FAILED',
    UPDATE_TAB_CONTENT_HEIGHT = 'UPDATE_TAB_CONTENT_HEIGHT',
    COLLAPSE_SIDEBAR = 'COLLAPSE_SIDEBAR',
    COLLAPSE_APPEARANCE = 'COLLAPSE_APPEARANCE',
    COLLAPSE_OBJECT_ITEMS = 'COLLAPSE_OBJECT_ITEMS',
    ACTIVATE_OBJECT = 'ACTIVATE_OBJECT',
    SELECT_OBJECTS = 'SELECT_OBJECTS',
    REMOVE_OBJECT_SUCCESS = 'REMOVE_OBJECT_SUCCESS',
    REMOVE_OBJECT_FAILED = 'REMOVE_OBJECT_FAILED',
    PROPAGATE_OBJECT = 'PROPAGATE_OBJECT',
    PROPAGATE_OBJECT_SUCCESS = 'PROPAGATE_OBJECT_SUCCESS',
    PROPAGATE_OBJECT_FAILED = 'PROPAGATE_OBJECT_FAILED',
    CHANGE_PROPAGATE_FRAMES = 'CHANGE_PROPAGATE_FRAMES',
    SWITCH_SHOWING_STATISTICS = 'SWITCH_SHOWING_STATISTICS',
    COLLECT_STATISTICS = 'COLLECT_STATISTICS',
    COLLECT_STATISTICS_SUCCESS = 'COLLECT_STATISTICS_SUCCESS',
    COLLECT_STATISTICS_FAILED = 'COLLECT_STATISTICS_FAILED',
    CHANGE_JOB_STATUS = 'CHANGE_JOB_STATUS',
    CHANGE_JOB_STATUS_SUCCESS = 'CHANGE_JOB_STATUS_SUCCESS',
    CHANGE_JOB_STATUS_FAILED = 'CHANGE_JOB_STATUS_FAILED',
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
    CHANGE_WORKSPACE = 'CHANGE_WORKSPACE',
    SAVE_LOGS_SUCCESS = 'SAVE_LOGS_SUCCESS',
    SAVE_LOGS_FAILED = 'SAVE_LOGS_FAILED',
}

export function saveLogsAsync():
ThunkAction<Promise<void>, {}, {}, AnyAction> {
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

export function fetchAnnotationsAsync(): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const {
                filters,
                frame,
                showAllInterpolationTracks,
                jobInstance,
            } = receiveAnnotationsParameters();
            const states = await jobInstance.annotations
                .get(frame, showAllInterpolationTracks, filters);
            const [minZ, maxZ] = computeZRange(states);

            dispatch({
                type: AnnotationActionTypes.FETCH_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
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

export function changeAnnotationsFilters(filters: string[]): AnyAction {
    const state: CombinedState = getStore().getState();
    const { filtersHistory, filters: oldFilters } = state.annotation.annotations;

    filters.forEach((element: string) => {
        if (!(filtersHistory.includes(element) || oldFilters.includes(element))) {
            filtersHistory.push(element);
        }
    });

    window.localStorage.setItem('filtersHistory', JSON.stringify(filtersHistory.slice(-10)));

    return {
        type: AnnotationActionTypes.CHANGE_ANNOTATIONS_FILTERS,
        payload: {
            filters,
            filtersHistory: filtersHistory.slice(-10),
        },
    };
}

export function undoActionAsync(sessionInstance: any, frame: number):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const state = getStore().getState();
            const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();

            // TODO: use affected IDs as an optimization
            const [undoName] = state.annotation.annotations.history.undo.slice(-1);
            const undoLog = await sessionInstance.logger.log(LogType.undoAction, {
                name: undoName,
                count: 1,
            }, true);
            await sessionInstance.actions.undo();
            const history = await sessionInstance.actions.get();
            const states = await sessionInstance.annotations
                .get(frame, showAllInterpolationTracks, filters);
            const [minZ, maxZ] = computeZRange(states);
            await undoLog.close();

            dispatch({
                type: AnnotationActionTypes.UNDO_ACTION_SUCCESS,
                payload: {
                    history,
                    states,
                    minZ,
                    maxZ,
                },
            });
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

export function redoActionAsync(sessionInstance: any, frame: number):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const state = getStore().getState();
            const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();

            // TODO: use affected IDs as an optimization
            const [redoName] = state.annotation.annotations.history.redo.slice(-1);
            const redoLog = await sessionInstance.logger.log(LogType.redoAction, {
                name: redoName,
                count: 1,
            }, true);
            await sessionInstance.actions.redo();
            const history = await sessionInstance.actions.get();
            const states = await sessionInstance.annotations
                .get(frame, showAllInterpolationTracks, filters);
            const [minZ, maxZ] = computeZRange(states);
            await redoLog.close();

            dispatch({
                type: AnnotationActionTypes.REDO_ACTION_SUCCESS,
                payload: {
                    history,
                    states,
                    minZ,
                    maxZ,
                },
            });
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

export function updateCanvasContextMenu(visible: boolean, left: number, top: number): AnyAction {
    return {
        type: AnnotationActionTypes.UPDATE_CANVAS_CONTEXT_MENU,
        payload: {
            visible,
            left,
            top,
        },
    };
}

export function removeAnnotationsAsync(sessionInstance: any):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            await sessionInstance.annotations.clear();
            await sessionInstance.actions.clear();
            const history = await sessionInstance.actions.get();

            dispatch({
                type: AnnotationActionTypes.REMOVE_JOB_ANNOTATIONS_SUCCESS,
                payload: {
                    history,
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

export function uploadJobAnnotationsAsync(job: any, loader: any, file: File):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const state: CombinedState = getStore().getState();
            const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();

            if (state.tasks.activities.loads[job.task.id]) {
                throw Error('Annotations is being uploaded for the task');
            }
            if (state.annotation.activities.loads[job.id]) {
                throw Error('Only one uploading of annotations for a job allowed at the same time');
            }

            dispatch({
                type: AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS,
                payload: {
                    job,
                    loader,
                },
            });

            const frame = state.annotation.player.frame.number;
            await job.annotations.upload(file, loader);

            await job.logger.log(
                LogType.uploadAnnotations, {
                    ...(await jobInfoGenerator(job)),
                },
            );

            // One more update to escape some problems
            // in canvas when shape with the same
            // clientID has different type (polygon, rectangle) for example
            dispatch({
                type: AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_SUCCESS,
                payload: {
                    job,
                    states: [],
                },
            });

            await job.annotations.clear(true);
            await job.actions.clear();
            const history = await job.actions.get();
            const states = await job.annotations.get(frame, showAllInterpolationTracks, filters);

            setTimeout(() => {
                dispatch({
                    type: AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_SUCCESS,
                    payload: {
                        history,
                        job,
                        states,
                    },
                });
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_FAILED,
                payload: {
                    job,
                    error,
                },
            });
        }
    };
}

export function changeJobStatusAsync(jobInstance: any, status: string):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const oldStatus = jobInstance.status;
        try {
            dispatch({
                type: AnnotationActionTypes.CHANGE_JOB_STATUS,
                payload: {},
            });

            // eslint-disable-next-line no-param-reassign
            jobInstance.status = status;
            await jobInstance.save();

            dispatch({
                type: AnnotationActionTypes.CHANGE_JOB_STATUS_SUCCESS,
                payload: {},
            });
        } catch (error) {
            // eslint-disable-next-line no-param-reassign
            jobInstance.status = oldStatus;
            dispatch({
                type: AnnotationActionTypes.CHANGE_JOB_STATUS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function collectStatisticsAsync(sessionInstance: any):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
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

export function propagateObjectAsync(
    sessionInstance: any,
    objectState: any,
    from: number,
    to: number,
): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const copy = {
                attributes: objectState.attributes,
                points: objectState.points,
                occluded: objectState.occluded,
                objectType: objectState.objectType !== ObjectType.TRACK
                    ? objectState.objectType : ObjectType.SHAPE,
                shapeType: objectState.shapeType,
                label: objectState.label,
                zOrder: objectState.zOrder,
                frame: from,
            };

            await sessionInstance.logger.log(
                LogType.propagateObject, { count: to - from + 1 },
            );
            const states = [];
            for (let frame = from; frame <= to; frame++) {
                copy.frame = frame;
                const newState = new cvat.classes.ObjectState(copy);
                states.push(newState);
            }

            await sessionInstance.annotations.put(states);
            const history = await sessionInstance.actions.get();

            dispatch({
                type: AnnotationActionTypes.PROPAGATE_OBJECT_SUCCESS,
                payload: {
                    objectState,
                    history,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.PROPAGATE_OBJECT_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function propagateObject(objectState: any | null): AnyAction {
    return {
        type: AnnotationActionTypes.PROPAGATE_OBJECT,
        payload: {
            objectState,
        },
    };
}

export function changePropagateFrames(frames: number): AnyAction {
    return {
        type: AnnotationActionTypes.CHANGE_PROPAGATE_FRAMES,
        payload: {
            frames,
        },
    };
}

export function removeObjectAsync(sessionInstance: any, objectState: any, force: boolean):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            await sessionInstance.logger.log(LogType.deleteObject, { count: 1 });
            const removed = await objectState.delete(force);
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
                throw new Error('Could not remove the object. Is it locked?');
            }
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.REMOVE_OBJECT_FAILED,
                payload: {
                    objectState,
                },
            });
        }
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

export function selectObjects(selectedStatesID: number[]): AnyAction {
    return {
        type: AnnotationActionTypes.SELECT_OBJECTS,
        payload: {
            selectedStatesID,
        },
    };
}

export function activateObject(
    activatedStateID: number | null,
    activatedAttributeID: number | null,
): AnyAction {
    return {
        type: AnnotationActionTypes.ACTIVATE_OBJECT,
        payload: {
            activatedStateID,
            activatedAttributeID,
        },
    };
}

export function updateTabContentHeight(tabContentHeight: number): AnyAction {
    return {
        type: AnnotationActionTypes.UPDATE_TAB_CONTENT_HEIGHT,
        payload: {
            tabContentHeight,
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

export function changeFrameAsync(toFrame: number):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const state: CombinedState = getStore().getState();
        const { instance: job } = state.annotation.job;
        const { filters, frame, showAllInterpolationTracks } = receiveAnnotationsParameters();

        try {
            if (toFrame < job.startFrame || toFrame > job.stopFrame) {
                throw Error(`Required frame ${toFrame} is out of the current job`);
            }

            if (toFrame === frame) {
                dispatch({
                    type: AnnotationActionTypes.CHANGE_FRAME_SUCCESS,
                    payload: {
                        number: state.annotation.player.frame.number,
                        data: state.annotation.player.frame.data,
                        states: state.annotation.annotations.states,
                    },
                });

                return;
            }

            // Start async requests
            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME,
                payload: {},
            });

            await job.logger.log(
                LogType.changeFrame, {
                    from: frame,
                    to: toFrame,
                },
            );
            const data = await job.frames.get(toFrame);
            const states = await job.annotations.get(toFrame, showAllInterpolationTracks, filters);
            const [minZ, maxZ] = computeZRange(states);
            const currentTime = new Date().getTime();
            let frameSpeed;
            switch (state.settings.player.frameSpeed) {
                case (FrameSpeed.Fast): {
                    frameSpeed = (FrameSpeed.Fast as number) / 2;
                    break;
                }
                case (FrameSpeed.Fastest): {
                    frameSpeed = (FrameSpeed.Fastest as number) / 3;
                    break;
                }
                default: {
                    frameSpeed = state.settings.player.frameSpeed as number;
                }
            }
            const delay = Math.max(0, Math.round(1000 / frameSpeed)
                - currentTime + (state.annotation.player.frame.changeTime as number));

            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME_SUCCESS,
                payload: {
                    number: toFrame,
                    data,
                    states,
                    minZ,
                    maxZ,
                    changeTime: currentTime + delay,
                    delay,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME_FAILED,
                payload: {
                    number: toFrame,
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
                frame: {
                    number: frameNumber,
                },
                frameAngles,
            },
            job: {
                instance: job,
                instance: {
                    startFrame,
                },
            },
        },
        settings: {
            player: {
                rotateAll,
            },
        },
    } = state;

    const frameAngle = (frameAngles[frameNumber - startFrame]
        + (rotation === Rotation.CLOCKWISE90 ? 90 : 270)) % 360;

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

export function confirmCanvasReady(): AnyAction {
    return {
        type: AnnotationActionTypes.CONFIRM_CANVAS_READY,
        payload: {},
    };
}

export function getJobAsync(
    tid: number,
    jid: number,
    initialFrame: number,
    initialFilters: string[],
): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const state: CombinedState = getStore().getState();
            const filters = initialFilters;
            const { showAllInterpolationTracks } = state.settings.workspace;

            // Check if already loaded job is different from asking one
            if (state.annotation.job.instance && state.annotation.job.instance.id !== jid) {
                dispatch({
                    type: AnnotationActionTypes.CLOSE_JOB,
                });
            }

            dispatch({
                type: AnnotationActionTypes.GET_JOB,
                payload: {},
            });

            const loadJobEvent = await logger.log(
                LogType.loadJob, {
                    task_id: tid,
                    job_id: jid,
                }, true,
            );

            // Check state if the task is already there
            let task = state.tasks.current
                .filter((_task: Task) => _task.instance.id === tid)
                .map((_task: Task) => _task.instance)[0];

            // If there aren't the task, get it from the server
            if (!task) {
                [task] = await cvat.tasks.get({ id: tid });
            }

            // Finally get the job from the task
            const job = task.jobs
                .filter((_job: any) => _job.id === jid)[0];
            if (!job) {
                throw new Error(`Task ${tid} doesn't contain the job ${jid}`);
            }

            const frameNumber = Math.max(Math.min(job.stopFrame, initialFrame), job.startFrame);
            const frameData = await job.frames.get(frameNumber);
            const states = await job.annotations
                .get(frameNumber, showAllInterpolationTracks, filters);
            const [minZ, maxZ] = computeZRange(states);
            const colors = [...cvat.enums.colors];

            loadJobEvent.close(await jobInfoGenerator(job));

            dispatch({
                type: AnnotationActionTypes.GET_JOB_SUCCESS,
                payload: {
                    job,
                    states,
                    frameNumber,
                    frameData,
                    colors,
                    filters,
                    minZ,
                    maxZ,
                },
            });
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

export function saveAnnotationsAsync(sessionInstance: any):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch({
            type: AnnotationActionTypes.SAVE_ANNOTATIONS,
            payload: {},
        });

        try {
            const saveJobEvent = await sessionInstance.logger.log(
                LogType.saveJob, {}, true,
            );

            await sessionInstance.annotations.save((status: string) => {
                dispatch({
                    type: AnnotationActionTypes.SAVE_UPDATE_ANNOTATIONS_STATUS,
                    payload: {
                        status,
                    },
                });
            });

            await saveJobEvent.close();
            await sessionInstance.logger.log(
                LogType.sendTaskInfo,
                await jobInfoGenerator(sessionInstance),
            );
            dispatch(saveLogsAsync());

            dispatch({
                type: AnnotationActionTypes.SAVE_ANNOTATIONS_SUCCESS,
                payload: {},
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
export function rememberObject(
    objectType: ObjectType,
    labelID: number,
    shapeType?: ShapeType,
    points?: number,
    rectDrawingMethod?: RectDrawingMethod,
): AnyAction {
    let activeControl = ActiveControl.CURSOR;
    if (shapeType === ShapeType.RECTANGLE) {
        activeControl = ActiveControl.DRAW_RECTANGLE;
    } else if (shapeType === ShapeType.POLYGON) {
        activeControl = ActiveControl.DRAW_POLYGON;
    } else if (shapeType === ShapeType.POLYLINE) {
        activeControl = ActiveControl.DRAW_POLYLINE;
    } else if (shapeType === ShapeType.POINTS) {
        activeControl = ActiveControl.DRAW_POINTS;
    }

    return {
        type: AnnotationActionTypes.REMEMBER_CREATED_OBJECT,
        payload: {
            shapeType,
            labelID,
            objectType,
            points,
            activeControl,
            rectDrawingMethod,
        },
    };
}

export function shapeDrawn(): AnyAction {
    return {
        type: AnnotationActionTypes.SHAPE_DRAWN,
        payload: {},
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

export function updateAnnotationsAsync(statesToUpdate: any[]):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const {
            jobInstance,
            filters,
            frame,
            showAllInterpolationTracks,
        } = receiveAnnotationsParameters();

        try {
            if (statesToUpdate.some((state: any): boolean => state.updateFlags.zOrder)) {
                // deactivate object to visualize changes immediately (UX)
                dispatch(activateObject(null, null));
            }

            const promises = statesToUpdate
                .map((objectState: any): Promise<any> => objectState.save());
            const states = await Promise.all(promises);
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
            const states = await jobInstance.annotations
                .get(frame, showAllInterpolationTracks, filters);
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

export function createAnnotationsAsync(sessionInstance: any, frame: number, statesToCreate: any[]):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();
            await sessionInstance.annotations.put(statesToCreate);
            const states = await sessionInstance.annotations
                .get(frame, showAllInterpolationTracks, filters);
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

export function mergeAnnotationsAsync(sessionInstance: any, frame: number, statesToMerge: any[]):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();
            await sessionInstance.annotations.merge(statesToMerge);
            const states = await sessionInstance.annotations
                .get(frame, showAllInterpolationTracks, filters);
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

export function groupAnnotationsAsync(
    sessionInstance: any,
    frame: number,
    statesToGroup: any[],
): ThunkAction<Promise<void>, {}, {}, AnyAction> {
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
            const states = await sessionInstance.annotations
                .get(frame, showAllInterpolationTracks, filters);
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

export function splitAnnotationsAsync(sessionInstance: any, frame: number, stateToSplit: any):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();
        try {
            await sessionInstance.annotations.split(stateToSplit, frame);
            const states = await sessionInstance.annotations
                .get(frame, showAllInterpolationTracks, filters);
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

export function changeLabelColorAsync(
    sessionInstance: any,
    frameNumber: number,
    label: any,
    color: string,
): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();
            const updatedLabel = label;
            updatedLabel.color = color;
            const states = await sessionInstance.annotations
                .get(frameNumber, showAllInterpolationTracks, filters);
            const history = await sessionInstance.actions.get();

            dispatch({
                type: AnnotationActionTypes.CHANGE_LABEL_COLOR_SUCCESS,
                payload: {
                    label: updatedLabel,
                    history,
                    states,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.CHANGE_LABEL_COLOR_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function changeGroupColorAsync(
    group: number,
    color: string,
): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const state: CombinedState = getStore().getState();
        const groupStates = state.annotation.annotations.states
            .filter((_state: any): boolean => _state.group.id === group);
        if (groupStates.length) {
            groupStates[0].group.color = color;
            dispatch(updateAnnotationsAsync(groupStates));
        } else {
            dispatch(updateAnnotationsAsync([]));
        }
    };
}

export function searchAnnotationsAsync(
    sessionInstance: any,
    frameFrom: number,
    frameTo: number,
): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const { filters } = receiveAnnotationsParameters();
            const frame = await sessionInstance.annotations.search(filters, frameFrom, frameTo);
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

export function pasteShapeAsync(): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const {
            canvas: {
                instance: canvasInstance,
            },
            job: {
                instance: jobInstance,
            },
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            drawing: {
                activeInitialState: initialState,
            },
        } = getStore().getState().annotation;

        if (initialState) {
            let activeControl = ActiveControl.CURSOR;
            if (initialState.shapeType === ShapeType.RECTANGLE) {
                activeControl = ActiveControl.DRAW_RECTANGLE;
            } else if (initialState.shapeType === ShapeType.POINTS) {
                activeControl = ActiveControl.DRAW_POINTS;
            } else if (initialState.shapeType === ShapeType.POLYGON) {
                activeControl = ActiveControl.DRAW_POLYGON;
            } else if (initialState.shapeType === ShapeType.POLYLINE) {
                activeControl = ActiveControl.DRAW_POLYLINE;
            }

            dispatch({
                type: AnnotationActionTypes.PASTE_SHAPE,
                payload: {
                    activeControl,
                },
            });

            canvasInstance.cancel();
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
                });
            }
        }
    };
}

export function repeatDrawShapeAsync(): ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const {
            canvas: {
                instance: canvasInstance,
            },
            job: {
                labels,
                instance: jobInstance,
            },
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            drawing: {
                activeObjectType,
                activeLabelID,
                activeShapeType,
                activeNumOfPoints,
                activeRectDrawingMethod,
            },
        } = getStore().getState().annotation;

        let activeControl = ActiveControl.CURSOR;
        if (activeShapeType === ShapeType.RECTANGLE) {
            activeControl = ActiveControl.DRAW_RECTANGLE;
        } else if (activeShapeType === ShapeType.POINTS) {
            activeControl = ActiveControl.DRAW_POINTS;
        } else if (activeShapeType === ShapeType.POLYGON) {
            activeControl = ActiveControl.DRAW_POLYGON;
        } else if (activeShapeType === ShapeType.POLYLINE) {
            activeControl = ActiveControl.DRAW_POLYLINE;
        }

        dispatch({
            type: AnnotationActionTypes.REPEAT_DRAW_SHAPE,
            payload: {
                activeControl,
            },
        });

        canvasInstance.cancel();
        if (activeObjectType === ObjectType.TAG) {
            const objectState = new cvat.classes.ObjectState({
                objectType: ObjectType.TAG,
                label: labels.filter((label: any) => label.id === activeLabelID)[0],
                frame: frameNumber,
            });
            dispatch(createAnnotationsAsync(jobInstance, frameNumber, [objectState]));
        } else {
            canvasInstance.draw({
                enabled: true,
                rectDrawingMethod: activeRectDrawingMethod,
                numberOfPoints: activeNumOfPoints,
                shapeType: activeShapeType,
                crosshair: activeShapeType === ShapeType.RECTANGLE,
            });
        }
    };
}
