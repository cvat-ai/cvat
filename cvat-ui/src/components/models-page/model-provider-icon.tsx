// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';

interface Props {
    provider: string;
}

export default function ModelProviderIcon(props: Props): JSX.Element | null {
    let icon: JSX.Element | null = null;
    const plugins = usePlugins(
        (state: CombinedState) => state.plugins.components.modelsPage.deployedModelItem.icon, props,
    );

    if (plugins.length) {
        [icon] = [...plugins.map(({ component: Component, weight }, index) => (
            [<Component key={index} targetProps={props} />, weight] as [JSX.Element, number]
        ))].sort((a, b) => a[1] - b[1]).map((menuItem) => menuItem[0]);
    }

    return icon;
}
