// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Form, { FormInstance } from 'antd/lib/form';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import TextArea from 'antd/lib/input/TextArea';
import notification from 'antd/lib/notification';
import { CombinedState } from 'reducers/interfaces';
import { updateCloudStorageAsync } from 'actions/cloud-storage-actions';
import { CloudStorage } from '../../reducers/interfaces';
import { ProviderType, CredentialsType } from '../enums';

export interface Props {
    cloudStorage: CloudStorage,
}

export default function UpdateCloudStorageContent(props: Props): JSX.Element {
    const dispatch = useDispatch();
    const history = useHistory();
    const formRef = React.createRef<FormInstance>();
    const { cloudStorage } = props;
    console.log(cloudStorage);
    const {
        displayName, description, accessKey, secretKey, token, accountName, resource,
        credentialsType, provider,
    } = cloudStorage;
    console.log('resource ', resource);
    const [newCredentialsType, setNewCredentialsType] = useState<CredentialsType>(credentialsType);
    const updates = useSelector((state: CombinedState) => state.cloudStorages.activities.updates);

    useEffect(() => {
        if (updates.cloudStorageID && !updates.error) {
            notification.info({
                message: 'The cloud storage has been updated',
                className: 'cvat-notification-update-cloud-storage-success',
            });
        }
        history.push('/cloudstorages');
    }, [updates]);

    const onSumbit = async (): Promise<void> => {
        let cloudStorageData: Record<string, any> = {};
        if (formRef.current) {
            const formValues = await formRef.current.validateFields();
            cloudStorageData = {
                ...cloudStorageData,
                ...formValues,
            };
            if (typeof formValues.range !== undefined) {
                delete cloudStorageData.range;
                cloudStorageData.speciffic_attributes = `range=${formValues.range}`;
            }
            dispatch(updateCloudStorageAsync(cloudStorageData));
        }
    };

    const onReset = (): void => {
        formRef.current?.resetFields();
        formRef.current?.setFields({
            ...cloudStorage,
        });
    };

    const credentialsBlok = (): JSX.Element => {
        let credentials;
        switch (provider && newCredentialsType) {
            case ProviderType.AWS_S3_BUCKET && CredentialsType.TEMP_KEY_SECRET_KEY_TOKEN_SET: {
                credentials = (
                    <>
                        <Form.Item
                            label='ACCESS KEY ID'
                            name='key'
                            rules={[{ required: true, message: 'Please input your access_key_id' }]}
                        >
                            <Input.Password maxLength={20} defaultValue={accessKey} />
                        </Form.Item>
                        <Form.Item
                            label='SECRET ACCESS KEY ID'
                            name='secret_key'
                            rules={[{ required: true, message: 'Please input your secret_access_key_id' }]}
                        >
                            <Input.Password maxLength={40} defaultValue={secretKey} />
                        </Form.Item>
                        <Form.Item
                            label='TOKEN SESSION'
                            name='token'
                            rules={[{ required: true, message: 'Please input your token_session' }]}
                        >
                            <Input.Password defaultValue={token} />
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
                            <Input.Password defaultValue={accountName} minLength={3} maxLength={24} />
                        </Form.Item>
                        <Form.Item
                            label='SAS token'
                            name='token'
                            rules={[{ required: true, message: 'Please input your SAS token' }]}
                        >
                            <Input.Password defaultValue={accountName} maxLength={40} />
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
                <Input defaultValue={resource} maxLength={63} />
            </Form.Item>
            <Form.Item
                label='Credentials type'
                name='credentials_type'
                rules={[{ required: true, message: 'Please, select credentials type' }]}
            >
                <Select
                    defaultValue={credentialsType}
                    onSelect={(value: CredentialsType) => setNewCredentialsType(value)}
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
            <Form.Item
                label='Range'
                name='range'
                tooltip='https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions'
            >
                <Input maxLength={14} />
            </Form.Item>
        </>
    );

    const AzureBlobStorageConfiguration = (): JSX.Element => (
        <>
            <Form.Item
                label='Container name'
                name='resource'
                rules={[{ required: true, message: 'Please, input container name' }]}
            >
                <Input maxLength={63} defaultValue={resource} />
            </Form.Item>
            <Form.Item
                label='Credentials type'
                name='credentials_type'
                rules={[{ required: true, message: 'Please, select credentials type' }]}
            >
                <Select
                    defaultValue={credentialsType}
                    onSelect={(value: CredentialsType) => setNewCredentialsType(value)}
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
        <Row justify='start' align='middle' className='cvat-update-cloud-storage-content'>
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
                        <Input maxLength={63} defaultValue='some' />
                    </Form.Item>
                    <Form.Item
                        label='Description'
                        name='description'
                        labelAlign='left'
                    >
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 5 }}
                            defaultValue={cloudStorage.description}
                        />
                    </Form.Item>
                    <Form.Item
                        label='Provider'
                        name='provider_type'
                        rules={[{ required: true, message: 'Please, select provider' }]}
                    >
                        <Input defaultValue={provider} disabled />
                    </Form.Item>
                    {provider === ProviderType.AWS_S3_BUCKET && AWSS3Configuration()}
                    {provider === ProviderType.AZURE_BLOB_CONTAINER && AzureBlobStorageConfiguration()}
                </Form>
            </Col>
            <Col span={6} offset={18}>
                <Button
                    htmlType='button'
                    onClick={onReset}
                    className='cvat-update-cloud-storage-reset-button'
                >
                    Cansel
                </Button>
                <Button
                    type='primary'
                    htmlType='submit'
                    onClick={onSumbit}
                    className='cvat-update-cloud-storage-submit-button'
                >
                    Update
                </Button>
            </Col>
        </Row>
    );
}
