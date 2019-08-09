export const getShareFiles = () => (dispatch: any) => {
  dispatch({
    type: 'GET_SHARE_FILES',
  });
}

export const getShareFilesSuccess = (files: []) => (dispatch: any) => {
  dispatch({
    type: 'GET_SHARE_FILES_SUCCESS',
    payload: files,
  });
}

export const getShareFilesError = (error = {}) => (dispatch: any) => {
  dispatch({
    type: 'GET_SHARE_FILES_ERROR',
    payload: error,
  });
}

export const getShareFilesAsync = (directory: string) => {
  return (dispatch: any) => {
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
