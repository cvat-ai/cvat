import { AnyAction } from 'redux';

import { Canvas } from 'cvat-canvas';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import {
    AnnotationState,
    ActiveControl,
    ShapeType,
    ObjectType,
} from './interfaces';


const defaultState: AnnotationState = {
    canvasInstance: new Canvas(),
    canvasIsReady: false,
    activeControl: ActiveControl.CURSOR,
    jobInstance: null,
    frame: 0,
    playing: false,
    annotations: [],
    frameData: null,
    saving: false,
    savingStatuses: [],
    dataFetching: false,
    jobFetching: false,
    drawing: {
        activeShapeType: ShapeType.RECTANGLE,
        activeLabelID: 0,
        activeObjectType: ObjectType.SHAPE,
    },
};

export default (state = defaultState, action: AnyAction): AnnotationState => {
    switch (action.type) {
        case AnnotationActionTypes.GET_JOB: {
            return {
                ...defaultState,
                jobFetching: true,
            };
        }
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const {
                jobInstance,
                frame,
                frameData,
                annotations,
            } = action.payload;

            return {
                ...defaultState,
                jobFetching: false,
                jobInstance,
                frame,
                frameData,
                annotations,
                drawing: {
                    ...defaultState.drawing,
                    activeLabelID: jobInstance.task.labels[0].id,
                    activeObjectType: jobInstance.task.mode === 'interpolation' ? ObjectType.TRACK : ObjectType.SHAPE,
                },
            };
        }
        case AnnotationActionTypes.GET_JOB_FAILED: {
            return {
                ...state,
                jobInstance: undefined,
                jobFetching: false,
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME: {
            return {
                ...state,
                frameData: null,
                annotations: [],
                dataFetching: true,
                canvasIsReady: false,
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME_SUCCESS: {
            return {
                ...state,
                frame: action.payload.frame,
                annotations: action.payload.annotations,
                frameData: action.payload.frameData,
                dataFetching: false,
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME_FAILED: {
            return {
                ...state,
                dataFetching: false,
            }; // add notification if failed
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS: {
            return {
                ...state,
                saving: true,
                savingStatuses: [],
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_SUCCESS: {
            return {
                ...state,
                saving: false,
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_FAILED: {
            return {
                ...state,
                saving: false,
            }; // add notification if failed
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_UPDATED_STATUS: {
            return {
                ...state,
                savingStatuses: [...state.savingStatuses, action.payload.status],
            };
        }
        case AnnotationActionTypes.SWITCH_PLAY: {
            return {
                ...state,
                playing: action.payload.playing,
            };
        }
        case AnnotationActionTypes.CONFIRM_CANVAS_READY: {
            return {
                ...state,
                canvasIsReady: true,
            };
        }
        case AnnotationActionTypes.DRAG_CANVAS: {
            const { enabled } = action.payload;
            return {
                ...state,
                activeControl: enabled ? ActiveControl.DRAG_CANVAS : ActiveControl.CURSOR,
            };
        }
        case AnnotationActionTypes.ZOOM_CANVAS: {
            const { enabled } = action.payload;
            return {
                ...state,
                activeControl: enabled ? ActiveControl.ZOOM_CANVAS : ActiveControl.CURSOR,
            };
        }
        case AnnotationActionTypes.DRAW_SHAPE: {
            const {
                shapeType,
                labelID,
                objectType,
                points,
                activeControl,
            } = action.payload;

            return {
                ...state,
                activeControl,
                drawing: {
                    activeLabelID: labelID,
                    activeNumOfPoints: points,
                    activeObjectType: objectType,
                    activeShapeType: shapeType,
                },
            };
        }
        case AnnotationActionTypes.MERGE_OBJECTS: {
            return {
                ...state,
                activeControl: ActiveControl.MERGE,
            };
        }
        case AnnotationActionTypes.GROUP_OBJECTS: {
            return {
                ...state,
                activeControl: ActiveControl.GROUP,
            };
        }
        case AnnotationActionTypes.SPLIT_TRACK: {
            return {
                ...state,
                activeControl: ActiveControl.SPLIT,
            };
        }
        case AnnotationActionTypes.OBJECTS_MERGED:
        case AnnotationActionTypes.OBJECTS_GROUPPED:
        case AnnotationActionTypes.TRACK_SPLITTED:
        case AnnotationActionTypes.SHAPE_DRAWN: {
            return {
                ...state,
                activeControl: ActiveControl.CURSOR,
            };
        }
        case AnnotationActionTypes.ANNOTATIONS_UPDATED: {
            return {
                ...state,
                annotations: action.payload.annotations,
            };
        }
        case AnnotationActionTypes.RESET_CANVAS: {
            return {
                ...state,
                activeControl: ActiveControl.CURSOR,
            };
        }
        default: {
            return {
                ...state,
            };
        }
    }
};
