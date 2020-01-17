import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import {
    CombinedState,
    ActiveControl,
    ShapeType,
    ObjectType,
    Task,
} from 'reducers/interfaces';

import getCore from 'cvat-core';
import { getCVATStore } from 'cvat-store';

const cvat = getCore();

export enum AnnotationActionTypes {
    GET_JOB = 'GET_JOB',
    GET_JOB_SUCCESS = 'GET_JOB_SUCCESS',
    GET_JOB_FAILED = 'GET_JOB_FAILED',
    CHANGE_FRAME = 'CHANGE_FRAME',
    CHANGE_FRAME_SUCCESS = 'CHANGE_FRAME_SUCCESS',
    CHANGE_FRAME_FAILED = 'CHANGE_FRAME_FAILED',
    SAVE_ANNOTATIONS = 'SAVE_ANNOTATIONS',
    SAVE_ANNOTATIONS_SUCCESS = 'SAVE_ANNOTATIONS_SUCCESS',
    SAVE_ANNOTATIONS_FAILED = 'SAVE_ANNOTATIONS_FAILED',
    SAVE_ANNOTATIONS_UPDATED_STATUS = 'SAVE_ANNOTATIONS_UPDATED_STATUS',
    SWITCH_PLAY = 'SWITCH_PLAY',
    CONFIRM_CANVAS_READY = 'CONFIRM_CANVAS_READY',
    DRAG_CANVAS = 'DRAG_CANVAS',
    ZOOM_CANVAS = 'ZOOM_CANVAS',
    DRAW_SHAPE = 'DRAW_SHAPE',
    SHAPE_DRAWN = 'SHAPE_DRAWN',
    MERGE_OBJECTS = 'MERGE_OBJECTS',
    OBJECTS_MERGED = 'OBJECTS_MERGED',
    GROUP_OBJECTS = 'GROUP_OBJECTS',
    OBJECTS_GROUPPED = 'OBJECTS_GROUPPED',
    SPLIT_TRACK = 'SPLIT_TRACK',
    TRACK_SPLITTED = 'TRACK_SPLITTED',
    RESET_CANVAS = 'RESET_CANVAS',
    ANNOTATIONS_UPDATED = 'ANNOTATIONS_UPDATED',
}

export function switchPlay(playing: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_PLAY,
        payload: {
            playing,
        },
    };
}

export function changeFrameAsync(toFrame: number, playing: boolean):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const store = getCVATStore();
        const state: CombinedState = store.getState();
        const { jobInstance } = state.annotation;
        const currentFrame = state.annotation.frame;

        const frame = Math.max(
            Math.min(toFrame, jobInstance.stopFrame),
            jobInstance.startFrame,
        );

        // !playing || state.annotation.playing prevents changing frame on the latest setTimeout
        // after playing had become false
        if (frame !== currentFrame && (!playing || state.annotation.playing)) {
            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME,
                payload: {},
            });

            try {
                const frameData = await jobInstance.frames.get(frame);
                const annotations = await jobInstance.annotations.get(frame);
                dispatch({
                    type: AnnotationActionTypes.CHANGE_FRAME_SUCCESS,
                    payload: {
                        frame,
                        frameData,
                        annotations,
                    },
                });
            } catch (error) {
                dispatch({
                    type: AnnotationActionTypes.CHANGE_FRAME_FAILED,
                    payload: {
                        frame,
                        error,
                    },
                });
            }
        }
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

export function getJobAsync(tid: number, jid: number):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch({
            type: AnnotationActionTypes.GET_JOB,
            payload: {},
        });

        try {
            const store = getCVATStore();
            const state: CombinedState = store.getState();
            let task = state.tasks.current
                .filter((_task: Task) => _task.instance.id === tid)
                .map((_task: Task) => _task.instance)[0];
            if (!task) {
                [task] = await cvat.tasks.get({ id: tid });
            }

            const job = task.jobs
                .filter((_job: any) => _job.id === jid)[0];
            if (!job) {
                throw new Error('Job with specified id does not exist');
            }

            const frame = Math.min(0, job.startFrame);
            const frameData = await job.frames.get(frame);
            const annotations = await job.annotations.get(frame);

            dispatch({
                type: AnnotationActionTypes.GET_JOB_SUCCESS,
                payload: {
                    jobInstance: job,
                    frameData,
                    annotations,
                    frame,
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
            await sessionInstance.annotations.save((status: string) => {
                dispatch({
                    type: AnnotationActionTypes.SAVE_ANNOTATIONS_UPDATED_STATUS,
                    payload: {
                        status,
                    },
                });
            });

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

export function drawShape(
    shapeType: ShapeType,
    labelID: number,
    objectType: ObjectType,
    points?: number,
): AnyAction {
    let activeControl = ActiveControl.DRAW_RECTANGLE;
    if (shapeType === ShapeType.POLYGON) {
        activeControl = ActiveControl.DRAW_POLYGON;
    } else if (shapeType === ShapeType.POLYLINE) {
        activeControl = ActiveControl.DRAW_POLYLINE;
    } else if (shapeType === ShapeType.POINTS) {
        activeControl = ActiveControl.DRAW_POINTS;
    }

    return {
        type: AnnotationActionTypes.DRAW_SHAPE,
        payload: {
            shapeType,
            labelID,
            objectType,
            points,
            activeControl,
        },
    };
}

export function shapeDrawn(): AnyAction {
    return {
        type: AnnotationActionTypes.SHAPE_DRAWN,
        payload: {},
    };
}

export function mergeObjects(): AnyAction {
    return {
        type: AnnotationActionTypes.MERGE_OBJECTS,
        payload: {},
    };
}

export function objectsMerged(): AnyAction {
    return {
        type: AnnotationActionTypes.OBJECTS_MERGED,
        payload: {},
    };
}

export function groupObjects(): AnyAction {
    return {
        type: AnnotationActionTypes.GROUP_OBJECTS,
        payload: {},
    };
}

export function objectsGroupped(): AnyAction {
    return {
        type: AnnotationActionTypes.OBJECTS_GROUPPED,
        payload: {},
    };
}

export function splitTrack(): AnyAction {
    return {
        type: AnnotationActionTypes.SPLIT_TRACK,
        payload: {},
    };
}

export function trackSplitted(): AnyAction {
    return {
        type: AnnotationActionTypes.TRACK_SPLITTED,
        payload: {},
    };
}

export function annotationsUpdated(annotations: any[]): AnyAction {
    return {
        type: AnnotationActionTypes.ANNOTATIONS_UPDATED,
        payload: {
            annotations,
        },
    };
}
