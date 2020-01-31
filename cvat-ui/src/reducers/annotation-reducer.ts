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
        labels: [],
        attributes: {},
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
        collapsed: {},
        states: [],
    },
    colors: [],
    sidebarCollapsed: false,
    appearanceCollapsed: false,
    tabContentHeight: 0,
};

export default (state = defaultState, action: AnyAction): AnnotationState => {
    switch (action.type) {
        case AnnotationActionTypes.GET_JOB: {
            return {
                ...state,
                job: {
                    ...state.job,
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
                    ...state.job,
                    fetching: false,
                    instance: job,
                    labels: job.task.labels,
                    attributes: job.task.labels
                        .reduce((acc: Record<number, any[]>, label: any): Record<number, any[]> => {
                            acc[label.id] = label.attributes;
                            return acc;
                        }, {}),
                },
                annotations: {
                    ...state.annotations,
                    states,
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
                    ...state.drawing,
                    activeLabelID: job.task.labels[0].id,
                    activeObjectType: job.task.mode === 'interpolation' ? ObjectType.TRACK : ObjectType.SHAPE,
                },
                colors,
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
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
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
        case AnnotationActionTypes.SAVE_UPDATE_ANNOTATIONS_STATUS: {
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
        case AnnotationActionTypes.COLLAPSE_SIDEBAR: {
            return {
                ...state,
                sidebarCollapsed: !state.sidebarCollapsed,
            };
        }
        case AnnotationActionTypes.COLLAPSE_APPEARANCE: {
            return {
                ...state,
                appearanceCollapsed: !state.appearanceCollapsed,
            };
        }
        case AnnotationActionTypes.UPDATE_TAB_CONTENT_HEIGHT: {
            const { tabContentHeight } = action.payload;
            return {
                ...state,
                tabContentHeight,
            };
        }
        case AnnotationActionTypes.COLLAPSE_OBJECT_ITEMS: {
            const {
                states,
                collapsed,
            } = action.payload;

            const updatedCollapsedStates = { ...state.annotations.collapsed };
            for (const objectState of states) {
                updatedCollapsedStates[objectState.clientID] = collapsed;
            }

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    collapsed: updatedCollapsedStates,
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
        case AnnotationActionTypes.UPDATE_ANNOTATIONS_SUCCESS: {
            const { states: updatedStates } = action.payload;
            const { states: prevStates } = state.annotations;
            const nextStates = [...prevStates];

            const clientIDs = prevStates.map((prevState: any): number => prevState.clientID);
            for (const updatedState of updatedStates) {
                const index = clientIDs.indexOf(updatedState.clientID);
                if (index !== -1) {
                    nextStates[index] = updatedState;
                }
            }

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states: nextStates,
                },
            };
        }
        case AnnotationActionTypes.UPDATE_ANNOTATIONS_FAILED: {
            const { states } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                },
            };
        }
        case AnnotationActionTypes.CREATE_ANNOTATIONS_SUCCESS: {
            const { states } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                },
            };
        }
        case AnnotationActionTypes.MERGE_ANNOTATIONS_SUCCESS: {
            const { states } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                },
            };
        }
        case AnnotationActionTypes.GROUP_ANNOTATIONS_SUCCESS: {
            const { states } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                },
            };
        }
        case AnnotationActionTypes.SPLIT_ANNOTATIONS_SUCCESS: {
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
                job: {
                    ...state.job,
                    labels,
                },
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
            return state;
        }
    }
};
