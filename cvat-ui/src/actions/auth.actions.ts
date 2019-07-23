export const login = (isLoggedIn: boolean) => (dispatch: any) => {
  dispatch({
    type: 'LOGIN',
    payload: isLoggedIn,
  });
}

export const logout = (isLoggedIn: boolean) => (dispatch: any) => {
  dispatch({
    type: 'LOGOUT',
    payload: isLoggedIn,
  });
}
