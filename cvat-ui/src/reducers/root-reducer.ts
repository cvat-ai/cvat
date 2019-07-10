import { combineReducers } from 'redux';

import authenticationReducer from './authenticate-reducer';

export default combineReducers({
  authenticationReducer,
});
