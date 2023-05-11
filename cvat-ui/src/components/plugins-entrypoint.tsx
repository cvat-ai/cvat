// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { Dispatch, AnyAction } from 'redux';
import { useDispatch } from 'react-redux';

import { PluginsActionTypes, pluginActions } from 'actions/plugins-actions';
import { getCore, APIWrapperEnterOptions } from 'cvat-core-wrapper';

const core = getCore();

export type ComponentBuilder = ({
    dispatch,
    REGISTER_ACTION,
    REMOVE_ACTION,
    core,
}: {
    dispatch: Dispatch<AnyAction>,
    REGISTER_ACTION: PluginsActionTypes.ADD_UI_COMPONENT,
    REMOVE_ACTION: PluginsActionTypes.REMOVE_UI_COMPONENT
    core: any,
}) => {
    name: string;
    destructor: CallableFunction;
    globalStateDidUpdate?: CallableFunction;
};

export type PluginEntryPoint = (componentBuilder: ComponentBuilder) => void;
export type {
    APIWrapperEnterOptions,
};

function PluginEntrypoint(): null {
    const dispatch = useDispatch();

    useEffect(() => {
        Object.defineProperty(window, 'cvatUI', {
            value: Object.freeze({
                registerComponent: (componentBuilder: ComponentBuilder) => {
                    const { name, destructor, globalStateDidUpdate } = componentBuilder({
                        dispatch,
                        REGISTER_ACTION: PluginsActionTypes.ADD_UI_COMPONENT,
                        REMOVE_ACTION: PluginsActionTypes.REMOVE_UI_COMPONENT,
                        core,
                    });

                    dispatch(pluginActions.addPlugin(name, destructor, globalStateDidUpdate));
                },
            }),
        });

        window.document.dispatchEvent(new CustomEvent('plugins.ready', { bubbles: true }));
    }, []);

    return null;
}

export default React.memo(PluginEntrypoint);
