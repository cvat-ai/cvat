import { History } from 'history';
import { Dispatch, ActionCreator } from 'redux';

import queryString from 'query-string';

import setQueryObject from '../utils/tasks-filter'


export const getTasks = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_TASKS',
  });
}

export const getTasksSuccess = (tasks: []) => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_TASKS_SUCCESS',
    payload: tasks,
  });
}

export const getTasksError = (error: {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_TASKS_ERROR',
    payload: error,
  });
}

export const createTask = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'CREATE_TASK',
  });
}

export const createTaskSuccess = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'CREATE_TASK_SUCCESS',
  });
}

export const createTaskError = (error: {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'CREATE_TASK_ERROR',
    payload: error,
  });
}

export const updateTask = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'UPDATE_TASK',
  });
}

export const updateTaskSuccess = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'UPDATE_TASK_SUCCESS',
  });
}

export const updateTaskError = (error: {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'UPDATE_TASK_ERROR',
    payload: error,
  });
}

export const deleteTask = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'DELETE_TASK',
  });
}

export const deleteTaskSuccess = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'DELETE_TASK_SUCCESS',
  });
}

export const deleteTaskError = (error: {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'DELETE_TASK_ERROR',
    payload: error,
  });
}

export const getTasksAsync = (queryObject = {}) => {
  return (dispatch: ActionCreator<Dispatch>) => {
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
  return (dispatch: ActionCreator<Dispatch>) => {
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
  return (dispatch: ActionCreator<Dispatch>) => {
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

export const deleteTaskAsync = (task: any, history: History) => {
  return (dispatch: ActionCreator<Dispatch>, getState: any) => {
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
