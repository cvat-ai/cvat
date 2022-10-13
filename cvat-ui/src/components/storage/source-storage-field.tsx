// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { StorageData } from 'cvat-core-wrapper';
import { StorageLocation } from 'reducers';
import StorageWithSwitchField from './storage-with-switch-field';

export interface Props {
    instanceId: number | null;
    locationValue: StorageLocation;
    switchDescription?: string;
    switchHelpMessage?: string;
    storageDescription?: string;
    useDefaultStorage?: boolean | null;
    onChangeLocationValue?: (value: StorageLocation) => void;
    onChangeStorage?: (values: StorageData) => void;
    onChangeUseDefaultStorage?: (value: boolean) => void;
}

export default function SourceStorageField(props: Props): JSX.Element {
    const {
        instanceId,
        switchDescription,
        switchHelpMessage,
        storageDescription,
        useDefaultStorage,
        locationValue,
        onChangeUseDefaultStorage,
        onChangeStorage,
        onChangeLocationValue,
    } = props;

    return (
        <StorageWithSwitchField
            storageLabel='Source storage'
            storageName='sourceStorage'
            switchName='useProjectSourceStorage'
            instanceId={instanceId}
            locationValue={locationValue}
            useDefaultStorage={useDefaultStorage}
            switchDescription={switchDescription}
            switchHelpMessage={switchHelpMessage}
            storageDescription={storageDescription}
            onChangeUseDefaultStorage={onChangeUseDefaultStorage}
            onChangeStorage={onChangeStorage}
            onChangeLocationValue={onChangeLocationValue}
        />
    );
}
