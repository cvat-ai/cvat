import { AnyAction } from 'redux';
import { TasksActionTypes } from '../actions/tasks-actions';

import { TasksState } from './interfaces';

const defaultState: TasksState = {
    initialized: false,
    count: 0,
    array: [],
    query: {
        error: null,
        page: 1,
        id: null,
        search: null,
        owner: null,
        assignee: null,
        name: null,
        status: null,
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
                query: { ...state.query, error: null },
            };
        case TasksActionTypes.GET_TASKS_FAILED:
            return {
                ...state,
                initialized: true,
                array: [],
                count: 0,
                query: { ...state.query, error: action.payload.error },
            };
        default:
            return state;
    }
};
