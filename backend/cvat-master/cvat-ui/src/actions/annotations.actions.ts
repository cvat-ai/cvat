import { Dispatch, ActionCreator } from 'redux';


export const dumpAnnotation = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'DUMP_ANNOTATION',
  });
}

export const dumpAnnotationSuccess = (downloadLink: string) => (dispatch: Dispatch) => {
  dispatch({
    type: 'DUMP_ANNOTATION_SUCCESS',
    payload: downloadLink,
  });
}

export const dumpAnnotationError = (error = {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'DUMP_ANNOTATION_ERROR',
    payload: error,
  });
}

export const uploadAnnotation = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'UPLOAD_ANNOTATION',
  });
}

export const uploadAnnotationSuccess = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'UPLOAD_ANNOTATION_SUCCESS',
  });
}

export const uploadAnnotationError = (error = {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'UPLOAD_ANNOTATION_ERROR',
    payload: error,
  });
}

export const dumpAnnotationAsync = (task: any, dumper: any) => {
  return (dispatch: ActionCreator<Dispatch>) => {
    dispatch(dumpAnnotation());

    return task.annotations.dump(task.name, dumper).then(
      (downloadLink: string) => {
        dispatch(dumpAnnotationSuccess(downloadLink));
      },
      (error: any) => {
        dispatch(dumpAnnotationError(error));

        throw error;
      },
    );
  };
}

export const uploadAnnotationAsync = (task: any, file: File, loader: any) => {
  return (dispatch: ActionCreator<Dispatch>) => {
    dispatch(uploadAnnotation());

    return task.annotations.upload(file, loader).then(
      (response: any) => {
        dispatch(uploadAnnotationSuccess());
      },
      (error: any) => {
        dispatch(uploadAnnotationError(error));

        throw error;
      },
    );
  };
}
