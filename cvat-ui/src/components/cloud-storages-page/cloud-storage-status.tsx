// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import { useDispatch, useSelector } from 'react-redux';
import { getCloudStorageStatusAsync } from 'actions/cloud-storage-actions';
import { CombinedState, CloudStorage } from 'reducers/interfaces';
import { StorageStatuses } from '../../utils/enums';

interface Props {
    cloudStorage: CloudStorage;
}

export default function Status({ cloudStorage }: Props): JSX.Element {
    const dispatch = useDispatch();
    const status = useSelector((state: CombinedState) => state.cloudStorages.statuses[cloudStorage.id]);

    useEffect(() => {
        if (status === undefined) {
            dispatch(getCloudStorageStatusAsync(cloudStorage));
        }
    }, [status]);

    let message: JSX.Element;
    if (!status || (status && status.fetching)) {
        message = <Text type='warning'>Loading ...</Text>;
    } else if (status.initialized && !status.status) {
        message = <Text type='danger'>Error</Text>;
    } else {
        message = <Text type={status.status === StorageStatuses.AVAILABLE ? 'success' : 'danger'}>{status.status}</Text>;
    }

    return (
        <Paragraph>
            <Text type='secondary'>Status: </Text>
            {message}
        </Paragraph>
    );
}
