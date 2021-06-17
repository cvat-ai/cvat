// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { CloudStorageActions, CloudStorageActionTypes } from 'actions/cloud-storage-actions';
import { AuthActions, AuthActionTypes } from 'actions/auth-actions';
import { CloudStoragesState } from './interfaces';

const defaultState: CloudStoragesState = {
    initialized: false,
    fetching: false,
    count: 0,
    current: [],
    gettingList: {
        id: null,
        search: null,
        owner: null,
        displayName: null,
    },
    gettingQuery: {
        page: 1,
        id: null,
        search: null,
        owner: null,
        displayName: null,
        status: null,
    },
    activities: {
        creates: {
            id: null,
            error: '',
        },
        updates: {
            cloudstorageId: null,
            error: '',
        },
        deletes: {},
    },
};

export default (
    state: CloudStoragesState = defaultState,
    action: CloudStorageActions | AuthActions,
): CloudStoragesState => {
    switch (action.type) {
        case CloudStorageActionTypes.GET_CLOUD_STORAGES:
            return {
                ...state,
                initialized: false,
                fetching: true,
                count: 0,
                current: [],
            };
        case CloudStorageActionTypes.GET_CLOUD_STORAGE_SUCCESS: {
            const { array, count, query } = action.payload;
            return {
                ...state,
                initialized: true,
                fetching: false,
                count,
                gettingQuery: query,
                current: array,
            };
        }
        case CloudStorageActionTypes.GET_CLOUD_STORAGE_FAILED: {
            return {
                ...state,
                initialized: true,
                fetching: false,
            };
        }
        case CloudStorageActionTypes.CREATE_CLOUD_STORAGE: {
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        id: null,
                        error: '',
                    },
                },
            };
        }
        case CloudStorageActionTypes.CREATE_CLOUD_STORAGE_SUCCESS: {
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        id: action.payload.cloudStorageID,
                        error: '',
                    },
                },
            };
        }
        case CloudStorageActionTypes.CREATE_CLOUD_STORAGE_FAILED: {
            return {
                ...state,
                activities: {
                    ...state.activities,
                    creates: {
                        ...state.activities.creates,
                        error: action.payload.error.toString(),
                    },
                },
            };
        }
        // case CloudStorageActionTypes.UPDATE_CLOUD_STORAGE: {
        //     return {
        //         ...state,
        //     };
        // }
        // case CloudStorageActionTypes.UPDATE_CLOUD_STORAGE_SUCCESS: {
        //     return {
        //         ...state,
        //         current: state.current.map(
        //             (cloudStorage: CloudStorage): CloudStorage => {
        //                 if (cloudStorage.id === action.payload.cloudStorage.id) {
        //                     return action.payload.cloudStorage;
        //                 }

        //                 return cloudStorage;
        //             },
        //         ),
        //     };
        // }
        // case CloudStorageActionTypes.UPDATE_CLOUD_STORAGE_FAILED: {
        //     return {
        //         ...state,
        //         current: state.current.map(
        //             (cloudStorage: CloudStorage): CloudStorage => {
        //                 if (cloudStorage.id === action.payload.cloudStorage.id) {
        //                     return action.payload.cloudStorage;
        //                 }

        //                 return cloudStorage;
        //             },
        //         ),
        //     };
        // }
        case CloudStorageActionTypes.DELETE_CLOUD_STORAGE: {
            const { cloudStorageID } = action.payload;
            const { deletes } = state.activities;

            deletes[cloudStorageID] = false;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...deletes,
                    },
                },
            };
        }
        case CloudStorageActionTypes.DELETE_CLOUD_STORAGE_SUCCESS: {
            const { cloudStorageID } = action.payload;
            const { deletes } = state.activities;

            deletes[cloudStorageID] = true;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...deletes,
                    },
                },
            };
        }
        case CloudStorageActionTypes.DELETE_CLOUD_STORAGE_FAILED: {
            const { cloudStorageID } = action.payload;
            const { deletes } = state.activities;

            delete deletes[cloudStorageID];

            return {
                ...state,
                activities: {
                    ...state.activities,
                    deletes: {
                        ...deletes,
                    },
                },
            };
        }
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        default:
            return state;
    }
};
