import thunk from 'redux-thunk';
import { createStore, applyMiddleware, Store } from 'redux';

import createRootReducer from './reducers/root-reducer';

const middlewares = [
    thunk,
];

export default function createCVATStore(): Store {
    return createStore(
        createRootReducer(),
        applyMiddleware(...middlewares),
    );
}
