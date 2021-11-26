// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, useEffect, useRef,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Form from 'antd/lib/form';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import TextArea from 'antd/lib/input/TextArea';
import notification from 'antd/lib/notification';
import Tooltip from 'antd/lib/tooltip';

import { CombinedState, CloudStorage } from 'reducers/interfaces';
import { createCloudStorageAsync, updateCloudStorageAsync } from 'actions/cloud-storage-actions';
import { ProviderType, CredentialsType } from 'utils/enums';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import Upload, { RcFile } from 'antd/lib/upload';
import { Space } from 'antd';
import { AzureProvider, S3Provider, GoogleCloudProvider } from '../../icons';
import S3Region from './s3-region';
import GCSLocation from './gcs-locatiion';
import ManifestsManager from './manifests-manager';

export interface Props {
    cloudStorage?: CloudStorage;
}

type CredentialsFormNames = 'key' | 'secret_key' | 'account_name' | 'session_token' | 'key_file_path';
type CredentialsCamelCaseNames = 'key' | 'secretKey' | 'accountName' | 'sessionToken' | 'keyFilePath';

interface CloudStorageForm {
    credentials_type: CredentialsType;
    display_name: string;
    provider_type: ProviderType;
    resource: string;
    account_name?: string;
    session_token?: string;
    key?: string;
    secret_key?: string;
    SAS_token?: string;
    key_file_path?: string;
    key_file?: File;
    description?: string;
    region?: string;
    prefix?: string;
    project_id?: string;
    manifests: string[];
}

export default function CreateCloudStorageForm(props: Props): JSX.Element {
    const { cloudStorage } = props;
    const cloudStorageId = cloudStorage ? cloudStorage.id : null;
    const dispatch = useDispatch();
    const history = useHistory();
    const [form] = Form.useForm();
    const shouldShowCreationNotification = useRef(false);
    const shouldShowUpdationNotification = useRef(false);
    const [providerType, setProviderType] = useState<ProviderType | null>(null);
    const [credentialsType, setCredentialsType] = useState<CredentialsType | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<string | undefined>(undefined);
    const newCloudStorageId = useSelector((state: CombinedState) => state.cloudStorages.activities.creates.id);
    const attaching = useSelector((state: CombinedState) => state.cloudStorages.activities.creates.attaching);
    const updating = useSelector((state: CombinedState) => state.cloudStorages.activities.updates.updating);
    const updatedCloudStorageId = useSelector(
        (state: CombinedState) => state.cloudStorages.activities.updates.cloudStorageID,
    );
    const loading = cloudStorage ? updating : attaching;
    const fakeCredentialsData = {
        accountName: 'X'.repeat(24),
        sessionToken: 'X'.repeat(300),
        key: 'X'.repeat(20),
        secretKey: 'X'.repeat(40),
        keyFilePath: 'X'.repeat(10),
    };

    const [keyVisibility, setKeyVisibility] = useState(false);
    const [secretKeyVisibility, setSecretKeyVisibility] = useState(false);
    const [sessionTokenVisibility, setSessionTokenVisibility] = useState(false);
    const [accountNameVisibility, setAccountNameVisibility] = useState(false);
    const [keyFilePathVisibility, setKeyFilePathVisibility] = useState(false);

    const [manifestNames, setManifestNames] = useState<string[]>([]);

    const [keyFilePathIsDisabled, setKeyFilePathIsDisabled] = useState(false);
    const [keyFileIsDisabled, setKeyFileIsDisabled] = useState(false);

    const [uploadedKeyFile, setUploadedKeyFile] = useState<File | null>(null);

    function initializeFields(): void {
        setManifestNames(cloudStorage.manifests);
        const fieldsValue: CloudStorageForm = {
            credentials_type: cloudStorage.credentialsType,
            display_name: cloudStorage.displayName,
            description: cloudStorage.description,
            provider_type: cloudStorage.providerType,
            resource: cloudStorage.resourceName,
            manifests: manifestNames,
        };

        setProviderType(cloudStorage.providerType);
        setCredentialsType(cloudStorage.credentialsType);

        if (cloudStorage.credentialsType === CredentialsType.ACCOUNT_NAME_TOKEN_PAIR) {
            fieldsValue.account_name = fakeCredentialsData.accountName;
            fieldsValue.SAS_token = fakeCredentialsData.sessionToken;
        } else if (cloudStorage.credentialsType === CredentialsType.KEY_SECRET_KEY_PAIR) {
            fieldsValue.key = fakeCredentialsData.key;
            fieldsValue.secret_key = fakeCredentialsData.secretKey;
        } else if (cloudStorage.credentialsType === CredentialsType.KEY_FILE_PATH) {
            fieldsValue.key_file_path = fakeCredentialsData.keyFilePath;
        }

        if (cloudStorage.specificAttributes) {
            const parsedOptions = new URLSearchParams(cloudStorage.specificAttributes);
            const location = parsedOptions.get('region') || parsedOptions.get('location');
            const prefix = parsedOptions.get('prefix');
            const projectId = parsedOptions.get('project_id');
            if (location) {
                setSelectedRegion(location);
            }
            if (prefix) {
                fieldsValue.prefix = prefix;
            }

            if (projectId) {
                fieldsValue.project_id = projectId;
            }
        }

        form.setFieldsValue(fieldsValue);
    }

    function onReset(): void {
        if (cloudStorage) {
            initializeFields();
        } else {
            setManifestNames([]);
            setSelectedRegion(undefined);
            form.resetFields();
        }
    }

    const onCancel = (): void => {
        if (history.length) {
            history.goBack();
        } else {
            history.push('/cloudstorages');
        }
    };

    useEffect(() => {
        onReset();
    }, []);

    useEffect(() => {
        if (
            Number.isInteger(newCloudStorageId) &&
            shouldShowCreationNotification &&
            shouldShowCreationNotification.current
        ) {
            // Clear form
            onReset();

            notification.info({
                message: 'The cloud storage has been attached',
                className: 'cvat-notification-create-cloud-storage-success',
            });
        }
        if (shouldShowCreationNotification !== undefined) {
            shouldShowCreationNotification.current = true;
        }
    }, [newCloudStorageId]);

    useEffect(() => {
        if (updatedCloudStorageId && shouldShowUpdationNotification && shouldShowUpdationNotification.current) {
            notification.info({
                message: 'The cloud storage has been updated',
                className: 'cvat-notification-update-cloud-storage-success',
            });
        }
        if (shouldShowUpdationNotification !== undefined) {
            shouldShowUpdationNotification.current = true;
        }
    }, [updatedCloudStorageId]);

    useEffect(() => {
        if (cloudStorageId && cloudStorage.credentialsType !== CredentialsType.ANONYMOUS_ACCESS) {
            notification.info({
                message: `For security reasons, your credentials are hidden and represented by fake values
                    that will not be taken into account when updating the cloud storage.
                    If you want to replace the original credentials, simply enter new ones.`,
                className: 'cvat-notification-update-info-cloud-storage',
                duration: 15,
            });
        }
    }, []);

    const onSubmit = async (): Promise<void> => {
        let cloudStorageData: Record<string, any> = {};
        const formValues = await form.validateFields();
        cloudStorageData = { ...formValues };
        // specific attributes
        const specificAttributes = new URLSearchParams();

        if (selectedRegion) {
            if (cloudStorageData.provider_type === ProviderType.AWS_S3_BUCKET) {
                delete cloudStorageData.region;
                specificAttributes.append('region', selectedRegion as string);
            } else if (cloudStorageData.provider_type === ProviderType.GOOGLE_CLOUD_STORAGE) {
                delete cloudStorageData.location;
                specificAttributes.append('location', selectedRegion as string);
            }
        }
        if (formValues.prefix) {
            delete cloudStorageData.prefix;
            specificAttributes.append('prefix', formValues.prefix);
        }
        if (formValues.project_id) {
            delete cloudStorageData.project_id;
            specificAttributes.append('project_id', formValues.project_id);
        }

        cloudStorageData.specific_attributes = specificAttributes.toString();

        if (uploadedKeyFile) {
            cloudStorageData.key_file = uploadedKeyFile;
        }

        if (cloudStorageData.credentials_type === CredentialsType.ACCOUNT_NAME_TOKEN_PAIR) {
            delete cloudStorageData.SAS_token;
            cloudStorageData.session_token = formValues.SAS_token;
        }

        if (cloudStorageData.manifests && cloudStorageData.manifests.length) {
            delete cloudStorageData.manifests;
            cloudStorageData.manifests = form
                .getFieldValue('manifests')
                .map((manifest: any): string => manifest.name);
        }

        if (cloudStorage) {
            cloudStorageData.id = cloudStorage.id;

            if (cloudStorageData.account_name === fakeCredentialsData.accountName) {
                delete cloudStorageData.account_name;
            }
            if (cloudStorageData.key === fakeCredentialsData.key) {
                delete cloudStorageData.key;
            }
            if (cloudStorageData.secret_key === fakeCredentialsData.secretKey) {
                delete cloudStorageData.secret_key;
            }
            if (cloudStorageData.session_token === fakeCredentialsData.sessionToken) {
                delete cloudStorageData.session_token;
            }
            if (cloudStorageData.key_file_path === fakeCredentialsData.keyFilePath) {
                delete cloudStorageData.key_file_path;
            }
            dispatch(updateCloudStorageAsync(cloudStorageData));
        } else {
            dispatch(createCloudStorageAsync(cloudStorageData));
        }
    };

    const resetCredentialsValues = (): void => {
        form.setFieldsValue({
            key: undefined,
            secret_key: undefined,
            session_token: undefined,
            account_name: undefined,
            key_file_path: undefined,
        });
    };

    const onFocusCredentialsItem = (credential: CredentialsCamelCaseNames, key: CredentialsFormNames): void => {
        // reset fake credential when updating a cloud storage and cursor is in this field
        if (cloudStorage && form.getFieldValue(key) === fakeCredentialsData[credential]) {
            form.setFieldsValue({
                [key]: undefined,
            });
        }
    };

    const onBlurCredentialsItem = (
        credential: CredentialsCamelCaseNames,
        key: CredentialsFormNames,
        setVisibility: any,
    ): void => {
        // set fake credential when updating a cloud storage and cursor disappears from the field and value not changed
        if (cloudStorage && !form.getFieldValue(key)) {
            form.setFieldsValue({
                [key]: fakeCredentialsData[credential],
            });
            setVisibility(false);
        }
    };

    const onChangeCredentialsType = (value: CredentialsType): void => {
        setCredentialsType(value);
        resetCredentialsValues();
    };

    const onSelectRegion = (key: string): void => {
        setSelectedRegion(key);
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
        };

        if (providerType === ProviderType.AWS_S3_BUCKET && credentialsType === CredentialsType.KEY_SECRET_KEY_PAIR) {
            return (
                <>
                    <Form.Item
                        label='ACCESS KEY ID'
                        name='key'
                        rules={[{ required: true, message: 'Please, specify your access_key_id' }]}
                        {...internalCommonProps}
                    >
                        <Input.Password
                            maxLength={20}
                            visibilityToggle={keyVisibility}
                            onChange={() => setKeyVisibility(true)}
                            onFocus={() => onFocusCredentialsItem('key', 'key')}
                            onBlur={() => onBlurCredentialsItem('key', 'key', setKeyVisibility)}
                        />
                    </Form.Item>
                    <Form.Item
                        label='SECRET ACCESS KEY ID'
                        name='secret_key'
                        rules={[{ required: true, message: 'Please, specify your secret_access_key_id' }]}
                        {...internalCommonProps}
                    >
                        <Input.Password
                            maxLength={40}
                            visibilityToggle={secretKeyVisibility}
                            onChange={() => setSecretKeyVisibility(true)}
                            onFocus={() => onFocusCredentialsItem('secretKey', 'secret_key')}
                            onBlur={() => onBlurCredentialsItem('secretKey', 'secret_key', setSecretKeyVisibility)}
                        />
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
                        <Input.Password
                            minLength={3}
                            maxLength={24}
                            visibilityToggle={accountNameVisibility}
                            onChange={() => setAccountNameVisibility(true)}
                            onFocus={() => onFocusCredentialsItem('accountName', 'account_name')}
                            onBlur={() => onBlurCredentialsItem('accountName', 'account_name', setAccountNameVisibility)}
                        />
                    </Form.Item>
                    <Form.Item
                        label='SAS token'
                        name='SAS_token'
                        rules={[{ required: true, message: 'Please, specify your SAS token' }]}
                        {...internalCommonProps}
                    >
                        <Input.Password
                            visibilityToggle={sessionTokenVisibility}
                            maxLength={437}
                            onChange={() => setSessionTokenVisibility(true)}
                            onFocus={() => onFocusCredentialsItem('sessionToken', 'session_token')}
                            onBlur={() => onBlurCredentialsItem('sessionToken', 'session_token', setSessionTokenVisibility)}
                        />
                    </Form.Item>
                </>
            );
        }

        if (providerType === ProviderType.AZURE_CONTAINER && credentialsType === CredentialsType.ANONYMOUS_ACCESS) {
            return (
                <>
                    <Form.Item
                        label='Account name'
                        name='account_name'
                        rules={[{ required: true, message: 'Please, specify your account name' }]}
                        {...internalCommonProps}
                    >
                        <Input.Password
                            minLength={3}
                            maxLength={24}
                            visibilityToggle={accountNameVisibility}
                            onChange={() => setAccountNameVisibility(true)}
                        />
                    </Form.Item>
                </>
            );
        }

        if (providerType === ProviderType.GOOGLE_CLOUD_STORAGE && credentialsType === CredentialsType.KEY_FILE_PATH) {
            return (
                <Form.Item
                    {...internalCommonProps}
                    label={(
                        <Tooltip title='You can specify path to key file or upload key file.
                                If you leave these fields blank, the environment variable will be used.'
                        >
                            Key file
                        </Tooltip>

                    )}
                >
                    <Space align='start' className='cvat-cloud-storage-form-item-key-file'>
                        <Form.Item
                            name='key_file_path'
                            noStyle
                        >
                            <Input.Password
                                visibilityToggle={keyFilePathVisibility}
                                onChange={(e) => {
                                    setKeyFilePathVisibility(true);
                                    const isDisabled = !!(e.target.value);
                                    setKeyFileIsDisabled(isDisabled);
                                }}
                                onFocus={() => onFocusCredentialsItem('keyFilePath', 'key_file_path')}
                                onBlur={() => onBlurCredentialsItem('keyFilePath', 'key_file_path', setKeyFilePathVisibility)}
                                disabled={keyFilePathIsDisabled}
                            />
                        </Form.Item>

                        <Tooltip title='Attach a file'>
                            <Upload
                                accept='.json, application/json'
                                multiple={false}
                                maxCount={1}
                                showUploadList={false}
                                beforeUpload={(file: RcFile): boolean => {
                                    if (form.getFieldValue('key_file_path')) {
                                        form.setFieldsValue({
                                            key_file_path: undefined,
                                        });
                                    }
                                    setKeyFilePathIsDisabled(true);
                                    setUploadedKeyFile(file);
                                    return false;
                                }}
                            >
                                <Button icon={<UploadOutlined />} disabled={keyFileIsDisabled} />
                            </Upload>
                        </Tooltip>
                        <Tooltip title='Delete an uploaded file'>
                            <Button
                                icon={<DeleteOutlined />}
                                disabled={keyFileIsDisabled}
                                onClick={() => {
                                    setKeyFilePathIsDisabled(false);
                                    setUploadedKeyFile(null);
                                }}
                            />
                        </Tooltip>
                    </Space>
                </Form.Item>
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
                    label='Authorization type'
                    name='credentials_type'
                    rules={[{ required: true, message: 'Please, specify credentials type' }]}
                    {...internalCommonProps}
                >
                    <Select onSelect={(value: CredentialsType) => onChangeCredentialsType(value)}>
                        <Select.Option value={CredentialsType.KEY_SECRET_KEY_PAIR}>
                            Key id and secret access key pair
                        </Select.Option>
                        <Select.Option value={CredentialsType.ANONYMOUS_ACCESS}>Anonymous access</Select.Option>
                    </Select>
                </Form.Item>
                {credentialsBlok()}
                <S3Region
                    selectedRegion={selectedRegion}
                    onSelectRegion={onSelectRegion}
                    internalCommonProps={internalCommonProps}
                />
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
                    label='Authorization type'
                    name='credentials_type'
                    rules={[{ required: true, message: 'Please, specify credentials type' }]}
                    {...internalCommonProps}
                >
                    <Select onSelect={(value: CredentialsType) => onChangeCredentialsType(value)}>
                        <Select.Option value={CredentialsType.ACCOUNT_NAME_TOKEN_PAIR}>
                            Account name and SAS token
                        </Select.Option>
                        <Select.Option value={CredentialsType.ANONYMOUS_ACCESS}>Anonymous access</Select.Option>
                    </Select>
                </Form.Item>

                {credentialsBlok()}
            </>
        );
    };

    const GoogleCloudStorageConfiguration = (): JSX.Element => {
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
                    {/* maxlength https://cloud.google.com/storage/docs/naming-buckets#requirements */}
                    <Input disabled={!!cloudStorage} maxLength={222} />
                </Form.Item>
                <Form.Item
                    label='Authorization type'
                    name='credentials_type'
                    rules={[{ required: true, message: 'Please, specify credentials type' }]}
                    {...internalCommonProps}
                >
                    <Select onSelect={(value: CredentialsType) => onChangeCredentialsType(value)}>
                        <Select.Option value={CredentialsType.KEY_FILE_PATH}>
                            Key file
                        </Select.Option>
                        <Select.Option value={CredentialsType.ANONYMOUS_ACCESS}>Anonymous access</Select.Option>
                    </Select>
                </Form.Item>
                {credentialsBlok()}
                <Form.Item
                    label='Prefix'
                    name='prefix'
                    {...internalCommonProps}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label='Project ID'
                    name='project_id'
                    {...internalCommonProps}
                >
                    <Input />
                </Form.Item>
                <GCSLocation
                    selectedRegion={selectedRegion}
                    onSelectRegion={onSelectRegion}
                    internalCommonProps={internalCommonProps}
                />
            </>
        );
    };

    return (
        <Form className='cvat-cloud-storage-form' layout='horizontal' form={form}>
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
                        form.resetFields(['credentials_type']);
                    }}
                >
                    <Select.Option value={ProviderType.AWS_S3_BUCKET}>
                        <span className='cvat-cloud-storage-select-provider'>
                            <S3Provider />
                            AWS S3
                        </span>
                    </Select.Option>
                    <Select.Option value={ProviderType.AZURE_CONTAINER}>
                        <span className='cvat-cloud-storage-select-provider'>
                            <AzureProvider />
                            Azure Blob Container
                        </span>
                    </Select.Option>
                    <Select.Option value={ProviderType.GOOGLE_CLOUD_STORAGE}>
                        <span className='cvat-cloud-storage-select-provider'>
                            <GoogleCloudProvider />
                            Google Cloud Storage
                        </span>
                    </Select.Option>
                </Select>
            </Form.Item>
            {providerType === ProviderType.AWS_S3_BUCKET && AWSS3Configuration()}
            {providerType === ProviderType.AZURE_CONTAINER && AzureBlobStorageConfiguration()}
            {providerType === ProviderType.GOOGLE_CLOUD_STORAGE && GoogleCloudStorageConfiguration()}
            <ManifestsManager form={form} manifestNames={manifestNames} setManifestNames={setManifestNames} />
            <Row justify='end'>
                <Col>
                    <Button
                        htmlType='button'
                        onClick={() => onCancel()}
                        className='cvat-cloud-storage-reset-button'
                        disabled={loading}
                    >
                        Cancel
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
