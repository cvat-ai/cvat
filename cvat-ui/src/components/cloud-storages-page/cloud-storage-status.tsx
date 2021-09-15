// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';
import { StorageStatuses } from '../../utils/enums';

interface Props {
    status: string;
}

export default function Status(props: Props): JSX.Element {
    const { status } = props;
    // TODO: make dynamic loading of statuses separately in the future

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
