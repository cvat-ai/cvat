import { combineReducers, Reducer } from 'redux';
import authReducer from './auth-reducer';

export default function createRootReducer(): Reducer {
    return combineReducers({
        auth: authReducer,
    });
}
