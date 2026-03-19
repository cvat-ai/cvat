// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useCallback, useEffect } from 'react';

import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Typography from 'antd/lib/typography';
import Space from 'antd/lib/space';
import { CopyOutlined } from '@ant-design/icons';

import { ApiToken } from 'cvat-core-wrapper';
import { toClipboard } from 'utils/to-clipboard';

interface Props {
    visible: boolean;
    token: ApiToken;
    onClose: () => void;
}

function ApiTokenCreatedModal({
    visible, token, onClose,
}: Props): JSX.Element {
    const [copied, setCopied] = useState(false);
    const { value: tokenValue } = token;

    useEffect(() => {
        if (visible) {
            setCopied(false);
        }
    }, [visible]);

    const handleCopyToClipboard = useCallback(async (): Promise<void> => {
        toClipboard(tokenValue ?? '').then(setCopied);
    }, [tokenValue]);

    return (
        <Modal
            title='Your token is ready'
            open={visible}
            onCancel={onClose}
            footer={[
                <Button
                    key='close'
                    type='primary'
                    onClick={onClose}
                    style={{ background: '#faad14' }}
                    className='cvat-api-token-created-modal-confirm-saved-button'
                >
                    I have&nbsp;
                    <strong>securely</strong>
                    &nbsp;saved my token
                </Button>,
            ]}
            width={500}
            className='cvat-api-token-created-modal'
            maskClosable={false}
        >
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
                <div className='cvat-api-token-created-modal-content'>
                    <Typography.Text type='secondary'>
                        Make sure to copy your new personal access token now.
                        <br />
                        You won&apos;t be able to see it again!
                    </Typography.Text>
                    <Space.Compact style={{ width: '100%' }}>
                        <Input
                            value={token.value}
                            readOnly
                            style={{ flex: 1 }}
                            className='cvat-api-token-value-input'
                        />
                        <Button
                            type='default'
                            icon={<CopyOutlined />}
                            onClick={handleCopyToClipboard}
                            className='cvat-api-token-copy-button'
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </Button>
                    </Space.Compact>
                </div>
            </Space>
        </Modal>
    );
}

export default React.memo(ApiTokenCreatedModal);
