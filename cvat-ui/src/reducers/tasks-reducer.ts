import { AnyAction } from 'redux';
import { TasksActionTypes } from '../actions/tasks-actions';

import { TasksState } from './interfaces';

const defaultState: TasksState = {
    initialized: false,
    count: 0,
    array: [],
    previews: [],
    error: null,
    query: {
        page: 1,
        id: null,
        search: null,
        owner: null,
        assignee: null,
        name: null,
        status: null,
        mode: null,
    },
};

export default (state = defaultState, action: AnyAction): TasksState => {
    switch (action.type) {
        case TasksActionTypes.GET_TASKS_SUCCESS:
            return {
                ...state,
                initialized: true,
                count: action.payload.count,
                array: action.payload.array,
                previews: action.payload.previews,
                error: null,
                query: { ...action.payload.query },
            };
        case TasksActionTypes.GET_TASKS_FAILED:
            return {
                ...state,
                initialized: true,
                array: [],
                previews: [],
                count: 0,
                error: action.payload.error,
                query: { ...action.payload.query },
            };
        default:
            return state;
    }
};
