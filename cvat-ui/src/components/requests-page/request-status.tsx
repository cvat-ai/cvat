// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import { BaseType } from 'antd/es/typography/Base';
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

    const [textType, classHelper] = ((_status: RQStatus) => {
        if (_status === RQStatus.FINISHED) {
            return ['success', 'success'];
        }

        if (_status === RQStatus.QUEUED) {
            return ['warning', 'queued'];
        }

        if (_status === RQStatus.STARTED) {
            return [undefined, 'started'];
        }

        return ['danger', 'failed'];
    })(status);

    return (
        <Text
            className={`cvat-request-item-progress-message cvat-request-item-progress-${classHelper}`}
            type={textType as BaseType | undefined}
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
