import { AnyAction } from 'redux';


export default (
  state = {
    downloadLink: null,
    isFetching: false,
    error: null,
  },
  action: AnyAction,
) => {
  switch (action.type) {
    case 'DUMP_ANNOTATION':
      return { ...state, isFetching: true };
    case 'DUMP_ANNOTATION_SUCCESS':
      return { ...state, isFetching: false, downloadLink: action.payload };
    case 'DUMP_ANNOTATION_ERROR':
      return { ...state, isFetching: false, error: action.payload };

    case 'UPLOAD_ANNOTATION':
      return { ...state, isFetching: true };
    case 'UPLOAD_ANNOTATION_SUCCESS':
      return { ...state, isFetching: false };
    case 'UPLOAD_ANNOTATION_ERROR':
      return { ...state, isFetching: false, error: action.payload };
    default:
      return state;
  }
}
