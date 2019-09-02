import { AnyAction } from 'redux';


export default (
  state = {
    info: null,
    files: [],
    annotationFormats: [],
    isFetching: false,
    error: null,
  },
  action: AnyAction,
) => {
  switch (action.type) {
    case 'GET_SERVER_INFO':
      return { ...state, isFetching: true };
    case 'GET_SERVER_INFO_SUCCESS':
      return { ...state, isFetching: false, info: action.payload };
    case 'GET_SERVER_INFO_ERROR':
      return { ...state, isFetching: false, error: action.payload };

    case 'GET_SHARE_FILES':
      return { ...state, isFetching: true };
    case 'GET_SHARE_FILES_SUCCESS':
      return { ...state, isFetching: false, files: action.payload };
    case 'GET_SHARE_FILES_ERROR':
      return { ...state, isFetching: false, error: action.payload };

    case 'GET_ANNOTATION_FORMATS':
      return { ...state, isFetching: true };
    case 'GET_ANNOTATION_FORMATS_SUCCESS':
      return { ...state, isFetching: false, annotationFormats: action.payload };
    case 'GET_ANNOTATION_FORMATS_ERROR':
      return { ...state, isFetching: false, error: action.payload };
    default:
      return state;
  }
}
