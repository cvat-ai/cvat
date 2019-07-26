export default (
  state = {
    searchQuery: '',
    currentPage: 1
  },
  action: any,
) => {
  switch (action.type) {
    case 'FILTER_TASKS':
      return Object.assign({}, state, {
        searchQuery: action.payload.search,
        currentPage: action.payload.page,
      });
    default:
      return state;
  }
}
