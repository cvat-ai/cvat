import { AnyAction } from 'redux';


export default (
  state: any = {
    users: [],
    currentUser: null,
    isFetching: false,
    error: null,
  },
  action: AnyAction,
) => {
  switch (action.type) {
    case 'GET_USERS':
      return { ...state, isFetching: true };
    case 'GET_USERS_SUCCESS':
      return { ...state, isFetching: false, users: Array.from(action.payload.values()), currentUser: action.currentUser };
    case 'GET_USERS_ERROR':
      return { ...state, isFetching: false, error: action.payload };
    default:
      return state;
  }
}
