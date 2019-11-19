import { combineReducers, Reducer } from 'redux';
import authReducer from './auth-reducer';
import tasksReducer from './tasks-reducer';
import usersReducer from './users-reducer';
import shareReducer from './share-reducer';
import formatsReducer from './formats-reducer';
import pluginsReducer from './plugins-reducer';
import modelsReducer from './models-reducer';

import {
    AuthState,
    TasksState,
    UsersState,
    ShareState,
    FormatsState,
    PluginsState,
    ModelsState,
} from './interfaces';

export interface CombinedState {
    auth: AuthState;
    tasks: TasksState;
    users: UsersState;
    share: ShareState;
    formats: FormatsState;
    plugins: PluginsState;
    models: ModelsState;
}

export default function createRootReducer(): Reducer {
    return combineReducers({
        auth: authReducer,
        tasks: tasksReducer,
        users: usersReducer,
        share: shareReducer,
        formats: formatsReducer,
        plugins: pluginsReducer,
        models: modelsReducer,
    });
}
