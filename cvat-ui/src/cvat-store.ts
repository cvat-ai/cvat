import thunk from 'redux-thunk';
import {
    createStore,
    applyMiddleware,
    Store,
    Reducer,
} from 'redux';
import { createLogger } from 'redux-logger';
import { composeWithDevTools } from 'redux-devtools-extension';


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
    // todo enable devtools only in dev mode
    store = createStore(
        createRootReducer(),
        composeWithDevTools(applyMiddleware(...middlewares)),
    );
}

export function getCVATStore(): Store {
    if (store) {
        return store;
    }

    throw new Error('First create a store');
}
