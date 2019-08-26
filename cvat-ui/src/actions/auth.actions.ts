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

export const logout = () => (dispatch: any) => {
  dispatch({
    type: 'LOGOUT',
  });
}

export const logoutSuccess = () => (dispatch: any) => {
  dispatch({
    type: 'LOGOUT_SUCCESS',
  });
}

export const logoutError = (error = {}) => (dispatch: any) => {
  dispatch({
    type: 'LOGOUT_ERROR',
    payload: error,
  });
}

export const isAuthenticated = () => (dispatch: any) => {
  dispatch({
    type: 'IS_AUTHENTICATED',
  });
}

export const isAuthenticatedSuccess = (isAuthenticated: boolean) => (dispatch: any) => {
  dispatch({
    type: 'IS_AUTHENTICATED_SUCCESS',
    payload: isAuthenticated,
  });
}

export const isAuthenticatedError = (error = {}) => (dispatch: any) => {
  dispatch({
    type: 'IS_AUTHENTICATED_ERROR',
    payload: error,
  });
}

export const loginAsync = (username: string, password: string, history: any) => {
  return (dispatch: any) => {
    dispatch(login());

    return (window as any).cvat.server.login(username, password).then(
      (loggedIn: any) => {
        localStorage.setItem('session', 'true');
        dispatch(loginSuccess());
        history.push(history.location.state ? history.location.state.from : '/tasks');
      },
      (error: any) => {
        dispatch(loginError(error));

        throw error;
      },
    );
  };
}

export const logoutAsync = () => {
  return (dispatch: any) => {
    dispatch(logout());

    return (window as any).cvat.server.logout().then(
      (loggedOut: any) => {
        localStorage.removeItem('session');
        dispatch(logoutSuccess());
      },
      (error: any) => {
        dispatch(logoutError(error));

        throw error;
      },
    );
  };
}

export const isAuthenticatedAsync = () => {
  return (dispatch: any) => {
    dispatch(isAuthenticated());

    return (window as any).cvat.server.authorized().then(
      (isAuthenticated: any) => {
        dispatch(isAuthenticatedSuccess(isAuthenticated));
      },
      (error: any) => {
        dispatch(isAuthenticatedError(error));

        throw error;
      },
    );
  };
}
