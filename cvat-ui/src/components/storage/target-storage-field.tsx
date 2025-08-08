// (Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { StorageData, StorageLocation } from 'cvat-core-wrapper';
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
    disableSwitch?: boolean;
}

export default function TargetStorageField(props: Readonly<Props>): JSX.Element {
    const {
        instanceId,
        locationValue,
        switchDescription,
        switchHelpMessage,
        storageDescription,
        useDefaultStorage,
        onChangeLocationValue,
        onChangeUseDefaultStorage,
        onChangeStorage,
        disableSwitch,
    } = props;

    return (
        <StorageWithSwitchField
            instanceId={instanceId}
            locationValue={locationValue}
            storageLabel='Target storage'
            storageName='targetStorage'
            switchName='useProjectTargetStorage'
            useDefaultStorage={useDefaultStorage}
            switchDescription={switchDescription}
            switchHelpMessage={switchHelpMessage}
            storageDescription={storageDescription}
            onChangeUseDefaultStorage={onChangeUseDefaultStorage}
            onChangeStorage={onChangeStorage}
            onChangeLocationValue={onChangeLocationValue}
            disableSwitch={disableSwitch}
        />
    );
}
