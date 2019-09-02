import { Dispatch, ActionCreator } from 'redux';


export const getServerInfo = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_SERVER_INFO',
  });
}

export const getServerInfoSuccess = (information: null) => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_SERVER_INFO_SUCCESS',
    payload: information,
  });
}

export const getServerInfoError = (error = {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_SERVER_INFO_ERROR',
    payload: error,
  });
}

export const getShareFiles = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_SHARE_FILES',
  });
}

export const getShareFilesSuccess = (files: []) => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_SHARE_FILES_SUCCESS',
    payload: files,
  });
}

export const getShareFilesError = (error = {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_SHARE_FILES_ERROR',
    payload: error,
  });
}

export const getAnnotationFormats = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_ANNOTATION_FORMATS',
  });
}

export const getAnnotationFormatsSuccess = (annotationFormats: []) => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_ANNOTATION_FORMATS_SUCCESS',
    payload: annotationFormats,
  });
}

export const getAnnotationFormatsError = (error = {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_ANNOTATION_FORMATS_ERROR',
    payload: error,
  });
}

export const getServerInfoAsync = () => {
  return (dispatch: ActionCreator<Dispatch>) => {
    dispatch(getServerInfo());

    return (window as any).cvat.server.about().then(
      (information: any) => {
        dispatch(getServerInfoSuccess(information));
      },
      (error: any) => {
        dispatch(getServerInfoError(error));
      },
    );
  };
}

export const getShareFilesAsync = (directory: string) => {
  return (dispatch: ActionCreator<Dispatch>) => {
    dispatch(getShareFiles());

    return (window as any).cvat.server.share(directory).then(
      (files: any) => {
        dispatch(getShareFilesSuccess(files));
      },
      (error: any) => {
        dispatch(getShareFilesError(error));
      },
    );
  };
}

export const getAnnotationFormatsAsync = () => {
  return (dispatch: ActionCreator<Dispatch>) => {
    dispatch(getAnnotationFormats());

    return (window as any).cvat.server.formats().then(
      (formats: any) => {
        dispatch(getAnnotationFormatsSuccess(formats));
      },
      (error: any) => {
        dispatch(getAnnotationFormatsError(error));

        throw error;
      },
    );
  };
}
