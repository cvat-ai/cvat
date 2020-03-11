// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { combineReducers, Reducer } from 'redux';
import authReducer from './auth-reducer';
import tasksReducer from './tasks-reducer';
import usersReducer from './users-reducer';
import aboutReducer from './about-reducer';
import shareReducer from './share-reducer';
import formatsReducer from './formats-reducer';
import pluginsReducer from './plugins-reducer';
import modelsReducer from './models-reducer';
import notificationsReducer from './notifications-reducer';
import annotationReducer from './annotation-reducer';
import settingsReducer from './settings-reducer';
import shortcutsReducer from './shortcuts-reducer';

export default function createRootReducer(): Reducer {
    return combineReducers({
        auth: authReducer,
        tasks: tasksReducer,
        users: usersReducer,
        about: aboutReducer,
        share: shareReducer,
        formats: formatsReducer,
        plugins: pluginsReducer,
        models: modelsReducer,
        notifications: notificationsReducer,
        annotation: annotationReducer,
        settings: settingsReducer,
        shortcuts: shortcutsReducer,
    });
}
