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
    SAVE_UPDATE_ANNOTATIONS_STATUS = 'SAVE_UPDATE_ANNOTATIONS_STATUS',
    SWITCH_PLAY = 'SWITCH_PLAY',
    CONFIRM_CANVAS_READY = 'CONFIRM_CANVAS_READY',
    DRAG_CANVAS = 'DRAG_CANVAS',
    ZOOM_CANVAS = 'ZOOM_CANVAS',
    MERGE_OBJECTS = 'MERGE_OBJECTS',
    GROUP_OBJECTS = 'GROUP_OBJECTS',
    SPLIT_TRACK = 'SPLIT_TRACK',
    DRAW_SHAPE = 'DRAW_SHAPE',
    SHAPE_DRAWN = 'SHAPE_DRAWN',
    RESET_CANVAS = 'RESET_CANVAS',
    UPDATE_ANNOTATIONS_SUCCESS = 'UPDATE_ANNOTATIONS_SUCCESS',
    UPDATE_ANNOTATIONS_FAILED = 'UPDATE_ANNOTATIONS_FAILED',
    CREATE_ANNOTATIONS_SUCCESS = 'CREATE_ANNOTATIONS_SUCCESS',
    CREATE_ANNOTATIONS_FAILED = 'CREATE_ANNOTATIONS_FAILED',
    MERGE_ANNOTATIONS_SUCCESS = 'MERGE_ANNOTATIONS_SUCCESS',
    MERGE_ANNOTATIONS_FAILED = 'MERGE_ANNOTATIONS_FAILED',
    GROUP_ANNOTATIONS_SUCCESS = 'GROUP_ANNOTATIONS_SUCCESS',
    GROUP_ANNOTATIONS_FAILED = 'GROUP_ANNOTATIONS_FAILED',
    SPLIT_ANNOTATIONS_SUCCESS = 'SPLIT_ANNOTATIONS_SUCCESS',
    SPLIT_ANNOTATIONS_FAILED = 'SPLIT_ANNOTATIONS_FAILED',
    CHANGE_LABEL_COLOR_SUCCESS = 'CHANGE_LABEL_COLOR_SUCCESS',
    CHANGE_LABEL_COLOR_FAILED = 'CHANGE_LABEL_COLOR_FAILED',
    UPDATE_TAB_CONTENT_HEIGHT = 'UPDATE_TAB_CONTENT_HEIGHT',
    COLLAPSE_SIDEBAR = 'COLLAPSE_SIDEBAR',
    COLLAPSE_APPEARANCE = 'COLLAPSE_APPEARANCE',
    COLLAPSE_OBJECT_ITEMS = 'COLLAPSE_OBJECT_ITEMS'
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
        const store = getCVATStore();
        const state: CombinedState = store.getState();
        const { instance: job } = state.annotation.job;
        const { number: frame } = state.annotation.player.frame;

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

            const data = await job.frames.get(toFrame);
            const states = await job.annotations.get(toFrame);
            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME_SUCCESS,
                payload: {
                    number: toFrame,
                    data,
                    states,
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

            // First check state if the task is already there
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

            const frameNumber = Math.max(0, job.startFrame);
            const frameData = await job.frames.get(frameNumber);
            const states = await job.annotations.get(frameNumber);
            const colors = [...cvat.enums.colors];

            dispatch({
                type: AnnotationActionTypes.GET_JOB_SUCCESS,
                payload: {
                    job,
                    states,
                    frameNumber,
                    frameData,
                    colors,
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
                    type: AnnotationActionTypes.SAVE_UPDATE_ANNOTATIONS_STATUS,
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

export function updateAnnotationsAsync(sessionInstance: any, frame: number, statesToUpdate: any[]):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            const promises = statesToUpdate.map((state: any): Promise<any> => state.save());
            const states = await Promise.all(promises);

            dispatch({
                type: AnnotationActionTypes.UPDATE_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
                },
            });
        } catch (error) {
            const states = await sessionInstance.annotations.get(frame);
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
            await sessionInstance.annotations.put(statesToCreate);
            const states = await sessionInstance.annotations.get(frame);

            dispatch({
                type: AnnotationActionTypes.CREATE_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
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
            await sessionInstance.annotations.merge(statesToMerge);
            const states = await sessionInstance.annotations.get(frame);

            dispatch({
                type: AnnotationActionTypes.MERGE_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
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

export function groupAnnotationsAsync(sessionInstance: any, frame: number, statesToGroup: any[]):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            await sessionInstance.annotations.group(statesToGroup);
            const states = await sessionInstance.annotations.get(frame);

            dispatch({
                type: AnnotationActionTypes.GROUP_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
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
        try {
            await sessionInstance.annotations.split(stateToSplit, frame);
            const states = await sessionInstance.annotations.get(frame);

            dispatch({
                type: AnnotationActionTypes.SPLIT_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
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

export function changeLabelColor(label: any, color: string): AnyAction {
    try {
        const updatedLabel = label;
        updatedLabel.color = color;

        return {
            type: AnnotationActionTypes.CHANGE_LABEL_COLOR_SUCCESS,
            payload: {
                label: updatedLabel,
            },
        };
    } catch (error) {
        return {
            type: AnnotationActionTypes.CHANGE_LABEL_COLOR_FAILED,
            payload: {
                error,
            },
        };
    }
}
