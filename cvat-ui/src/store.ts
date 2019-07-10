import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';

import rootReducer from './reducers/root-reducer';

export default function configureStore(initialState = {}) {
  return createStore(
    rootReducer,
    initialState,
    compose(
      applyMiddleware(thunk),
      (window as any).__REDUX_DEVTOOLS_EXTENSION__
        ?
      (window as any).__REDUX_DEVTOOLS_EXTENSION__({ trace: true })
        :
      (f: any) => f
    )
  );
}
