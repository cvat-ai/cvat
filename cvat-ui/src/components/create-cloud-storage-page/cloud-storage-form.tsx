// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Form, { FormInstance } from 'antd/lib/form';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import TextArea from 'antd/lib/input/TextArea';
import notification from 'antd/lib/notification';

import { CombinedState, CloudStorage } from 'reducers/interfaces';
import { createCloudStorageAsync, updateCloudStorageAsync } from 'actions/cloud-storage-actions';
import { ProviderType, CredentialsType } from 'utils/enums';

export interface Props {
    cloudStorage?: CloudStorage;
}

interface CloudStorageForm {
    credentials_type: CredentialsType;
    display_name: string;
    provider_type: ProviderType;
    resource: string;
    account_name?: string;
    session_token?: string;
    key?: string;
    secretKey?: string;
    description?: string;
    specific_attributes?: string;
}

export default function CreateCloudStorageForm(props: Props): JSX.Element {
    const { cloudStorage } = props;
    const dispatch = useDispatch();
    const formRef = React.createRef<FormInstance>();
    const [providerType, setProviderType] = useState<ProviderType | null>(null);
    const [credentialsType, setCredentialsType] = useState<CredentialsType | null>(null);
    const newCloudStorageId = useSelector((state: CombinedState) => state.cloudStorages.activities.creates.id);
    const attaching = useSelector((state: CombinedState) => state.cloudStorages.activities.creates.attaching);
    const updating = useSelector((state: CombinedState) => state.cloudStorages.activities.updates.updating);
    const loading = cloudStorage ? updating : attaching;

    function initializeFields(): void {
        const fieldsValue: CloudStorageForm = {
            credentials_type: cloudStorage.credentialsType,
            display_name: cloudStorage.displayName,
            description: cloudStorage.description,
            specific_attributes: cloudStorage.specificAttributes,
            provider_type: cloudStorage.provider,
            resource: cloudStorage.resourceName,
        };

        setProviderType(cloudStorage.provider);
        setCredentialsType(cloudStorage.credentialsType);

        if (cloudStorage.credentialsType === CredentialsType.ACCOUNT_NAME_TOKEN_PAIR) {
            fieldsValue.account_name = cloudStorage.accountName;
            fieldsValue.session_token = cloudStorage.token;
        } else if (cloudStorage.credentialsType === CredentialsType.TEMP_KEY_SECRET_KEY_TOKEN_SET) {
            fieldsValue.session_token = cloudStorage.token;
            fieldsValue.key = cloudStorage.accessKey;
            fieldsValue.secretKey = cloudStorage.secretKey;
        }

        formRef.current?.setFieldsValue(fieldsValue);
    }

    function onReset(): void {
        if (cloudStorage) {
            initializeFields();
        } else {
            formRef.current?.resetFields();
        }
    }

    useEffect(() => {
        onReset();
    }, []);

    useEffect(() => {
        if (Number.isInteger(newCloudStorageId)) {
            // Clear form
            if (formRef.current) {
                formRef.current.resetFields();
            }

            notification.info({
                message: 'The cloud storage has been attached',
                className: 'cvat-notification-create-cloud-storage-success',
            });
        }
    }, [newCloudStorageId]);

    const onSubmit = async (): Promise<void> => {
        let cloudStorageData: Record<string, any> = {};
        if (formRef.current) {
            const formValues = await formRef.current.validateFields();
            cloudStorageData = { ...cloudStorageData, ...formValues };
            if (typeof formValues.range !== undefined) {
                delete cloudStorageData.range;
                cloudStorageData.speciffic_attributes = `range=${formValues.range}`;
            }

            if (cloudStorageData.credentials_type === CredentialsType.ACCOUNT_NAME_TOKEN_PAIR) {
                delete cloudStorageData.SAS_token;
                cloudStorageData.session_token = formValues.SAS_token;
            }

            if (cloudStorage) {
                cloudStorageData.id = cloudStorage.id;
                dispatch(updateCloudStorageAsync(cloudStorageData));
            } else {
                dispatch(createCloudStorageAsync(cloudStorageData));
            }
        }
    };

    const commonProps = {
        className: 'cvat-cloud-storage-form-item',
        labelCol: { span: 5 },
        wrapperCol: { offset: 1 },
    };

    const credentialsBlok = (): JSX.Element => {
        const internalCommonProps = {
            ...commonProps,
            labelCol: { span: 8, offset: 2 },
            wrapperCol: { offset: 1 },
        };

        if (
            providerType === ProviderType.AWS_S3_BUCKET &&
            credentialsType === CredentialsType.TEMP_KEY_SECRET_KEY_TOKEN_SET
        ) {
            return (
                <>
                    <Form.Item
                        label='ACCESS KEY ID'
                        name='key'
                        rules={[{ required: true, message: 'Please, specify your access_key_id' }]}
                        {...internalCommonProps}
                    >
                        <Input.Password maxLength={20} />
                    </Form.Item>
                    <Form.Item
                        label='SECRET ACCESS KEY ID'
                        name='secret_key'
                        rules={[{ required: true, message: 'Please, specify your secret_access_key_id' }]}
                        {...internalCommonProps}
                    >
                        <Input.Password maxLength={40} />
                    </Form.Item>
                    <Form.Item
                        label='TOKEN SESSION'
                        name='session_token'
                        rules={[{ required: true, message: 'Please, specify your token_session' }]}
                        {...internalCommonProps}
                    >
                        <Input.Password />
                    </Form.Item>
                </>
            );
        }

        if (
            providerType === ProviderType.AZURE_CONTAINER &&
            credentialsType === CredentialsType.ACCOUNT_NAME_TOKEN_PAIR
        ) {
            return (
                <>
                    <Form.Item
                        label='Account name'
                        name='account_name'
                        rules={[{ required: true, message: 'Please, specify your account name' }]}
                        {...internalCommonProps}
                    >
                        <Input.Password minLength={3} maxLength={24} />
                    </Form.Item>
                    <Form.Item
                        label='SAS token'
                        name='SAS_token'
                        rules={[{ required: true, message: 'Please, specify your SAS token' }]}
                        {...internalCommonProps}
                    >
                        <Input.Password />
                    </Form.Item>
                </>
            );
        }

        return <></>;
    };

    const AWSS3Configuration = (): JSX.Element => {
        const internalCommonProps = {
            ...commonProps,
            labelCol: { span: 6, offset: 1 },
            wrapperCol: { offset: 1 },
        };

        return (
            <>
                <Form.Item
                    label='Bucket name'
                    name='resource'
                    rules={[{ required: true, message: 'Please, specify a bucket name' }]}
                    {...internalCommonProps}
                >
                    <Input disabled={!!cloudStorage} maxLength={63} />
                </Form.Item>
                <Form.Item
                    label='Credentials type'
                    name='credentials_type'
                    rules={[{ required: true, message: 'Please, specify credentials type' }]}
                    {...internalCommonProps}
                >
                    <Select onSelect={(value: CredentialsType) => setCredentialsType(value)}>
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
                    {...internalCommonProps}
                >
                    <Input maxLength={14} />
                </Form.Item>
            </>
        );
    };

    const AzureBlobStorageConfiguration = (): JSX.Element => {
        const internalCommonProps = {
            ...commonProps,
            labelCol: { span: 6, offset: 1 },
            wrapperCol: { offset: 1 },
        };

        return (
            <>
                <Form.Item
                    label='Container name'
                    name='resource'
                    rules={[{ required: true, message: 'Please, specify a container name' }]}
                    {...internalCommonProps}
                >
                    <Input disabled={!!cloudStorage} maxLength={63} />
                </Form.Item>
                <Form.Item
                    label='Credentials type'
                    name='credentials_type'
                    rules={[{ required: true, message: 'Please, specify credentials type' }]}
                    {...internalCommonProps}
                >
                    <Select onSelect={(value: CredentialsType) => setCredentialsType(value)}>
                        <Select.Option value={CredentialsType.ACCOUNT_NAME_TOKEN_PAIR}>
                            {CredentialsType.ACCOUNT_NAME_TOKEN_PAIR}
                        </Select.Option>
                    </Select>
                </Form.Item>

                {credentialsBlok()}
            </>
        );
    };

    return (
        <Form className='cvat-cloud-storage-form' layout='horizontal' ref={formRef}>
            <Form.Item
                {...commonProps}
                label='Display name'
                name='display_name'
                rules={[{ required: true, message: 'Please, specify a display name' }]}
            >
                <Input maxLength={63} />
            </Form.Item>
            <Form.Item {...commonProps} label='Description' name='description'>
                <TextArea autoSize={{ minRows: 1, maxRows: 5 }} placeholder='Any useful description' />
            </Form.Item>
            <Form.Item
                {...commonProps}
                label='Provider'
                name='provider_type'
                rules={[{ required: true, message: 'Please, specify a cloud storage provider' }]}
            >
                <Select
                    disabled={!!cloudStorage}
                    onSelect={(value: ProviderType) => {
                        setProviderType(value);
                        setCredentialsType(null);
                        formRef.current?.resetFields(['credentials_type']);
                    }}
                >
                    <Select.Option value={ProviderType.AWS_S3_BUCKET}>{ProviderType.AWS_S3_BUCKET}</Select.Option>
                    <Select.Option value={ProviderType.AZURE_CONTAINER}>{ProviderType.AZURE_CONTAINER}</Select.Option>
                </Select>
            </Form.Item>
            {providerType === ProviderType.AWS_S3_BUCKET && AWSS3Configuration()}
            {providerType === ProviderType.AZURE_CONTAINER && AzureBlobStorageConfiguration()}
            <Row justify='end'>
                <Col>
                    <Button
                        htmlType='button'
                        onClick={onReset}
                        className='cvat-cloud-storage-reset-button'
                        disabled={loading}
                    >
                        Reset
                    </Button>
                </Col>
                <Col offset={1}>
                    <Button
                        type='primary'
                        htmlType='submit'
                        onClick={onSubmit}
                        className='cvat-cloud-storage-submit-button'
                        loading={loading}
                        disabled={loading}
                    >
                        {cloudStorage ? 'Update' : 'Submit'}
                    </Button>
                </Col>
            </Row>
        </Form>
    );
}
