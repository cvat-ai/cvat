import { History } from 'history';
import { Dispatch, ActionCreator } from 'redux';


export const login = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'LOGIN',
  });
}

export const loginSuccess = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'LOGIN_SUCCESS',
  });
}

export const loginError = (error = {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'LOGIN_ERROR',
    payload: error,
  });
}

export const logout = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'LOGOUT',
  });
}

export const logoutSuccess = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'LOGOUT_SUCCESS',
  });
}

export const logoutError = (error = {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'LOGOUT_ERROR',
    payload: error,
  });
}

export const isAuthenticated = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'IS_AUTHENTICATED',
  });
}

export const isAuthenticatedSuccess = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'IS_AUTHENTICATED_SUCCESS',
  });
}

export const isAuthenticatedFail = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'IS_AUTHENTICATED_FAIL',
  });
}

export const isAuthenticatedError = (error = {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'IS_AUTHENTICATED_ERROR',
    payload: error,
  });
}

export const register = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'REGISTER',
  });
}

export const registerSuccess = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'REGISTER_SUCCESS',
  });
}

export const registerError = (error = {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'REGISTER_ERROR',
    payload: error,
  });
}

export const loginAsync = (username: string, password: string, history: History) => {
  return (dispatch: ActionCreator<Dispatch>) => {
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
  return (dispatch: ActionCreator<Dispatch>) => {
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
  return (dispatch: ActionCreator<Dispatch>) => {
    dispatch(isAuthenticated());

    return (window as any).cvat.server.authorized().then(
      (isAuthenticated: boolean) => {
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
  history: History,
) => {
  return (dispatch: ActionCreator<Dispatch>) => {
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

        history.replace('/login');
      },
      (error: any) => {
        dispatch(registerError(error));

        throw error;
      },
    );
  };
}
