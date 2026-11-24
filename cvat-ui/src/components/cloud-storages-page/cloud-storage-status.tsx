// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import Badge from 'antd/lib/badge';
import { useDispatch, useSelector } from 'react-redux';

import { getCloudStorageStatusAsync } from 'actions/cloud-storage-actions';
import { CombinedState } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import { StorageStatuses } from '../../utils/enums';

interface Props {
    cloudStorage: CombinedState['cloudStorages']['current'][number];
}

export default function Status({ cloudStorage }: Props): JSX.Element {
    const dispatch = useDispatch();
    const status = useSelector((state: CombinedState) => state.cloudStorages.statuses[cloudStorage.id]);

    useEffect(() => {
        if (status === undefined) {
            dispatch(getCloudStorageStatusAsync(cloudStorage));
        }
    }, [status]);

    let message: string;
    let badgeStatus: 'processing' | 'success' | 'error';
    if (!status || (status && status.fetching)) {
        message = 'Loading';
        badgeStatus = 'processing';
    } else if (status.initialized && !status.status) {
        message = 'Error';
        badgeStatus = 'error';
    } else {
        message = status.status;
        badgeStatus = status.status === StorageStatuses.AVAILABLE ? 'success' : 'error';
    }

    return (
        <CVATTooltip overlay={`Status: ${message}`}>
            <span className='cvat-cloud-storage-status-indicator' aria-label={`Status: ${message}`}>
                <Badge status={badgeStatus} />
            </span>
        </CVATTooltip>
    );
}
