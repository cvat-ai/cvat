import { combineReducers } from 'redux';

import authContext from './auth.reducer';
import tasks from './tasks.reducer';

export default combineReducers({
  authContext,
  tasks,
});
