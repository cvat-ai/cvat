// (Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { StorageLocation } from 'reducers';
import StorageWithSwitchField from './storage-with-switch-field';
import { StorageData } from 'cvat-core-wrapper';
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

export default function TargetStorageField(props: Props): JSX.Element {
    const {
        projectId,
        locationValue,
        switchDescription,
        switchHelpMessage,
        storageDescription,
        useProjectStorage,
        onChangeLocationValue,
        onChangeUseProjectStorage,
        onChangeStorage,
    } = props;


    return (
        <StorageWithSwitchField
            projectId={projectId}
            locationValue={locationValue}
            storageLabel='Target storage'
            storageName='targetStorage'
            switchName='useProjectTargetStorage'
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
