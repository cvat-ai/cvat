import { AnyAction } from 'redux';

import { AuthActionTypes } from '../actions/auth-actions';
import { FormatsActionTypes } from '../actions/formats-actions';
import { ModelsActionTypes } from '../actions/models-actions';
import { ShareActionTypes } from '../actions/share-actions';
import { TasksActionTypes } from '../actions/tasks-actions';
import { UsersActionTypes } from '../actions/users-actions';
import { NotificationsActionType } from '../actions/notification-actions';

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
        share: {
            fetching: null,
        },
        models: {
            creating: null,
            starting: null,
            fetching: null,
            deleting: null,
            inferenceStatusFetching: null,
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
                        authorized: action.payload.error,
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
                        login: action.payload.error,
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
                        logout: action.payload.error,
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
                        register: action.payload.error,
                    },
                },
            };
        }
        case TasksActionTypes.EXPORT_DATASET_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        exporting: action.payload.error,
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
                        fetching: action.payload.error,
                    },
                },
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        loading: action.payload.error,
                    },
                },
            };
        }
        case TasksActionTypes.LOAD_ANNOTATIONS_SUCCESS: {
            const { task } = action.payload;
            return {
                ...state,
                messages: {
                    ...state.messages,
                    tasks: {
                        ...state.messages.tasks,
                        loadingDone: `Annotations have been loaded to the task ${task.id}`,
                    },
                },
            };
        }
        case TasksActionTypes.UPDATE_TASK_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        updating: action.payload.error,
                    },
                },
            };
        }
        case TasksActionTypes.DUMP_ANNOTATIONS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        dumping: action.payload.error,
                    },
                },
            };
        }
        case TasksActionTypes.DELETE_TASK_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    tasks: {
                        ...state.errors.tasks,
                        deleting: action.payload.error,
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
                        creating: action.payload.error,
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
                        fetching: action.payload.error,
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
                        fetching: action.payload.error,
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
                        fetching: action.payload.error,
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
                        creating: action.payload.error,
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
                        deleting: action.payload.error,
                    },
                },
            };
        }
        case ModelsActionTypes.GET_INFERENCE_STATUS_SUCCESS: {
            if (action.payload.activeInference.status === 'finished') {
                return {
                    ...state,
                    messages: {
                        ...state.messages,
                        models: {
                            ...state.messages.models,
                            inferenceDone: `Automatic annotation finished for the task ${action.payload.taskID}`,
                        },
                    },
                };
            }

            return {
                ...state,
            };
        }
        case ModelsActionTypes.GET_INFERENCE_STATUS_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    models: {
                        ...state.errors.models,
                        inferenceStatusFetching: action.payload.error,
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
                        fetching: action.payload.error,
                    },
                },
            };
        }
        case ModelsActionTypes.INFER_MODEL_FAILED: {
            return {
                ...state,
                errors: {
                    ...state.errors,
                    models: {
                        ...state.errors.models,
                        starting: action.payload.error,
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
        default: {
            return {
                ...state,
            };
        }
    }
}
