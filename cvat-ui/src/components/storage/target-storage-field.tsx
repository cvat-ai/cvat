// (Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { Storage } from 'reducers';

import StorageWithSwitchField from './storage-with-switch-field';

export interface Props {
    projectId: number | null;
    switchDescription?: string;
    switchHelpMessage?: string;
    storageDescription?: string;
    useProjectStorage?: boolean | null;
    onChangeStorage?: (values: Storage) => void;
    onChangeUseProjectStorage?: (value: boolean) => void;
}

export default function TargetStorageField(props: Props): JSX.Element {
    const {
        projectId,
        switchDescription,
        switchHelpMessage,
        storageDescription,
        useProjectStorage,
        onChangeUseProjectStorage,
        onChangeStorage,
    } = props;


    return (
        <StorageWithSwitchField
            projectId={projectId}
            storageLabel='Target storage'
            storageName='targetStorage'
            switchName='useProjectTargetStorage'
            useProjectStorage={useProjectStorage}
            switchDescription={switchDescription}
            switchHelpMessage={switchHelpMessage}
            storageDescription={storageDescription}
            onChangeUseProjectStorage={onChangeUseProjectStorage}
            onChangeStorage={onChangeStorage}
        />
    );
}
