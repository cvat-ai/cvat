import { combineReducers } from 'redux';

import authContext from './auth.reducer';
import tasks from './tasks.reducer';
import tasksFilter from './tasks-filter.reducer';
import shareFiles from './server.reducer';

export default combineReducers({
  authContext,
  tasks,
  tasksFilter,
  shareFiles,
});
