// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { Dispatch, AnyAction } from 'redux';
import { useDispatch } from 'react-redux';

import { PluginsActionTypes, pluginActions } from 'actions/plugins-actions';
import { getCore, CVATCore, APIWrapperEnterOptions } from 'cvat-core-wrapper';
import { modelsActions } from 'actions/models-actions';
import { changeFrameAsync, updateCurrentJobAsync } from 'actions/annotation-actions';
import { getCVATStore } from 'cvat-store';

const core = getCore();

export type PluginActionCreators = {
    getModelsSuccess: typeof modelsActions['getModelsSuccess'],
    changeFrameAsync: typeof changeFrameAsync,
    addUIComponent: typeof pluginActions['addUIComponent'],
    removeUIComponent: typeof pluginActions['removeUIComponent'],
    addUICallback: typeof pluginActions['addUICallback'],
    removeUICallback: typeof pluginActions['removeUICallback'],
    updateCurrentJobAsync: typeof updateCurrentJobAsync,
};

export type ComponentBuilder = ({
    dispatch,
    REGISTER_ACTION,
    REMOVE_ACTION,
    actionCreators,
    core,
    store,
}: {
    dispatch: Dispatch<AnyAction>,
    /**
     * @deprecated Please, use actionCreators.addUIComponent instead
    */
    REGISTER_ACTION: PluginsActionTypes.ADD_UI_COMPONENT,
    /**
     * @deprecated Please, use actionCreators.removeUIComponent instead
    */
    REMOVE_ACTION: PluginsActionTypes.REMOVE_UI_COMPONENT,
    actionCreators: PluginActionCreators,
    core: CVATCore,
    store: ReturnType<typeof getCVATStore>
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
                        actionCreators: {
                            changeFrameAsync,
                            updateCurrentJobAsync,
                            getModelsSuccess: modelsActions.getModelsSuccess,
                            addUICallback: pluginActions.addUICallback,
                            removeUICallback: pluginActions.removeUICallback,
                            addUIComponent: pluginActions.addUIComponent,
                            removeUIComponent: pluginActions.removeUIComponent,
                        },
                        core,
                        store: getCVATStore(),
                    });

                    dispatch(pluginActions.addPlugin(name, destructor, globalStateDidUpdate));
                },
            }),
        });

        setTimeout(() => {
            window.document.dispatchEvent(new CustomEvent('plugins.ready', { bubbles: true }));
        });
    }, []);

    return null;
}

export default React.memo(PluginEntrypoint);
