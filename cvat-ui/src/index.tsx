import React from 'react';
import ReactDOM from 'react-dom';

import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';

import rootReducer from './reducers/root-reducer';
import CVATApplication from './containers/cvat-app';

const middlewares = [thunk];
const cvatStore = createStore(rootReducer, applyMiddleware(...middlewares))

ReactDOM.render(
    (
        <Provider store={cvatStore}>
            <CVATApplication />
        </Provider>
    ),
    document.getElementById('root')
)
