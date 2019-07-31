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

export const loginAsync = (username: string, password: string, history: any) => {
  return (dispatch: any) => {
    dispatch(login());

    return (window as any).cvat.server.login(username, password).then(
      (authenticated: any) => {
        localStorage.setItem('session', 'true');
        dispatch(loginSuccess());
        history.push(history.location.state ? history.location.state.from : '/dashboard');
      },
      (error: any) => {
        dispatch(loginError(error));
      },
    );
  };
}
