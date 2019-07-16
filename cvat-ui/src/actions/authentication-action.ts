export const loginAction = () => (dispatch: any) => {
  dispatch({
    type: 'LOGIN',
    payload: true,
  })
}

export const logoutAction = () => (dispatch: any) => {
  dispatch({
    type: 'LOGOUT',
    payload: false,
  })
}
