import { AnyAction } from 'redux';

import { TaskActionTypes } from '../actions/task-actions';
import { Task, TaskState } from './interfaces';

const defaultState: TaskState = {
    taskFetchingError: null,
    taskUpdatingError: null,
    task: null,
};

export default function (state = defaultState, action: AnyAction): TaskState {
    switch (action.type) {
        case TaskActionTypes.GET_TASK:
            return {
                ...state,
                taskFetchingError: null,
                taskUpdatingError: null,
            };
        case TaskActionTypes.GET_TASK_SUCCESS: {
            return {
                ...state,
                task: {
                    instance: action.payload.taskInstance,
                    preview: action.payload.previewImage,
                },
            };
        }
        case TaskActionTypes.GET_TASK_FAILED: {
            return {
                ...state,
                task: null,
                taskFetchingError: action.payload.error,
            };
        }
        case TaskActionTypes.UPDATE_TASK: {
            return {
                ...state,
                taskUpdatingError: null,
                taskFetchingError: null,
            };
        }
        case TaskActionTypes.UPDATE_TASK_SUCCESS: {
            return {
                ...state,
                task: {
                    ...(state.task as Task),
                    instance: action.payload.taskInstance,
                },
            };
        }
        case TaskActionTypes.UPDATE_TASK_FAILED: {
            return {
                ...state,
                task: {
                    ...(state.task as Task),
                    instance: action.payload.taskInstance,
                },
                taskUpdatingError: action.payload.error,
            };
        }
        default:
            return { ...state };
    }
}
