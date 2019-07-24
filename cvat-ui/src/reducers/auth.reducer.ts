export default (state = {}, action: any) => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, isAuthenticated: action.payload };
    case 'LOGOUT':
      return { ...state, isAuthenticated: action.payload };
    default:
      return state;
  }
}
