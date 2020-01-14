import { AnyAction } from 'redux';

import { Canvas } from '../canvas';

import {
    AnnotationState,
    ActiveControl,
} from './interfaces';
import { AnnotationActionTypes } from '../actions/annotation-actions';

const defaultState: AnnotationState = {
    canvasInstance: new Canvas(),
    canvasIsReady: false,
    activeControl: ActiveControl.CURSOR,
    jobInstance: null,
    frame: 0,
    playing: false,
    annotations: [],
    frameData: null,
    dataFetching: false,
    jobFetching: false,
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
            return {
                ...defaultState,
                jobFetching: false,
                jobInstance: action.payload.jobInstance,
                frame: action.payload.frame,
                frameData: action.payload.frameData,
                annotations: action.payload.annotations,
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
