// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { BoundariesActions, BoundariesActionTypes } from 'actions/boundaries-actions';
import { ApiTokensActions, ApiTokensActionTypes } from 'actions/api-tokens-actions';
import { ApiTokensState } from '.';

const defaultState: ApiTokensState = {
    fetching: false,
    current: [],
};

export default function (
    state = defaultState,
    action: ApiTokensActions | BoundariesActions,
): ApiTokensState {
    switch (action.type) {
        case ApiTokensActionTypes.GET_API_TOKENS:
        case ApiTokensActionTypes.CREATE_API_TOKEN:
        case ApiTokensActionTypes.UPDATE_API_TOKEN:
        case ApiTokensActionTypes.REVOKE_API_TOKEN:
            return {
                ...state,
                fetching: true,
            };
        case ApiTokensActionTypes.GET_API_TOKENS_SUCCESS:
            return {
                ...state,
                fetching: false,
                current: action.payload.tokens,
            };
        case ApiTokensActionTypes.CREATE_API_TOKEN_SUCCESS:
            return {
                ...state,
                fetching: false,
                current: [...state.current, action.payload.token],
            };
        case ApiTokensActionTypes.UPDATE_API_TOKEN_SUCCESS: {
            const updatedToken = action.payload.token;
            return {
                ...state,
                fetching: false,
                current: state.current.map((token) => (
                    token.id === updatedToken.id ? updatedToken : token
                )),
            };
        }
        case ApiTokensActionTypes.REVOKE_API_TOKEN_SUCCESS: {
            const { tokenId } = action.payload;
            return {
                ...state,
                fetching: false,
                current: state.current.filter((token) => token.id !== tokenId),
            };
        }
        case ApiTokensActionTypes.GET_API_TOKENS_FAILED:
        case ApiTokensActionTypes.CREATE_API_TOKEN_FAILED:
        case ApiTokensActionTypes.UPDATE_API_TOKEN_FAILED:
        case ApiTokensActionTypes.REVOKE_API_TOKEN_FAILED:
            return {
                ...state,
                fetching: false,
            };
        case BoundariesActionTypes.RESET_AFTER_ERROR:
            return { ...defaultState };
        default:
            return state;
    }
}
