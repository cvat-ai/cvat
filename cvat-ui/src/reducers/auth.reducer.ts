import { AnyAction } from 'redux';


export default (
  state = {
    isAuthenticated: false,
    isFetching: false,
    error: null,
  },
  action: AnyAction,
) => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, isFetching: true };
    case 'LOGIN_SUCCESS':
      return { ...state, isFetching: false, isAuthenticated: true };
    case 'LOGIN_ERROR':
      return { ...state, isFetching: false, isAuthenticated: false, error: action.payload };

    case 'LOGOUT':
      return { ...state, isFetching: true };
    case 'LOGOUT_SUCCESS':
      return { ...state, isFetching: false, isAuthenticated: false };
    case 'LOGOUT_ERROR':
      return { ...state, isFetching: false, error: action.payload };

    case 'IS_AUTHENTICATED':
      return { ...state, isFetching: true };
    case 'IS_AUTHENTICATED_SUCCESS':
      return { ...state, isFetching: false, isAuthenticated: true };
    case 'IS_AUTHENTICATED_FAIL':
      return { ...state, isFetching: false, isAuthenticated: false };

    case 'IS_AUTHENTICATED_ERROR':
      return { ...state, isFetching: false, error: action.payload };
    case 'REGISTER':
      return { ...state, isFetching: true };
    case 'REGISTER_SUCCESS':
      return { ...state, isFetching: false };
    case 'REGISTER_ERROR':
      return { ...state, isFetching: false, error: action.payload };
    default:
      return state;
  }
}
