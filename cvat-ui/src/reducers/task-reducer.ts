import { AnyAction } from 'redux';

import { TaskActionTypes } from '../actions/task-actions';
import { TaskState } from './interfaces';

const defaultState: TaskState = {
    taskFetchingError: null,
    task: null,
};

export default function (state = defaultState, action: AnyAction): TaskState {
    switch (action.type) {
        case TaskActionTypes.GET_TASK:
            return {
                ...state,
                taskFetchingError: null,
            };
        case TaskActionTypes.GET_TASK_SUCCESS: {
            return {
                ...state,
                task: {
                    instance: action.payload.taskInstance,
                    preview: action.payload.previewImage,
                },
                taskFetchingError: null,
            };
        }
        case TaskActionTypes.GET_TASK_FAILED: {
            return {
                ...state,
                task: null,
                taskFetchingError: action.payload.error,
            };
        }
        default:
            return { ...state };
    }
}
