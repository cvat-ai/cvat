import { AnyAction } from 'redux';

import { Canvas } from 'cvat-canvas';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import {
    AnnotationState,
    ActiveControl,
    ShapeType,
    ObjectType,
} from './interfaces';

const defaultState: AnnotationState = {
    canvas: {
        instance: new Canvas(),
        ready: false,
        activeControl: ActiveControl.CURSOR,
    },
    job: {
        instance: null,
        fetching: false,
    },
    player: {
        frame: {
            number: 0,
            data: null,
            fetching: false,
        },
        playing: false,
    },
    drawing: {
        activeShapeType: ShapeType.RECTANGLE,
        activeLabelID: 0,
        activeObjectType: ObjectType.SHAPE,
    },
    annotations: {
        saving: {
            uploading: false,
            statuses: [],
        },
        states: [],
        colors: [],
    },
};

export default (state = defaultState, action: AnyAction): AnnotationState => {
    switch (action.type) {
        case AnnotationActionTypes.GET_JOB: {
            return {
                ...defaultState,
                job: {
                    ...defaultState.job,
                    fetching: true,
                },
            };
        }
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const {
                job,
                states,
                frameNumber: number,
                colors,
                frameData: data,
            } = action.payload;

            return {
                ...state,
                job: {
                    ...state,
                    fetching: false,
                    instance: job,
                },
                annotations: {
                    ...state.annotations,
                    states,
                    colors,
                },
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        number,
                        data,
                    },
                },
                drawing: {
                    ...defaultState.drawing,
                    activeLabelID: job.task.labels[0].id,
                    activeObjectType: job.task.mode === 'interpolation' ? ObjectType.TRACK : ObjectType.SHAPE,
                },
            };
        }
        case AnnotationActionTypes.GET_JOB_FAILED: {
            return {
                ...state,
                job: {
                    ...state.job,
                    instance: undefined,
                    fetching: false,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states: [],
                },
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        data: null,
                        fetching: true,
                    },
                },
                canvas: {
                    ...state.canvas,
                    ready: false,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME_SUCCESS: {
            const {
                number,
                data,
                states,
            } = action.payload;

            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        data,
                        number,
                        fetching: false,
                    },
                },
                annotations: {
                    ...state.annotations,
                    states,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME_FAILED: {
            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        fetching: false,
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        uploading: true,
                        statuses: [],
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_SUCCESS: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        uploading: false,
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_FAILED: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        uploading: false,
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_UPDATED_STATUS: {
            const { status } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        statuses: [...state.annotations.saving.statuses, status],
                    },
                },
            };
        }
        case AnnotationActionTypes.SWITCH_PLAY: {
            const { playing } = action.payload;

            return {
                ...state,
                player: {
                    ...state.player,
                    playing,
                },
            };
        }
        case AnnotationActionTypes.CONFIRM_CANVAS_READY: {
            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    ready: true,
                },
            };
        }
        case AnnotationActionTypes.DRAG_CANVAS: {
            const { enabled } = action.payload;
            const activeControl = enabled
                ? ActiveControl.DRAG_CANVAS : ActiveControl.CURSOR;

            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.ZOOM_CANVAS: {
            const { enabled } = action.payload;
            const activeControl = enabled
                ? ActiveControl.ZOOM_CANVAS : ActiveControl.CURSOR;

            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
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
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
                drawing: {
                    activeLabelID: labelID,
                    activeNumOfPoints: points,
                    activeObjectType: objectType,
                    activeShapeType: shapeType,
                },
            };
        }
        case AnnotationActionTypes.MERGE_OBJECTS: {
            const { enabled } = action.payload;
            const activeControl = enabled
                ? ActiveControl.MERGE : ActiveControl.CURSOR;

            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.GROUP_OBJECTS: {
            const { enabled } = action.payload;
            const activeControl = enabled
                ? ActiveControl.GROUP : ActiveControl.CURSOR;

            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.SPLIT_TRACK: {
            const { enabled } = action.payload;
            const activeControl = enabled
                ? ActiveControl.SPLIT : ActiveControl.CURSOR;

            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.SHAPE_DRAWN: {
            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl: ActiveControl.CURSOR,
                },
            };
        }
        case AnnotationActionTypes.ANNOTATIONS_UPDATED: {
            const { states } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_LABEL_COLOR_SUCCESS: {
            const {
                label,
            } = action.payload;
            const { instance: job } = state.job;
            const labels = [...job.task.labels];
            const index = labels.indexOf(label);
            labels[index] = label;

            return {
                ...state,
            };
        }
        case AnnotationActionTypes.RESET_CANVAS: {
            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl: ActiveControl.CURSOR,
                },
            };
        }
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return {
                ...defaultState,
            };
        }
        default: {
            return {
                ...state,
            };
        }
    }
};
