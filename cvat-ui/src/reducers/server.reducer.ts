export default (
  state = {
    files: [],
    isFetching: false,
    error: null,
  },
  action: any,
) => {
  switch (action.type) {
    case 'GET_SHARE_FILES':
      return Object.assign({}, state, {
        isFetching: true,
      });
    case 'GET_SHARE_FILES_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
        files: action.payload,
      });
    case 'GET_SHARE_FILES_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        error: action.payload,
      });
    default:
      return state;
  }
}
