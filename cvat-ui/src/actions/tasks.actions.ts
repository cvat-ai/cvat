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

export const deleteTaskAsync = (task: any) => {
  return (dispatch: any) => {
    dispatch(deleteTask());

    return task.delete().then(
      (deleted: any) => {
        dispatch(deleteTaskSuccess());
        dispatch(getTasksAsync());
      },
      (error: any) => {
        dispatch(deleteTaskError(error));
      },
    );
  };
}
