export default (
  state = {
    downloadLink: null,
    isFetching: false,
    error: null,
  },
  action: any,
) => {
  switch (action.type) {
    case 'DUMP_ANNOTATION':
      return Object.assign({}, state, {
        isFetching: true,
      });
    case 'DUMP_ANNOTATION_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
        downloadLink: action.payload,
      });
    case 'DUMP_ANNOTATION_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        error: action.payload,
      });
    case 'UPLOAD_ANNOTATION':
      return Object.assign({}, state, {
        isFetching: true,
      });
    case 'UPLOAD_ANNOTATION_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
      });
    case 'UPLOAD_ANNOTATION_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        error: action.payload,
      });
    default:
      return state;
  }
}
