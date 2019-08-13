export default (
  state = {
    info: null,
    files: [],
    annotationFormats: [],
    isFetching: false,
    error: null,
  },
  action: any,
) => {
  switch (action.type) {
    case 'GET_SERVER_INFO':
      return Object.assign({}, state, {
        isFetching: true,
      });
    case 'GET_SERVER_INFO_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
        info: action.payload,
      });
    case 'GET_SERVER_INFO_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        error: action.payload,
      });
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
    case 'GET_ANNOTATION_FORMATS':
      return Object.assign({}, state, {
        isFetching: true,
      });
    case 'GET_ANNOTATION_FORMATS_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
        annotationFormats: action.payload,
      });
    case 'GET_ANNOTATION_FORMATS_ERROR':
      return Object.assign({}, state, {
        isFetching: false,
        error: action.payload,
      });
    default:
      return state;
  }
}
