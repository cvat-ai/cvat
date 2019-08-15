import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger'

import rootReducer from './reducers/root.reducer';

export default function configureStore(initialState = {}) {
  const logger = createLogger({
    collapsed: true,
  });

  const middlewares = [];

  middlewares.push(thunk);

  if (process.env.NODE_ENV === `development`) {
    middlewares.push(logger);
  }

  return createStore(
    rootReducer,
    initialState,
    compose(
      applyMiddleware(...middlewares),
      (window as any).__REDUX_DEVTOOLS_EXTENSION__
        ?
      (window as any).__REDUX_DEVTOOLS_EXTENSION__({ trace: true })
        :
      (f: any) => f
    )
  );
}
