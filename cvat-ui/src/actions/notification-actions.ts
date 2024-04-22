// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';

export enum NotificationsActionType {
    RESET_ERRORS = 'RESET_ERRORS',
    RESET_MESSAGES = 'RESET_MESSAGES',
}

export function resetErrors(): AnyAction {
    const action = {
        type: NotificationsActionType.RESET_ERRORS,
        payload: {},
    };

    return action;
}

export function resetMessages(): AnyAction {
    const action = {
        type: NotificationsActionType.RESET_MESSAGES,
        payload: {},
    };

    return action;
}
