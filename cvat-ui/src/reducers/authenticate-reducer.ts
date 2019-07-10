export default (state = {}, action: any) => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, isLoggedIn: action.payload };
    case 'LOGOUT':
      return { ...state, isLoggedIn: action.payload };
    default:
      return state;
  }
}
