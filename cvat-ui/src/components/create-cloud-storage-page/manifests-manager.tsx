// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { DeleteOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Col from 'antd/lib/col';
import Form, { RuleObject } from 'antd/lib/form';
import { FormListFieldData, FormListOperation } from 'antd/lib/form/FormList';
import Input from 'antd/lib/input';
import Row from 'antd/lib/row';
import Tooltip from 'antd/lib/tooltip';
import config from 'config';

interface Props {
    form: any;
    manifestNames: string[];
    setManifestNames: (manifestNames: string[]) => void;
}

export default function ManifestsManager(props: Props): JSX.Element {
    const { form, manifestNames, setManifestNames } = props;
    const { DATASET_MANIFEST_GUIDE_URL } = config;

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

    const onChangeManifestPath = (manifestName: string | undefined, manifestId: number): void => {
        if (manifestName !== undefined) {
            setManifestNames(manifestNames.map((name, idx) => (idx !== manifestId ? name : manifestName)));
        }
    };

    const onDeleteManifestItem = (key: number): void => {
        setManifestNames(manifestNames.filter((name, idx) => idx !== key));
    };

    const onAddManifestItem = (): void => {
        setManifestNames(manifestNames.concat(['']));
    };

    return (
        <>
            <Form.Item
                className='cvat-manifests-manager-form-item'
                label={(
                    <>
                        Manifests
                        <Tooltip title='More information'>
                            <Button
                                type='link'
                                target='_blank'
                                className='cvat-cloud-storage-help-button'
                                href={DATASET_MANIFEST_GUIDE_URL}
                            >
                                <QuestionCircleOutlined />
                            </Button>
                        </Tooltip>
                    </>
                )}
                required
            />
            <Form.List
                name='manifests'
                rules={[
                    {
                        validator: async (_: RuleObject, names: string[]): Promise<void> => {
                            if (!names || !names.length) {
                                throw new Error('Please, specify at least one manifest file');
                            }
                        },
                    },
                ]}
            >
                {
                    (fields: FormListFieldData[], _: FormListOperation, { errors }: { errors: React.ReactNode[] }) => (
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
                                                <Button
                                                    className='cvat-delete-manifest-button'
                                                    type='link'
                                                    onClick={() => onDeleteManifestItem(idx)}
                                                >
                                                    <DeleteOutlined />
                                                </Button>
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Form.Item>
                            ))}
                            <Form.ErrorList errors={errors} />
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
