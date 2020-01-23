import thunk from 'redux-thunk';
import {
    createStore,
    applyMiddleware,
    Store,
    Reducer,
} from 'redux';
import { createLogger } from 'redux-logger';


const logger = createLogger({
    predicate: () => process.env.NODE_ENV === 'development',
    collapsed: true,
});

const middlewares = [
    thunk,
    logger,
];

let store: Store | null = null;

export default function createCVATStore(createRootReducer: () => Reducer): void {
    store = createStore(
        createRootReducer(),
        applyMiddleware(...middlewares),
    );
}

export function getCVATStore(): Store {
    if (store) {
        return store;
    }

    throw new Error('First create a store');
}
