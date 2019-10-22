import { combineReducers, Reducer } from 'redux';
import authReducer from './auth-reducer';
import tasksReducer from './tasks-reducer';
import formatsReducer from './formats-reducer';
import pluginsReducer from './plugins-reducer';

import {
    AuthState,
    TasksState,
    FormatsState,
    PluginsState,
} from './interfaces';

export interface CombinedState {
    auth: AuthState;
    tasks: TasksState;
    formats: FormatsState;
    plugins: PluginsState;
}

export default function createRootReducer(): Reducer {
    return combineReducers({
        auth: authReducer,
        tasks: tasksReducer,
        formats: formatsReducer,
        plugins: pluginsReducer,
    });
}
