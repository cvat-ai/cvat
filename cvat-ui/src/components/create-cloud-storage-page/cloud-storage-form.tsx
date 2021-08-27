// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, useEffect, RefObject, useRef, MutableRefObject,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Form, { FormInstance } from 'antd/lib/form';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import TextArea from 'antd/lib/input/TextArea';
import notification from 'antd/lib/notification';

import { MinusCircleOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import Tooltip from 'antd/lib/tooltip';
import { CombinedState, CloudStorage } from 'reducers/interfaces';
import { createCloudStorageAsync, updateCloudStorageAsync } from 'actions/cloud-storage-actions';
import { ProviderType, CredentialsType } from 'utils/enums';
import { AzureProvider, S3Provider } from '../../icons';
import S3Region from './s3-region';

export interface Props {
    cloudStorage?: CloudStorage;
    formRef: RefObject<FormInstance>;
    shouldShowCreationNotification?: MutableRefObject<boolean>;
    shouldShowUpdationNotification?: MutableRefObject<boolean>;
}

type CredentialsFormNames = 'key' | 'secret_key' | 'account_name' | 'session_token';
type CredentialsCamelCaseNames = 'key' | 'secretKey' | 'accountName' | 'sessionToken';

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
    description?: string;
    region?: string;
    // TODO: it will be required parameter
    manifests?: string[];
}

export default function CreateCloudStorageForm(props: Props): JSX.Element {
    const {
        cloudStorage, formRef, shouldShowCreationNotification, shouldShowUpdationNotification,
    } = props;
    const dispatch = useDispatch();
    const history = useHistory();
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
    };

    const [keyVisibility, setKeyVisibility] = useState<boolean>(false);
    const [secretKeyVisibility, setSecretKeyVisibility] = useState<boolean>(false);
    const [sessionTokenVisibility, setSessionTokenVisibility] = useState<boolean>(false);
    const [accountNameVisibility, setAccountNameVisibility] = useState<boolean>(false);

    const [manifestNames, setManifestNames] = useState<string[]>([]);
    const maxManifestsCount = useRef<number>(5);
    const [limitingAddingManifestNotification, setLimitingAddingManifestNotification] = useState<boolean>(false);

    const style: React.CSSProperties = {
        paddingLeft: '4px',
        paddingRight: '0px',
    };

    const updateManifestFields = (): void => {
        const newManifestFormItems = manifestNames.map((name, idx) => ({
            id: idx,
            name,
        }));
        formRef.current?.setFieldsValue({
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

    const handleUpdateManifestPath = (manifestName: string | undefined, manifestId: number): void => {
        if (manifestName !== undefined) {
            setManifestNames(manifestNames.map((name, idx) => (idx !== manifestId ? name : manifestName)));
        }
    };

    const handleDeleteManifestItem = (key: number): void => {
        if (maxManifestsCount.current === manifestNames.length && limitingAddingManifestNotification) {
            setLimitingAddingManifestNotification(false);
        }
        setManifestNames(manifestNames.filter((name, idx) => idx !== key));
    };

    const handleAddManifestItem = (): void => {
        if (maxManifestsCount.current <= manifestNames.length) {
            setLimitingAddingManifestNotification(true);
        } else {
            setManifestNames(manifestNames.concat(['']));
        }
    };

    const renderManifest = (key: number, value: string): JSX.Element => (
        <Form.Item key={key} shouldUpdate>
            {() => (
                <Row justify='space-between' align='top'>
                    <Col>
                        <Form.Item
                            name={[key, 'name']}
                            rules={[
                                {
                                    required: true,
                                    message: 'Please specify a manifest name',
                                },
                            ]}
                            initialValue={value}
                        >
                            <Input
                                placeholder='manifest.jsonl'
                                onChange={(event) => handleUpdateManifestPath(event.target.value, key)}
                            />
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item>
                            <Button type='link' onClick={() => handleDeleteManifestItem(key)}>
                                <MinusCircleOutlined />
                            </Button>
                        </Form.Item>
                    </Col>
                </Row>
            )}
        </Form.Item>
    );

    // eslint-disable-next-line arrow-body-style
    const renderManifests = () => {
        return (): JSX.Element[] => manifestNames.map((name, idx): JSX.Element => renderManifest(idx, name));
    };

    function initializeFields(): void {
        const fieldsValue: CloudStorageForm = {
            credentials_type: cloudStorage.credentialsType,
            display_name: cloudStorage.displayName,
            description: cloudStorage.description,
            provider_type: cloudStorage.providerType,
            resource: cloudStorage.resourceName,
        };

        setProviderType(cloudStorage.providerType);
        setCredentialsType(cloudStorage.credentialsType);

        setManifestNames([...cloudStorage.manifests]);

        if (cloudStorage.credentialsType === CredentialsType.ACCOUNT_NAME_TOKEN_PAIR) {
            fieldsValue.account_name = fakeCredentialsData.accountName;
            fieldsValue.SAS_token = fakeCredentialsData.sessionToken;
        } else if (cloudStorage.credentialsType === CredentialsType.KEY_SECRET_KEY_PAIR) {
            fieldsValue.key = fakeCredentialsData.key;
            fieldsValue.secret_key = fakeCredentialsData.secretKey;
        }

        if (cloudStorage.providerType === ProviderType.AWS_S3_BUCKET && cloudStorage.specificAttibutes) {
            const region = new URLSearchParams(cloudStorage.specificAttibutes).get('region');
            if (region) {
                setSelectedRegion(region);
            }
        }

        formRef.current?.setFieldsValue(fieldsValue);
    }

    function onReset(): void {
        if (cloudStorage) {
            initializeFields();
        } else {
            setManifestNames([]);
            setSelectedRegion(undefined);
            formRef.current?.resetFields();
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
        if (cloudStorage && cloudStorage.credentialsType !== CredentialsType.ANONYMOUS_ACCESS) {
            notification.info({
                message: `For security reasons, your credentials are hidden and represented by fake values
                    that will not be taken into account when updating the cloud storage.
                    If you want to replace the original credentials, simply enter new ones.`,
                className: 'cvat-notification-update-info-cloud-storage',
                duration: 15,
            });
        }
    }, [cloudStorage]);

    const onSubmit = async (): Promise<void> => {
        let cloudStorageData: Record<string, any> = {};
        if (formRef.current) {
            const formValues = await formRef.current.validateFields();
            cloudStorageData = { ...cloudStorageData, ...formValues };
            if (formValues.region !== undefined) {
                delete cloudStorageData.region;
                cloudStorageData.specific_attributes = `region=${selectedRegion}`;
            }

            if (cloudStorageData.credentials_type === CredentialsType.ACCOUNT_NAME_TOKEN_PAIR) {
                delete cloudStorageData.SAS_token;
                cloudStorageData.session_token = formValues.SAS_token;
            }

            if (cloudStorageData.manifests) {
                delete cloudStorageData.manifests;
                cloudStorageData.manifests = formRef.current
                    .getFieldValue('manifests')
                    .map((manifest: any): string => manifest.name);
            }

            if (cloudStorage) {
                cloudStorageData.id = cloudStorage.id;
                // TODO: it may be coincide with the real account name
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
                dispatch(updateCloudStorageAsync(cloudStorageData));
            } else {
                dispatch(createCloudStorageAsync(cloudStorageData));
            }
        }
    };

    const resetCredentialsValues = (): void => {
        formRef.current?.setFieldsValue({
            key: undefined,
            secret_key: undefined,
            session_token: undefined,
            account_name: undefined,
        });
    };

    const onFocusCredentialsItem = (credential: CredentialsCamelCaseNames, key: CredentialsFormNames): void => {
        // reset fake credential when updating a cloud storage and cursor is in this field
        if (cloudStorage && formRef.current?.getFieldValue(key) === fakeCredentialsData[credential]) {
            formRef.current.setFieldsValue({
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
        if (cloudStorage && formRef.current && !formRef.current.getFieldValue(key)) {
            formRef.current.setFieldsValue({
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
            wrapperCol: { offset: 1 },
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
                            onBlur={() =>
                                onBlurCredentialsItem('accountName', 'account_name', setAccountNameVisibility)}
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
                            onChange={() => setSessionTokenVisibility(true)}
                            onFocus={() => onFocusCredentialsItem('sessionToken', 'session_token')}
                            onBlur={() =>
                                onBlurCredentialsItem('sessionToken', 'session_token', setSessionTokenVisibility)}
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
                </Select>
            </Form.Item>
            {providerType === ProviderType.AWS_S3_BUCKET && AWSS3Configuration()}
            {providerType === ProviderType.AZURE_CONTAINER && AzureBlobStorageConfiguration()}
            <Form.Item
                name='manifests'
                label={(
                    <>
                        Manifests
                        <Tooltip title='More information'>
                            <Button
                                type='link'
                                target='_blank'
                                style={style}
                                href='https://openvinotoolkit.github.io/cvat/docs/manual/advanced/dataset_manifest/'
                            >
                                <QuestionCircleOutlined />
                            </Button>
                        </Tooltip>
                    </>
                )}
                rules={[{ required: true, message: 'Please, specify at least one manifest file' }]}
            />
            <Form.List name='manifests'>{renderManifests()}</Form.List>
            <Row justify='start'>
                <Col>
                    <Button type='ghost' onClick={handleAddManifestItem} className='cvat-add-manifest-button'>
                        Add manifest
                        <PlusCircleOutlined />
                    </Button>
                </Col>
            </Row>
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
