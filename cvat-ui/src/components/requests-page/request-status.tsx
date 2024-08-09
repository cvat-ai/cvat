// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import LoadingOutlined from '@ant-design/icons/lib/icons/LoadingOutlined';
import { RQStatus } from 'cvat-core-wrapper';

function statusMessage(message: string, defaultMessage: string, postfix?: JSX.Element): JSX.Element {
    if (message) {
        return (
            <>
                {message}
                {postfix || null}
            </>
        );
    }

    return (
        <>
            {defaultMessage}
            {postfix || null}
        </>
    );
}

export interface Props {
    status: RQStatus | null;
    message: string | null;
}

function StatusMessage(props: Props): JSX.Element {
    let { status, message } = props;
    message = message || '';
    status = status || RQStatus.FINISHED;
    let textType: 'success' | 'danger' | 'warning' | undefined;
    let classHelper: 'success' | 'failed' | 'queued' | undefined;

    if ([RQStatus.FAILED, RQStatus.UNKNOWN].includes(status)) {
        textType = 'danger';
        classHelper = 'failed';
    } else if ([RQStatus.QUEUED].includes(status)) {
        textType = 'warning';
        classHelper = 'queued';
    } else if ([RQStatus.FINISHED].includes(status)) {
        textType = 'success';
        classHelper = 'success';
    }
    return (
        <Text
            className={`cvat-request-item-progress-message cvat-request-item-progress-${classHelper}`}
            type={textType}
            strong
        >
            {((): JSX.Element => {
                if (status === RQStatus.FINISHED) {
                    return statusMessage(message, 'Finished');
                }

                if ([RQStatus.QUEUED].includes(status)) {
                    return statusMessage(message, 'Queued', <LoadingOutlined />);
                }

                if ([RQStatus.STARTED].includes(status)) {
                    return statusMessage(message, 'In progress', <LoadingOutlined />);
                }

                if (status === RQStatus.FAILED) {
                    return statusMessage(message, 'Failed');
                }

                if (status === RQStatus.UNKNOWN) {
                    return statusMessage(message, 'Unknown status received');
                }

                return statusMessage(message, 'Unknown status received');
            })()}
        </Text>
    );
}

export default React.memo(StatusMessage);
