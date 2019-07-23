export default (state = { tasks: [] }, action: any) => {
  switch (action.type) {
    case 'GET_TASKS':
      return { ...state, tasks: action.payload };
    default:
      return state;
  }
}
