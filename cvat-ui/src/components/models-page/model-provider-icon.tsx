// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { ModelProvider } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import { useSelector } from 'react-redux';

interface Props {
    providerName: string;
}

export default function ModelProviderIcon(props: Props): JSX.Element | null {
    const { providerName } = props;
    const providers = useSelector((state: CombinedState) => state.models.providers.list);

    let icon: JSX.Element | null = null;
    const providerInstance = providers.find((_provider: ModelProvider) => _provider.name === providerName);
    if (providerInstance) {
        icon = (
            <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(providerInstance.icon)}`}
                alt={providerName}
            />
        );
    }
    return icon;
}
