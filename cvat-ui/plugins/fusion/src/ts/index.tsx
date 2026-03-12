// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Route } from 'react-router-dom';
import { LinkOutlined } from '@ant-design/icons';
import { ComponentBuilder, PluginEntryPoint } from 'components/plugins-entrypoint';
import { CVATCore } from 'cvat-core-wrapper';
import FusionPage from './fusion-page';
import { PLUGIN_NAME } from './consts';

let coreInstance: CVATCore | null = null;

export function getCore(): CVATCore {
    if (!coreInstance) {
        throw new Error('Fusion plugin: core not initialised yet');
    }
    return coreInstance;
}

/**
 * Route: /fusion?task2d=<id>&task3d=<id>
 * Also supports legacy /fusion/:projectId for backward compatibility.
 */
function FusionRoute(): JSX.Element {
    return (
        <>
            <Route exact path='/fusion' component={FusionPage} />
            <Route exact path='/fusion/:projectId' component={FusionPage} />
        </>
    );
}

/**
 * "Open Fusion Viewer" action in the Tasks list context menu.
 * Only shown for tasks that have a `link_id` attribute on at least one label.
 */
function FusionTaskAction({ targetProps }: { targetProps: { taskInstance: any }; key: number }): {
    key: string;
    icon: JSX.Element;
    label: string;
    onClick: () => void;
} | null {
    const task = targetProps?.taskInstance;
    if (!task) return null;

    const is2d = task.dimension === '2d';
    const paramName = is2d ? 'task2d' : 'task3d';
    const otherParam = is2d ? 'task3d' : 'task2d';

    return {
        key: 'open-fusion-viewer',
        icon: <LinkOutlined />,
        label: 'Open Fusion Viewer',
        onClick: () => {
            const otherId = prompt(
                `Enter the ${is2d ? '3D' : '2D'} task ID to pair with task #${task.id}:`,
            );
            if (otherId) {
                window.location.assign(
                    `/fusion?${paramName}=${task.id}&${otherParam}=${otherId}`,
                );
            }
        },
    };
}

const builder: ComponentBuilder = ({ core, dispatch, actionCreators }) => {
    coreInstance = core;

    dispatch(actionCreators.addUIComponent('router', FusionRoute as any, {
        weight: 10,
        shouldBeRendered: () => true,
    }));

    dispatch(actionCreators.addUIComponent('taskActions.items', FusionTaskAction as any, {
        weight: 50,
        shouldBeRendered: () => true,
    }));

    return {
        name: PLUGIN_NAME,
        destructor: () => {},
    };
};

function register(): void {
    if (Object.prototype.hasOwnProperty.call(window, 'cvatUI')) {
        (window as any as { cvatUI: { registerComponent: PluginEntryPoint } })
            .cvatUI.registerComponent(builder);
    }
}

window.addEventListener('plugins.ready', register, { once: true });
