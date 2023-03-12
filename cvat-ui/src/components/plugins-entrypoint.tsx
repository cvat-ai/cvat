// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { PluginsActionTypes, pluginActions } from 'actions/plugins-actions';
import { getCore } from 'cvat-core-wrapper';

const core = getCore();

function PluginEntrypoint(): null {
    const dispatch = useDispatch();

    useEffect(() => {
        Object.defineProperty(window, 'cvatUI', {
            value: Object.freeze({
                registerComponent: (componentBuilder: CallableFunction) => {
                    const { name, destructor } = componentBuilder({
                        dispatch,
                        REGISTER_ACTION: PluginsActionTypes.ADD_UI_COMPONENT,
                        REMOVE_ACTION: PluginsActionTypes.REMOVE_UI_COMPONENT,
                        core,
                    });

                    dispatch(pluginActions.addPlugin(name, destructor));
                },
            }),
        });

        window.document.dispatchEvent(new CustomEvent('plugins.ready', { bubbles: true }));
    }, []);

    return null;
}

export default React.memo(PluginEntrypoint);
