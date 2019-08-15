export const dumpAnnotation = () => (dispatch: any) => {
  dispatch({
    type: 'DUMP_ANNOTATION',
  });
}

export const dumpAnnotationSuccess = (downloadLink: string) => (dispatch: any) => {
  dispatch({
    type: 'DUMP_ANNOTATION_SUCCESS',
    payload: downloadLink,
  });
}

export const dumpAnnotationError = (error = {}) => (dispatch: any) => {
  dispatch({
    type: 'DUMP_ANNOTATION_ERROR',
    payload: error,
  });
}

export const uploadAnnotation = () => (dispatch: any) => {
  dispatch({
    type: 'UPLOAD_ANNOTATION',
  });
}

export const uploadAnnotationSuccess = () => (dispatch: any) => {
  dispatch({
    type: 'UPLOAD_ANNOTATION_SUCCESS',
  });
}

export const uploadAnnotationError = (error = {}) => (dispatch: any) => {
  dispatch({
    type: 'UPLOAD_ANNOTATION_ERROR',
    payload: error,
  });
}

export const dumpAnnotationAsync = (task: any, dumper: any) => {
  return (dispatch: any) => {
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
  return (dispatch: any) => {
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
