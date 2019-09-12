import { Dispatch } from 'redux';


export const filterTasks = (queryParams: { search?: string, page?: number }) => (dispatch: Dispatch) => {
  dispatch({
    type: 'FILTER_TASKS',
    payload: queryParams,
  });
}
