import { AnyAction } from 'redux';


export default (
  state: any = {
    tasks: [],
    tasksCount: 0,
    isFetching: false,
    error: null,
  },
  action: AnyAction,
) => {
  switch (action.type) {
    case 'GET_TASKS':
      return { ...state, isFetching: true };
    case 'GET_TASKS_SUCCESS':
      return { ...state, isFetching: false, tasks: Array.from(action.payload.values()), tasksCount: action.payload.count };
    case 'GET_TASKS_ERROR':
      return { ...state, isFetching: false, error: action.payload };

    case 'CREATE_TASK':
      return { ...state, isFetching: true };
    case 'CREATE_TASK_SUCCESS':
      return { ...state, isFetching: false };
    case 'CREATE_TASK_ERROR':
      return { ...state, isFetching: false, error: action.payload };

    case 'UPDATE_TASK':
      return { ...state, isFetching: true };
    case 'UPDATE_TASK_SUCCESS':
      return { ...state, isFetching: false };
    case 'UPDATE_TASK_ERROR':
      return { ...state, isFetching: false, error: action.payload };

    case 'DELETE_TASK':
      return { ...state, isFetching: true };
    case 'DELETE_TASK_SUCCESS':
      return { ...state, isFetching: false };
    case 'DELETE_TASK_ERROR':
      return { ...state, isFetching: false, error: action.payload };
    default:
      return state;
  }
}
