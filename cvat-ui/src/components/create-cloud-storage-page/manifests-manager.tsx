// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useRef, useState } from 'react';
import { DeleteOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Col from 'antd/lib/col';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import Row from 'antd/lib/row';
import notification from 'antd/lib/notification';
import Tooltip from 'antd/lib/tooltip';

interface Props {
    form: any;
    manifestNames: string[];
    setManifestNames: (manifestNames: string[]) => void;
}

export default function ManifestsManager(props: Props): JSX.Element {
    const { form, manifestNames, setManifestNames } = props;
    const maxManifestsCount = useRef(5);
    const [limitingAddingManifestNotification, setLimitingAddingManifestNotification] = useState(false);

    const updateManifestFields = (): void => {
        const newManifestFormItems = manifestNames.map((name, idx) => ({
            id: idx,
            name,
        }));
        form.setFieldsValue({
            manifests: [...newManifestFormItems],
        });
    };

    useEffect(() => {
        updateManifestFields();
    }, [manifestNames]);

    useEffect(() => {
        if (limitingAddingManifestNotification) {
            notification.warning({
                message: `Unable to add manifest. The maximum number of files is ${maxManifestsCount.current}`,
                className: 'cvat-notification-limiting-adding-manifest',
            });
        }
    }, [limitingAddingManifestNotification]);

    const onChangeManifestPath = (manifestName: string | undefined, manifestId: number): void => {
        if (manifestName !== undefined) {
            setManifestNames(manifestNames.map((name, idx) => (idx !== manifestId ? name : manifestName)));
        }
    };

    const onDeleteManifestItem = (key: number): void => {
        if (maxManifestsCount.current === manifestNames.length && limitingAddingManifestNotification) {
            setLimitingAddingManifestNotification(false);
        }
        setManifestNames(manifestNames.filter((name, idx) => idx !== key));
    };

    const onAddManifestItem = (): void => {
        if (maxManifestsCount.current <= manifestNames.length) {
            setLimitingAddingManifestNotification(true);
        } else {
            setManifestNames(manifestNames.concat(['']));
        }
    };

    return (
        <>
            <Form.Item
                name='manifests'
                className='cvat-manifests-manager-form-item'
                label={(
                    <>
                        Manifests
                        <Tooltip title='More information'>
                            <Button
                                type='link'
                                target='_blank'
                                className='cvat-cloud-storage-help-button'
                                href='https://openvinotoolkit.github.io/cvat/docs/manual/advanced/dataset_manifest/'
                            >
                                <QuestionCircleOutlined />
                            </Button>
                        </Tooltip>
                    </>
                )}
                rules={[{ required: true, message: 'Please, specify at least one manifest file' }]}
            />
            <Form.List name='manifests'>
                {
                    (fields) => (
                        <>
                            {fields.map((field, idx): JSX.Element => (
                                <Form.Item key={idx} shouldUpdate>
                                    <Row justify='space-between' align='top'>
                                        <Col>
                                            <Form.Item
                                                name={[idx, 'name']}
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: 'Please specify a manifest name',
                                                    },
                                                ]}
                                                initialValue={field.name}
                                            >
                                                <Input
                                                    placeholder='manifest.jsonl'
                                                    onChange={(event) => onChangeManifestPath(event.target.value, idx)}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col>
                                            <Form.Item>
                                                <Button type='link' onClick={() => onDeleteManifestItem(idx)}>
                                                    <DeleteOutlined />
                                                </Button>
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Form.Item>
                            ))}
                        </>
                    )
                }
            </Form.List>
            <Row justify='start'>
                <Col>
                    <Button type='ghost' onClick={onAddManifestItem} className='cvat-add-manifest-button'>
                        Add manifest
                        <PlusCircleOutlined />
                    </Button>
                </Col>
            </Row>
        </>
    );
}
