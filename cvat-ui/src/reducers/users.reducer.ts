export default (
  state: any = {
    users: [],
    currentUser: null,
    isFetching: false,
    error: null,
  },
  action: any,
) => {
  switch (action.type) {
    case 'GET_USERS':
      return Object.assign({}, state, {
        isFetching: true,
      });
    case 'GET_USERS_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
        users: Array.from(action.payload.values()),
        currentUser: action.currentUser,
      });
    case 'GET_USERS_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        error: action.payload,
      });
    default:
      return state;
  }
}
