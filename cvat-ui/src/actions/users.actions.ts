import { Dispatch, ActionCreator } from 'redux';


export const getUsers = () => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_USERS',
  });
}

export const getUsersSuccess = (users: [], isCurrentUser: boolean) => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_USERS_SUCCESS',
    payload: users,
    currentUser: isCurrentUser ? (users as any)[0] : isCurrentUser,
  });
}

export const getUsersError = (error: {}) => (dispatch: Dispatch) => {
  dispatch({
    type: 'GET_USERS_ERROR',
    payload: error,
  });
}

export const getUsersAsync = (filter = {}) => {
  return (dispatch: ActionCreator<Dispatch>) => {
    dispatch(getUsers());

    return (window as any).cvat.users.get(filter).then(
      (users: any) => {
        dispatch(getUsersSuccess(users, (filter as any).self));
      },
      (error: any) => {
        dispatch(getUsersError(error));

        throw error;
      },
    );
  };
}
