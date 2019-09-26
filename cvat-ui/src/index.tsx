import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import CVATApplication from './containers/cvat-app';
import createCVATStore from './store';

const cvatStore = createCVATStore();

ReactDOM.render(
    (
        <Provider store={cvatStore}>
            <CVATApplication />
        </Provider>
    ),
    document.getElementById('root')
)
