export const login = (isAuthenticated: boolean) => (dispatch: any) => {
  dispatch({
    type: 'LOGIN',
    payload: isAuthenticated,
  });
}

export const logout = (isAuthenticated: boolean) => (dispatch: any) => {
  dispatch({
    type: 'LOGOUT',
    payload: isAuthenticated,
  });
}
