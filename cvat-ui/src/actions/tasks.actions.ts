import queryString from 'query-string';

import setQueryObject from '../utils/tasks-filter-dto'


export const getTasks = () => (dispatch: any, getState: any) => {
  dispatch({
    type: 'GET_TASKS',
  });
}

export const getTasksSuccess = (tasks: []) => (dispatch: any, getState: any) => {
  dispatch({
    type: 'GET_TASKS_SUCCESS',
    payload: tasks,
  });
}

export const getTasksError = (error: {}) => (dispatch: any, getState: any) => {
  dispatch({
    type: 'GET_TASKS_ERROR',
    payload: error,
  });
}

export const deleteTask = () => (dispatch: any, getState: any) => {
  dispatch({
    type: 'DELETE_TASK',
  });
}

export const deleteTaskSuccess = () => (dispatch: any, getState: any) => {
  dispatch({
    type: 'DELETE_TASK_SUCCESS',
  });
}

export const deleteTaskError = (error: {}) => (dispatch: any, getState: any) => {
  dispatch({
    type: 'DELETE_TASK_ERROR',
    payload: error,
  });
}

export const getTasksAsync = (queryObject = {}) => {
  return (dispatch: any) => {
    dispatch(getTasks());

    return (window as any).cvat.tasks.get(queryObject).then(
      (tasks: any) => {
        dispatch(getTasksSuccess(tasks));
      },
      (error: any) => {
        dispatch(getTasksError(error));
      },
    );
  };
}

export const deleteTaskAsync = (task: any, history: any) => {
  return (dispatch: any, getState: any) => {
    dispatch(deleteTask());

    return task.delete().then(
      (deleted: any) => {
        dispatch(deleteTaskSuccess());

        const state = getState();

        const queryObject = {
          page: state.tasksFilter.currentPage,
          search: state.tasksFilter.searchQuery,
        }

        if (state.tasks.tasks.length === 1 && state.tasks.tasksCount !== 1) {
          queryObject.page = queryObject.page - 1;

          history.push({ search: queryString.stringify(queryObject) });
        } else if (state.tasks.tasksCount === 1) {
          dispatch(getTasksAsync());
        } else {
          const query = setQueryObject(queryObject);
          dispatch(getTasksAsync(query));
        }
      },
      (error: any) => {
        dispatch(deleteTaskError(error));
      },
    );
  };
}
