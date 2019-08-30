export default (
  state = {
    isAuthenticated: false,
    isFetching: false,
    error: null,
  },
  action: any,
) => {
  switch (action.type) {
    case 'LOGIN':
      return Object.assign({}, state, {
        isFetching: true,
      });
    case 'LOGIN_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
        isAuthenticated: true,
      });
    case 'LOGIN_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        isAuthenticated: false,
        error: action.payload,
      });

    case 'LOGOUT':
      return Object.assign({}, state, {
        isFetching: true,
      });
    case 'LOGOUT_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
        isAuthenticated: false,
      });
    case 'LOGOUT_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        error: action.payload,
      });

    case 'IS_AUTHENTICATED':
      return Object.assign({}, state, {
        isFetching: true,
      });
    case 'IS_AUTHENTICATED_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
        isAuthenticated: true,
      });
    case 'IS_AUTHENTICATED_FAIL':
      return Object.assign({}, state, {
        isFetching: false,
        isAuthenticated: false,
      });

    case 'IS_AUTHENTICATED_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        error: action.payload,
      });
    case 'REGISTER':
      return Object.assign({}, state, {
        isFetching: true,
      });
    case 'REGISTER_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
      });
    case 'REGISTER_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        error: action.payload,
      });
    default:
      return state;
  }
}
