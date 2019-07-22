export const login = () => (dispatch: any) => {
  dispatch({
    type: 'LOGIN',
    payload: true,
  });
}

export const logout = () => (dispatch: any) => {
  dispatch({
    type: 'LOGOUT',
    payload: false,
  });
}
