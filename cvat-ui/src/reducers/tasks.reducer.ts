export default (
  state: any = {
    tasks: [],
    tasksCount: 0,
    isFetching: false,
    error: null,
  },
  action: any,
) => {
  switch (action.type) {
    case 'GET_TASKS':
      return Object.assign({}, state, {
        isFetching: true,
      });
    case 'GET_TASKS_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
        tasks: Array.from(action.payload.values()),
        tasksCount: action.payload.count,
      });
    case 'GET_TASKS_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        error: action.payload,
      });

    case 'DELETE_TASK':
      return Object.assign({}, state, {
        isFetching: true,
      });

    case 'DELETE_TASK_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
      });

    case 'DELETE_TASK_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        error: action.payload,
      });
    default:
      return state;
  }
}
