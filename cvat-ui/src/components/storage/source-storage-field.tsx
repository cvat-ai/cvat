// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import StorageWithSwitchField from './storage-with-switch-field';

import { StorageData } from 'cvat-core-wrapper';
import { StorageLocation } from 'reducers';

export interface Props {
    projectId: number | null;
    locationValue: StorageLocation;
    switchDescription?: string;
    switchHelpMessage?: string;
    storageDescription?: string;
    useProjectStorage?: boolean | null;
    onChangeLocationValue?: (value: StorageLocation) => void;
    onChangeStorage?: (values: StorageData) => void;
    onChangeUseProjectStorage?: (value: boolean) => void;
}

export default function SourceStorageField(props: Props): JSX.Element {
    const {
        projectId,
        switchDescription,
        switchHelpMessage,
        storageDescription,
        useProjectStorage,
        locationValue,
        onChangeUseProjectStorage,
        onChangeStorage,
        onChangeLocationValue,
    } = props;


    return (
        <StorageWithSwitchField
            storageLabel='Source storage'
            storageName='sourceStorage'
            switchName='useProjectSourceStorage'
            projectId={projectId}
            locationValue={locationValue}
            useProjectStorage={useProjectStorage}
            switchDescription={switchDescription}
            switchHelpMessage={switchHelpMessage}
            storageDescription={storageDescription}
            onChangeUseProjectStorage={onChangeUseProjectStorage}
            onChangeStorage={onChangeStorage}
            onChangeLocationValue={onChangeLocationValue}
        />
    );
}
