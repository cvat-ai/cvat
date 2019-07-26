export const filterTasks = (queryParams: { search?: string, page?: number }) => (dispatch: any) => {
  dispatch({
    type: 'FILTER_TASKS',
    payload: queryParams,
  });
}
