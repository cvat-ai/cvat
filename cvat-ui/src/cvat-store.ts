// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import thunk from 'redux-thunk';
import {
    createStore, applyMiddleware, Store, Reducer,
} from 'redux';
import { createLogger } from 'redux-logger';
import { isDev } from 'utils/environment';
import createRootReducer from 'reducers/root-reducer';
import { CombinedState } from 'reducers';

const logger = createLogger({
    predicate: isDev,
    collapsed: true,
});

const middlewares = [thunk, logger];

let store: Store | null = null;

export default function createCVATStore(rootReducerCreator: () => Reducer): void {
    let appliedMiddlewares = applyMiddleware(...middlewares);

    if (!store) {
        if (isDev()) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
            const { composeWithDevTools } = require('redux-devtools-extension');

            appliedMiddlewares = composeWithDevTools(appliedMiddlewares);
        }

        store = createStore(rootReducerCreator(), appliedMiddlewares);
        store.subscribe(() => {
            const state = (store as Store).getState() as CombinedState;
            for (const plugin of Object.values(state.plugins.current)) {
                const { globalStateDidUpdate } = plugin;
                if (globalStateDidUpdate) {
                    globalStateDidUpdate(state);
                }
            }
        });
    }
}

export function getCVATStore(): Store<CombinedState> {
    if (!store) {
        createCVATStore(createRootReducer);
    }
    return store as Store<CombinedState>;
}
