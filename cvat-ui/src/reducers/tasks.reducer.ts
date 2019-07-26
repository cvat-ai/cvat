export default (state: any = { tasks: [], tasksCount: 0 }, action: any) => {
  switch (action.type) {
    case 'GET_TASKS':
      return {
        ...state,
        tasks: Array.from(action.payload.values()),
        tasksCount: action.payload.count,
      };
    default:
      return state;
  }
}
