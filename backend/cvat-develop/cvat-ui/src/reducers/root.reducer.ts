import { combineReducers, AnyAction } from 'redux';

import authContext from './auth.reducer';
import tasks from './tasks.reducer';
import users from './users.reducer';
import tasksFilter from './tasks-filter.reducer';
import server from './server.reducer';
import annotations from './annotations.reducer';


// TODO: investigate a better way to handle
// INFO: global errors handler reducer
const errorMessage = (state = null, action: AnyAction) => {
  const { type, payload } = action;

  if (type === 'RESET_ERROR_MESSAGE') {
    return null;
  } else if (type.endsWith('ERROR')) {
    return payload;
  }

  return state;
}

export default combineReducers({
  authContext,
  tasks,
  users,
  tasksFilter,
  server,
  annotations,
  errorMessage,
});
