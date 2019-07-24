export default (state = { searchQuery: '', currentPage: 1 }, action: any) => {
  switch (action.type) {
    case 'FILTER_TASKS':
      return {
        ...state,
        searchQuery: action.payload.search,
        currentPage: action.payload.page,
      };
    default:
      return state;
  }
}
