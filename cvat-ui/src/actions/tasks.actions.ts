import queryString from 'query-string';

import setQueryObject from '../utils/tasks-filter'


export const getTasks = () => (dispatch: any) => {
  dispatch({
    type: 'GET_TASKS',
  });
}

export const getTasksSuccess = (tasks: []) => (dispatch: any) => {
  dispatch({
    type: 'GET_TASKS_SUCCESS',
    payload: tasks,
  });
}

export const getTasksError = (error: {}) => (dispatch: any) => {
  dispatch({
    type: 'GET_TASKS_ERROR',
    payload: error,
  });
}

export const createTask = () => (dispatch: any) => {
  dispatch({
    type: 'CREATE_TASK',
  });
}

export const createTaskSuccess = () => (dispatch: any) => {
  dispatch({
    type: 'CREATE_TASK_SUCCESS',
  });
}

export const createTaskError = (error: {}) => (dispatch: any) => {
  dispatch({
    type: 'CREATE_TASK_ERROR',
    payload: error,
  });
}

export const updateTask = () => (dispatch: any) => {
  dispatch({
    type: 'UPDATE_TASK',
  });
}

export const updateTaskSuccess = () => (dispatch: any) => {
  dispatch({
    type: 'UPDATE_TASK_SUCCESS',
  });
}

export const updateTaskError = (error: {}) => (dispatch: any) => {
  dispatch({
    type: 'UPDATE_TASK_ERROR',
    payload: error,
  });
}

export const deleteTask = () => (dispatch: any) => {
  dispatch({
    type: 'DELETE_TASK',
  });
}

export const deleteTaskSuccess = () => (dispatch: any) => {
  dispatch({
    type: 'DELETE_TASK_SUCCESS',
  });
}

export const deleteTaskError = (error: {}) => (dispatch: any) => {
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

        throw error;
      },
    );
  };
}

export const createTaskAsync = (task: any) => {
  return (dispatch: any) => {
    dispatch(createTask());

    return task.save().then(
      (created: any) => {
        dispatch(createTaskSuccess());

        return dispatch(getTasksAsync());
      },
      (error: any) => {
        dispatch(createTaskError(error));

        throw error;
      },
    );
  };
}

export const updateTaskAsync = (task: any) => {
  return (dispatch: any) => {
    dispatch(updateTask());

    return task.save().then(
      (updated: any) => {
        dispatch(updateTaskSuccess());

        return dispatch(getTasksAsync());
      },
      (error: any) => {
        dispatch(updateTaskError(error));

        throw error;
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
          return dispatch(getTasksAsync());
        } else {
          const query = setQueryObject(queryObject);

          return dispatch(getTasksAsync(query));
        }
      },
      (error: any) => {
        dispatch(deleteTaskError(error));

        throw error;
      },
    );
  };
}
