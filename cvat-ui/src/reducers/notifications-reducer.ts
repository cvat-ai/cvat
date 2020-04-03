// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';

import { AuthActionTypes } from 'actions/auth-actions';
import { FormatsActionTypes } from 'actions/formats-actions';
import { ModelsActionTypes } from 'actions/models-actions';
import { ShareActionTypes } from 'actions/share-actions';
import { TasksActionTypes } from 'actions/tasks-actions';
import { UsersActionTypes } from 'actions/users-actions';
import { AboutActionTypes } from 'actions/about-actions';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import { NotificationsActionType } from 'actions/notification-actions';
import { BoundariesActionTypes } from 'actions/boundaries-actions';

import { NotificationsState } from './interfaces';

const defaultState: NotificationsState = {
    errors: {
        auth: {
            authorized: null,
            login: null,
            logout: null,
            register: null,
        },
        tasks: {
            fetching: null,
            updating: null,
            dumping: null,
            loading: null,
            exporting: null,
            deleting: null,
            creating: null,
        },
        formats: {
            fetching: null,
        },
        users: {
            fetching: null,
        },
        about: {
            fetching: null,
        },
        share: {
            fetching: null,
        },
        models: {
            creating: null,
            starting: null,
            deleting: null,
            fetching: null,
            canceling: null,
            metaFetching: null,
            inferenceStatusFetching: null,
        },
        annotation: {
            saving: null,
            jobFetching: null,
            frameFetching: null,
            changingLabelColor: null,
            updating: null,
            creating: null,
            merging: null,
            grouping: null,
            splitting: null,
            removing: null,
            propagating: null,
            collectingStatistics: null,
            savingJob: null,
            uploadAnnotations: null,
            removeAnnotations: null,
            fetchingAnnotations: null,
            undo: null,
            redo: null,
            search: null,
            savingLogs: null,
        },
        boundaries: {
            resetError: null,
        },
    },
    messages: {
        tasks: {
            loadingDone: '',
        },
        models: {
            inferenceDone: '',
        },
    },
};

export default function (state = defaultState, action: AnyAction): NotificationsState {
    switch (action.type) {
        case AuthActionTypes.AUTHORIZED_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    auth: {
                        ...state.errors.auth,
                        authorized: {
                            message: 'Could not check authorization on the server',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AuthActionTypes.LOGIN_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    auth: {
                        ...state.errors.auth,
                        login: {
                            message: 'Could not login on the server',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AuthActionTypes.LOGOUT_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    auth: {
                        ...state.errors.auth,
                        logout: {
                            message: 'Could not logout from the server',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AuthActionTypes.REGISTER_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    auth: {
                        ...state.errors.auth,
                        register: {
                            message: 'Could not register on the server',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case TasksActionTypes.EXPORT_DATASET_FAILED: {
            const taskID = action.payload.task.id;
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        exporting: {
                            message: 'Could not export dataset for the '
                                + `<a href="/tasks/${taskID}" target="_blank">task ${taskID}</a>`,
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case TasksActionTypes.GET_TASKS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        fetching: {
                            message: 'Could not fetch tasks',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS_FAILED: {
            const taskID = action.payload.task.id;
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        loading: {
                            message: 'Could not upload annotation for the '
                                + `<a href="/tasks/${taskID}" target="_blank">task ${taskID}</a>`,
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS_SUCCESS: {
            const taskID = action.payload.task.id;
            return {
                ...state,
                messages: {
                    ...state.messages,
                    tasks: {
                        ...state.messages.tasks,
                        loadingDone: 'Annotations have been loaded to the '
                            + `<a href="/tasks/${taskID}" target="_blank">task ${taskID}</a>`,
                    },
                },
            };
        }
        case TasksActionTypes.UPDATE_TASK_FAILED: {
            const taskID = action.payload.task.id;
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        updating: {
                            message: 'Could not update '
                                + `<a href="/tasks/${taskID}" target="_blank">task ${taskID}</a>`,
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case TasksActionTypes.DUMP_ANNOTATIONS_FAILED: {
            const taskID = action.payload.task.id;
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        dumping: {
                            message: 'Could not dump annotations for the '
                                + `<a href="/tasks/${taskID}" target="_blank">task ${taskID}</a>`,
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case TasksActionTypes.DELETE_TASK_FAILED: {
            const { taskID } = action.payload;
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        deleting: {
                            message: 'Could not delete the '
                                + `<a href="/tasks/${taskID}" target="_blank">task ${taskID}</a>`,
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case TasksActionTypes.CREATE_TASK_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        creating: {
                            message: 'Could not create the task',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case FormatsActionTypes.GET_FORMATS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    formats: {
                        ...state.errors.formats,
                        fetching: {
                            message: 'Could not get formats from the server',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case UsersActionTypes.GET_USERS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    users: {
                        ...state.errors.users,
                        fetching: {
                            message: 'Could not get users from the server',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AboutActionTypes.GET_ABOUT_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    about: {
                        ...state.errors.about,
                        fetching: {
                            message: 'Could not get info about the server',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case ShareActionTypes.LOAD_SHARE_DATA_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    share: {
                        ...state.errors.share,
                        fetching: {
                            message: 'Could not load share data from the server',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case ModelsActionTypes.CREATE_MODEL_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    models: {
                        ...state.errors.models,
                        creating: {
                            message: 'Could not create the model',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case ModelsActionTypes.DELETE_MODEL_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    models: {
                        ...state.errors.models,
                        deleting: {
                            message: 'Could not delete the model',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case ModelsActionTypes.GET_INFERENCE_STATUS_SUCCESS: {
            if (action.payload.activeInference.status === 'finished') {
                const { taskID } = action.payload;
                return {
                    ...state,
                    messages: {
                        ...state.messages,
                        models: {
                            ...state.messages.models,
                            inferenceDone: 'Automatic annotation finished for the '
                                + `<a href="/tasks/${taskID}" target="_blank">task ${taskID}</a>`,
                        },
                    },
                };
            }

            return {
                ...state,
            };
        }
        case ModelsActionTypes.FETCH_META_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    models: {
                        ...state.errors.models,
                        metaFetching: {
                            message: 'Could not fetch models meta information',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case ModelsActionTypes.GET_INFERENCE_STATUS_FAILED: {
            const { taskID } = action.payload;
            return {
                ...state,
                errors: {
                    ...state.errors,
                    models: {
                        ...state.errors.models,
                        inferenceStatusFetching: {
                            message: 'Could not fetch inference status for the '
                                + `<a href="/tasks/${taskID}" target="_blank">task ${taskID}</a>`,
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case ModelsActionTypes.GET_MODELS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    models: {
                        ...state.errors.models,
                        fetching: {
                            message: 'Could not get models from the server',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case ModelsActionTypes.START_INFERENCE_FAILED: {
            const { taskID } = action.payload;
            return {
                ...state,
                errors: {
                    ...state.errors,
                    models: {
                        ...state.errors.models,
                        starting: {
                            message: 'Could not infer model for the '
                                + `<a href="/tasks/${taskID}" target="_blank">task ${taskID}</a>`,
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case ModelsActionTypes.CANCEL_INFERENCE_FAILED: {
            const { taskID } = action.payload;
            return {
                ...state,
                errors: {
                    ...state.errors,
                    models: {
                        ...state.errors.models,
                        canceling: {
                            message: 'Could not cancel model inference for the '
                                + `<a href="/tasks/${taskID}" target="_blank">task ${taskID}</a>`,
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.GET_JOB_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        jobFetching: {
                            message: 'Error during fetching a job',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        frameFetching: {
                            message: `Could not receive frame ${action.payload.number}`,
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        saving: {
                            message: 'Could not save annotations',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.CHANGE_LABEL_COLOR_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        changingLabelColor: {
                            message: 'Could not change label color',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.UPDATE_ANNOTATIONS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        updating: {
                            message: 'Could not update annotations',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.CREATE_ANNOTATIONS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        creating: {
                            message: 'Could not create annotations',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.MERGE_ANNOTATIONS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        merging: {
                            message: 'Could not merge annotations',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.GROUP_ANNOTATIONS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        grouping: {
                            message: 'Could not group annotations',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.SPLIT_ANNOTATIONS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        splitting: {
                            message: 'Could not split the track',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.REMOVE_OBJECT_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        removing: {
                            message: 'Could not remove the object',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.PROPAGATE_OBJECT_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        propagating: {
                            message: 'Could not propagate the object',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.COLLECT_STATISTICS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        collectingStatistics: {
                            message: 'Could not collect annotations statistics',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.CHANGE_JOB_STATUS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        savingJob: {
                            message: 'Could not save the job on the server',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_FAILED: {
            const {
                job,
                error,
            } = action.payload;

            const {
                id: jobID,
                task: {
                    id: taskID,
                },
            } = job;

            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        uploadAnnotations: {
                            message: 'Could not upload annotations for the '
                                + `<a href="/tasks/${taskID}/jobs/${jobID}" target="_blank">job ${taskID}</a>`,
                            reason: error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.REMOVE_JOB_ANNOTATIONS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        removeAnnotations: {
                            message: 'Could not remove annotations',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.FETCH_ANNOTATIONS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        fetchingAnnotations: {
                            message: 'Could not fetch annotations',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.REDO_ACTION_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        redo: {
                            message: 'Could not redo',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.UNDO_ACTION_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        undo: {
                            message: 'Could not undo',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.SEARCH_ANNOTATIONS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        search: {
                            message: 'Could not execute search annotations',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_LOGS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    annotation: {
                        ...state.errors.annotation,
                        savingLogs: {
                            message: 'Could not send logs to the server',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case BoundariesActionTypes.THROW_RESET_ERROR: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    boundaries: {
                        ...state.errors.annotation,
                        resetError: {
                            message: 'Could not reset the state',
                            reason: action.payload.error.toString(),
                        },
                    },
                },
            };
        }
        case NotificationsActionType.RESET_ERRORS: {
            return {
                ...state,
                errors: {
                    ...defaultState.errors,
                },
            };
        }
        case NotificationsActionType.RESET_MESSAGES: {
            return {
                ...state,
                messages: {
                    ...defaultState.messages,
                },
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default: {
            return state;
        }
    }
}
