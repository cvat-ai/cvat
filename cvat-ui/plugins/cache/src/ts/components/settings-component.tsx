// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from '@modules/react';
import Alert from '@modules/antd/lib/alert';
import Button from '@modules/antd/lib/button';
import Checkbox, { CheckboxChangeEvent } from '@modules/antd/lib/checkbox';
import { Col, Row } from '@modules/antd/lib/grid';
import notification from '@modules/antd/lib/notification';
import Text from '@modules/antd/lib/typography/Text';

import indexedStorage from '../indexed-storage';
import { CachePlugin } from '../types';

interface SettingsComponentProps {
    plugin: CachePlugin;
}

export default function SettingsComponent({ plugin }: SettingsComponentProps): JSX.Element {
    const [enabled, setEnabled] = useState(plugin.data.enabled);
    const [isPersisted, setIsPersisted] = useState(true);
    const [quota, setQuota] = useState<Awaited<ReturnType<typeof indexedStorage.estimate>>>(null);

    useEffect(() => {
        if (window.isSecureContext) {
            navigator.storage.persisted().then((res) => setIsPersisted(res));
            indexedStorage.estimate().then((res) => setQuota(res));
        }
    }, []);

    const availableGb = quota ? (quota.quota / (1024 * 1024 * 1024)).toFixed(2) : null;
    const usedGb = quota ? (quota.usage / (1024 * 1024 * 1024)).toFixed(2) : null;

    return (
        <Row>
            <Col span={24} className='cvat-player-settings-enable-cache cvat-player-setting'>
                <Row gutter={[0, 8]}>
                    <Col span={24}>
                        <Checkbox
                            className='cvat-text-color'
                            checked={enabled}
                            disabled={!window.isSecureContext}
                            onChange={(event: CheckboxChangeEvent): void => {
                                setEnabled(event.target.checked);
                                plugin.data.enabled = event.target.checked;
                                window.localStorage.setItem('cvatEnableCacheFeature', `${event.target.checked}`);
                            }}
                        >
                            Enable cache feature
                        </Checkbox>
                    </Col>
                    {!window.isSecureContext && (
                        <Col span={24}>
                            <Alert
                                type='warning'
                                showIcon
                                message='Caching requires a secure connection. Open CVAT over HTTPS to enable it.'
                            />
                        </Col>
                    )}
                </Row>
                { !!quota && (
                    <Row>
                        <Col>
                            <Text type='secondary'>
                                {`${availableGb} Gb available, ${usedGb} Gb in use`}
                            </Text>
                            <Button
                                type='link'
                                onClick={() => {
                                    indexedStorage.clear()
                                        .then(() => {
                                            plugin.data.cachedChunksByJob = {};
                                            return indexedStorage.estimate();
                                        }).then((res) => setQuota(res))
                                        .catch((err) => notification.error({
                                            message: 'Cache error occured',
                                            description: err.toString(),
                                        }));
                                }}
                            >
                                clear
                            </Button>
                            {
                                !isPersisted && (
                                    <Button
                                        size='small'
                                        onClick={() => {
                                            navigator.storage.persist().then((persisted) => {
                                                if (persisted) {
                                                    notification.info({ message: 'Persisted storage enabled' });
                                                    indexedStorage.estimate()
                                                        .then((updatedQuota) => setQuota(updatedQuota));
                                                    setIsPersisted(true);
                                                } else {
                                                    notification.warning({ message: 'Requesting persisted storage declined' });
                                                }
                                            });
                                        }}
                                    >
                                        Request persisted
                                    </Button>
                                )
                            }
                        </Col>
                    </Row>
                )}
            </Col>
        </Row>
    );
}
