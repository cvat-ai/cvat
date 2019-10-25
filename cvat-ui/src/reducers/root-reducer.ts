import { combineReducers, Reducer } from 'redux';
import authReducer from './auth-reducer';
import tasksReducer from './tasks-reducer';
import formatsReducer from './formats-reducer';

import {
    AuthState,
    TasksState,
    FormatsState,
} from './interfaces';

export interface CombinedState {
    auth: AuthState;
    tasks: TasksState;
    formats: FormatsState;
}

export default function createRootReducer(): Reducer {
    return combineReducers({
        auth: authReducer,
        tasks: tasksReducer,
        formats: formatsReducer,
    });
}
