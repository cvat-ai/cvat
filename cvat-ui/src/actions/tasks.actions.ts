export const getTasks = (tasks: []) => (dispatch: any) => {
  dispatch({
    type: 'GET_TASKS',
    payload: tasks,
  });
}

export const getTasksAsync = () => {
  return (dispatch: any) => {
    return (window as any).cvat.tasks.get().then(
      (tasks: any) => {
        dispatch(getTasks(tasks));
      },
      (error: any) => {
        console.log(error);
      }
    );
  };
}
