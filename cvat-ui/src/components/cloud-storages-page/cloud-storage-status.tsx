// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';

import { CloudStorage, CombinedState } from 'reducers/interfaces';
import { getCloudStorageStatusAsync } from 'actions/cloud-storage-actions';
import { StorageStatuses } from '../../utils/enums';

interface Props {
    cloudStorage: CloudStorage;
}

export default function Status(props: Props): JSX.Element {
    const { cloudStorage } = props;
    const dispatch = useDispatch();
    const isFetching = useSelector((state: CombinedState) => state.cloudStorages.activities.getsStatus.fetching);
    const statuses = useSelector((state: CombinedState) => state.cloudStorages.currentStatuses);
    const [status] = statuses.filter((item: any) => item.id === cloudStorage.id).map((item): string => item.status);

    useEffect(() => {
        if (!status && !isFetching) {
            dispatch(getCloudStorageStatusAsync(cloudStorage));
        }
    }, [isFetching]);

    return (
        <Paragraph>
            <Text type='secondary'>Status: </Text>
            {status ? (
                <Text type={status === StorageStatuses.AVAILABLE ? 'success' : 'danger'}>{status}</Text>
            ) : (
                <Text type='warning'>Loading ...</Text>
            )}
        </Paragraph>
    );
}
