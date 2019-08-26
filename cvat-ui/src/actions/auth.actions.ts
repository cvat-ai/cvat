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

export const isAuthenticatedSuccess = () => (dispatch: any) => {
  dispatch({
    type: 'IS_AUTHENTICATED_SUCCESS',
  });
}

export const isAuthenticatedFail = () => (dispatch: any) => {
  dispatch({
    type: 'IS_AUTHENTICATED_FAIL',
  });
}

export const isAuthenticatedError = (error = {}) => (dispatch: any) => {
  dispatch({
    type: 'IS_AUTHENTICATED_ERROR',
    payload: error,
  });
}

export const register = () => (dispatch: any) => {
  dispatch({
    type: 'REGISTER',
  });
}

export const registerSuccess = () => (dispatch: any) => {
  dispatch({
    type: 'REGISTER_SUCCESS',
  });
}

export const registerError = (error = {}) => (dispatch: any) => {
  dispatch({
    type: 'REGISTER_ERROR',
    payload: error,
  });
}

export const loginAsync = (username: string, password: string, history: any) => {
  return (dispatch: any) => {
    dispatch(login());

    return (window as any).cvat.server.login(username, password).then(
      (loggedIn: any) => {
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
        isAuthenticated ? dispatch(isAuthenticatedSuccess()) : dispatch(isAuthenticatedFail());
      },
      (error: any) => {
        dispatch(isAuthenticatedError(error));

        throw error;
      },
    );
  };
}

export const registerAsync = (
  username: string,
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  passwordConfirmation: string,
) => {
  return (dispatch: any) => {
    dispatch(register());

    return (window as any).cvat.server.register(
      username,
      firstName,
      lastName,
      email,
      password,
      passwordConfirmation,
    ).then(
      (registered: any) => {
        dispatch(registerSuccess());
      },
      (error: any) => {
        dispatch(registerError(error));

        throw error;
      },
    );
  };
}
