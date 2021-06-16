// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Form, { FormInstance } from 'antd/lib/form';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import TextArea from 'antd/lib/input/TextArea';
import notification from 'antd/lib/notification';
import { CombinedState } from 'reducers/interfaces';
import { createCloudStorageAsync } from 'actions/cloud-storage-actions';
import { ProviderType, CredentialsType } from '../enums';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CreateCloudStorageContent(props:any): JSX.Element {
    const formRef = React.createRef<FormInstance>();
    const [providerType, setProviderType] = useState<ProviderType | null>(null);
    const [credentialsType, setCredentialsType] = useState<CredentialsType | null>(null);
    const dispatch = useDispatch();
    const newCloudStorageId = useSelector((state: CombinedState) => state.cloudStorages.activities.creates.id);

    useEffect(() => {
        if (Number.isInteger(newCloudStorageId)) {
            // Clear form
            if (formRef.current) {
                formRef.current.resetFields();
            }

            notification.info({
                message: 'The cloud storage has been created',
                className: 'cvat-notification-create-cloud-storage-success',
            });
        }
    }, [newCloudStorageId]);

    const onSumbit = async (): Promise<void> => {
        let cloudStorageData: Record<string, any> = {};
        if (formRef.current) {
            const formValues = await formRef.current.validateFields();
            cloudStorageData = {
                ...cloudStorageData,
                ...formValues,
            };
            dispatch(createCloudStorageAsync(cloudStorageData));
        }
    };

    const onReset = (): void => {
        formRef.current?.resetFields();
    };

    // TODO: change this to user hook
    const handleProviderType = (providerValue: ProviderType): void => {
        setProviderType(providerValue);
        setCredentialsType(null);
        // FIXME: need to clean Credentials type value when change provider value
    };

    const credentialsBlok = (): JSX.Element => {
        let credentials;
        switch (providerType && credentialsType) {
            case ProviderType.AWS_S3_BUCKET && CredentialsType.TEMP_KEY_SECRET_KEY_TOKEN_SET: {
                credentials = (
                    <>
                        <Form.Item
                            label='ACCESS KEY ID'
                            name='key'
                            rules={[{ required: true, message: 'Please input your access_key_id' }]}
                        >
                            <Input.Password maxLength={20} />
                        </Form.Item>
                        <Form.Item
                            label='SECRET ACCESS KEY ID'
                            name='secret_key'
                            rules={[{ required: true, message: 'Please input your secret_access_key_id' }]}
                        >
                            <Input.Password maxLength={40} />
                        </Form.Item>
                        <Form.Item
                            label='TOKEN SESSION'
                            name='token'
                            rules={[{ required: true, message: 'Please input your token_session' }]}
                        >
                            <Input.Password />
                        </Form.Item>
                    </>
                );
                break;
            }
            case ProviderType.AZURE_BLOB_CONTAINER && CredentialsType.ACCOUNT_NAME_TOKEN_PAIR: {
                credentials = (
                    <>
                        <Form.Item
                            label='Account name'
                            name='account_name'
                            rules={[{ required: true, message: 'Please input your account name' }]}
                        >
                            <Input.Password minLength={3} maxLength={24} />
                        </Form.Item>
                        <Form.Item
                            label='SAS token'
                            name='token'
                            rules={[{ required: true, message: 'Please input your SAS token' }]}
                        >
                            <Input.Password maxLength={40} />
                        </Form.Item>
                    </>
                );
                break;
            }
            default: {
                credentials = <></>;
                break;
            }
        }

        return credentials;
    };

    const AWSS3Configuration = (): JSX.Element => (
        <>
            <Form.Item
                label='Bucket name'
                name='resource'
                rules={[{ required: true, message: 'Please, input bucket name' }]}
            >
                <Input maxLength={63} />
            </Form.Item>
            <Form.Item
                label='Credentials type'
                name='credentials_type'
                rules={[{ required: true, message: 'Please, select credentials type' }]}
            >
                <Select
                    onSelect={(value: CredentialsType) => setCredentialsType(value)}
                >
                    <Select.Option value={CredentialsType.TEMP_KEY_SECRET_KEY_TOKEN_SET}>
                        {CredentialsType.TEMP_KEY_SECRET_KEY_TOKEN_SET}
                    </Select.Option>
                    <Select.Option value={CredentialsType.ANONYMOUS_ACCESS}>
                        {CredentialsType.ANONYMOUS_ACCESS}
                    </Select.Option>
                </Select>
            </Form.Item>
            {credentialsBlok()}
        </>
    );

    const AzureBlobStorageConfiguration = (): JSX.Element => (
        <>
            <Form.Item
                label='Container name'
                name='resource'
                rules={[{ required: true, message: 'Please, input container name' }]}
            >
                <Input maxLength={63} />
            </Form.Item>
            <Form.Item
                label='Credentials type'
                name='credentials_type'
                rules={[{ required: true, message: 'Please, select credentials type' }]}
            >
                <Select
                    onSelect={(value: CredentialsType) => setCredentialsType(value)}
                >
                    <Select.Option value={CredentialsType.ACCOUNT_NAME_TOKEN_PAIR}>
                        {CredentialsType.ACCOUNT_NAME_TOKEN_PAIR}
                    </Select.Option>
                </Select>
            </Form.Item>

            {credentialsBlok()}
        </>
    );

    return (
        <Row justify='start' align='middle' className='cvat-create-cloud-storage-content'>
            <Col span={24}>
                <Form
                    layout='horizontal'
                    ref={formRef}
                >
                    <Form.Item
                        label='Display name'
                        name='display_name'
                        rules={[{ required: true, message: 'Please, input your display name' }]}
                    >
                        <Input maxLength={63} />
                    </Form.Item>
                    <Form.Item
                        label='Description'
                        name='description'
                        labelAlign='left'
                    >
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 5 }}
                            placeholder='Add storage description'
                        />
                    </Form.Item>
                    <Form.Item
                        label='Provider'
                        name='provider_type'
                        rules={[{ required: true, message: 'Please, select provider' }]}
                    >
                        <Select
                            onSelect={(value:ProviderType) => handleProviderType(value)}
                        >
                            <Select.Option value={ProviderType.AWS_S3_BUCKET}>
                                {ProviderType.AWS_S3_BUCKET}
                            </Select.Option>
                            <Select.Option value={ProviderType.AZURE_BLOB_CONTAINER}>
                                {ProviderType.AZURE_BLOB_CONTAINER}
                            </Select.Option>
                        </Select>
                    </Form.Item>
                    {providerType === ProviderType.AWS_S3_BUCKET && AWSS3Configuration()}
                    {providerType === ProviderType.AZURE_BLOB_CONTAINER && AzureBlobStorageConfiguration()}
                </Form>
            </Col>
            <Col span={6} offset={18}>
                <Button
                    htmlType='button'
                    onClick={onReset}
                    className='cvat-create-cloud-storage-reset-button'
                >
                    Cansel
                </Button>
                <Button
                    type='primary'
                    htmlType='submit'
                    onClick={onSumbit}
                    className='cvat-create-cloud-storage-submit-button'
                >
                    Submit
                </Button>
            </Col>
        </Row>
    );
}

export default withRouter(CreateCloudStorageContent);
