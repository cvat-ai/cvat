export const login = () => (dispatch: any) => {
  dispatch({
    type: 'LOGIN',
  });
}

export const loginSuccess = () => (dispatch: any) => {
  dispatch({
    type: 'LOGIN_SUCCESS',
  });
}

export const loginError = (error = {}) => (dispatch: any) => {
  dispatch({
    type: 'LOGIN_ERROR',
    payload: error,
  });
}

export const loginAsync = (username: string, password: string) => {
  return (dispatch: any) => {
    dispatch(login());

    return (window as any).cvat.server.login(username, password).then(
      (authenticated: any) => {
        dispatch(loginSuccess());
      },
      (error: any) => {
        dispatch(loginError(error));
      },
    );
  };
}
