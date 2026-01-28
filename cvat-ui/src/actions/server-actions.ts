// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { getCore, SerializedAPISchema } from 'cvat-core-wrapper';

const core = getCore();

export enum ServerAPIActionTypes {
    GET_SERVER_API_SCHEMA = 'GET_SERVER_API_SCHEMA',
    GET_SERVER_API_SCHEMA_SUCCESS = 'GET_SERVER_API_SCHEMA_SUCCESS',
    GET_SERVER_API_SCHEMA_FAILED = 'GET_SERVER_API_SCHEMA_FAILED',
}

const serverAPIActions = {
    getServerAPISchema: () => createAction(ServerAPIActionTypes.GET_SERVER_API_SCHEMA),
    getServerAPISchemaSuccess: (schema: SerializedAPISchema) => (
        createAction(ServerAPIActionTypes.GET_SERVER_API_SCHEMA_SUCCESS, { schema })
    ),
    getServerAPISchemaFailed: (error: any) => (
        createAction(ServerAPIActionTypes.GET_SERVER_API_SCHEMA_FAILED, { error })
    ),
};

export type ServerAPIActions = ActionUnion<typeof serverAPIActions>;

export const getServerAPISchemaAsync = (): ThunkAction => async (dispatch): Promise<void> => {
    dispatch(serverAPIActions.getServerAPISchema());

    try {
        const schema = await core.server.apiSchema();
        dispatch(serverAPIActions.getServerAPISchemaSuccess(schema));
    } catch (error) {
        dispatch(serverAPIActions.getServerAPISchemaFailed(error));
    }
};
