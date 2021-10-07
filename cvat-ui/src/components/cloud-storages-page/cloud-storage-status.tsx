// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { getCloudStorageStatusAsync } from 'actions/cloud-storage-actions';
import { CombinedState, CloudStorageStatus, CloudStorage } from 'reducers/interfaces';
import { StorageStatuses } from '../../utils/enums';

interface Props {
    cloudStorage: CloudStorage;
}

export default function Status(props: Props): JSX.Element {
    const { cloudStorage } = props;
    const dispatch = useDispatch();
    const [status] = useSelector((state: CombinedState) => state.cloudStorages.statuses.filter(
        (item: CloudStorageStatus) => item.id === cloudStorage.id,
    ), shallowEqual);

    useEffect(() => {
        if (status === undefined) {
            dispatch(getCloudStorageStatusAsync(cloudStorage));
        }
    }, [status]);

    if (!status || (status && status.fetching)) {
        return (
            <Paragraph>
                <Text type='secondary'>Status: </Text>
                <Text type='warning'>Loading ...</Text>
            </Paragraph>
        );
    }

    if (status.initialized && status.error) {
        return (
            <Paragraph>
                <Text type='secondary'>Status: </Text>
                <Text type='danger'>Error</Text>
            </Paragraph>
        );
    }

    return (
        <Paragraph>
            <Text type='secondary'>Status: </Text>
            <Text type={status.status === StorageStatuses.AVAILABLE ? 'success' : 'danger'}>{status.status}</Text>
        </Paragraph>
    );
}
