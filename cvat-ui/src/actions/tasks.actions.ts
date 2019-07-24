export const getTasks = (tasks: []) => (dispatch: any) => {
  dispatch({
    type: 'GET_TASKS',
    payload: tasks,
  });
}

export const getTasksAsync = (queryObject = {}) => {
  return (dispatch: any) => {
    return (window as any).cvat.tasks.get(queryObject).then(
      (tasks: any) => {
        dispatch(getTasks(tasks));
      },
      (error: any) => {
        console.log(error);
      },
    );
  };
}
