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
    default:
      return state;
  }
}
