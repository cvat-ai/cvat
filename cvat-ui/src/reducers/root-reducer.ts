import { combineReducers, Reducer } from 'redux';
import authReducer from './auth-reducer';
import tasksReducer from './tasks-reducer';

export default function createRootReducer(): Reducer {
    return combineReducers({
        auth: authReducer,
        tasks: tasksReducer,
    });
}
