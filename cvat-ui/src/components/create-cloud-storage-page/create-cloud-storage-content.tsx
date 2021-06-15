// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RouteComponentProps } from 'react-router'; // useHistory
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Form, { FormInstance } from 'antd/lib/form';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import TextArea from 'antd/lib/input/TextArea';
import { ProviderType, CredentialsType } from '../enums';

export interface CreateCloudStorageData {
    providerType: ProviderType | null;
    credentialsType: CredentialsType | null;
    resource: string | null;
    displayName: string | null;
}

interface Props {
    onCreate: (data: CreateCloudStorageData) => void;
    status: string;
    cloudStorageId: number | null;
}

interface State {
    providerType: ProviderType | null | string;
    displayName: string;
    resource: string;
    credentialsType: null | CredentialsType | string;
}

const defaultState = {
    providerType: null,
    credentialsType: null,
    resource: '',
    displayName: '',
};

class CreateCloudStorageContent extends React.PureComponent<Props & RouteComponentProps, State> {
    formRef = React.createRef<FormInstance>();

    public constructor(props: Props & RouteComponentProps) {
        super(props);
        this.state = { ...defaultState };
    }

    onSumbit = async (): Promise<void> => {
        let cloudStorageData: Record<string, any> = {};
        if (this.formRef.current) {
            const formValues = await this.formRef.current.validateFields();
            cloudStorageData = {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ...cloudStorageData,
                ...formValues,
            };
        }
    };

    onReset = (): void => {
        this.formRef.current?.resetFields();
    };

    private selectProviderType = (newProviderType: ProviderType | null | string): void => {
        const curentState = this.state;
        this.setState({
            ...curentState,
            providerType: newProviderType,
            credentialsType: null,
        });
    };

    private selectCredentialsType = (newCredentialsType: CredentialsType | null | string): void => {
        const currentState = this.state;
        this.setState({
            ...currentState,
            credentialsType: newCredentialsType,
        });
    };

    private renderCredentialsBlok(): JSX.Element {
        const { credentialsType, providerType } = this.state;
        let credentials;
        switch (providerType && credentialsType) {
            case ProviderType.AWS_S3_BUCKET && CredentialsType.TEMP_KEY_SECRET_KEY_TOKEN_SET: {
                credentials = (
                    <>
                        <Form.Item
                            label='ACCESS KEY ID'
                            name='accessKeyId'
                            rules={[{ required: true, message: 'Please input your access_key_id' }]}
                        >
                            <Input.Password maxLength={20} />
                        </Form.Item>
                        <Form.Item
                            label='SECRET ACCESS KEY ID'
                            name='secretAccessKeyId'
                            rules={[{ required: true, message: 'Please input your secret_access_key_id' }]}
                        >
                            <Input.Password maxLength={40} />
                        </Form.Item>
                        <Form.Item
                            label='TOKEN SESSION'
                            name='tokenSession'
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
                            name='accountName'
                            tooltip='Storage account names must be between 3 and 24 characters in length
                                and may contain numbers and lowercase letters only.'
                            rules={[{ required: true, message: 'Please input your account name' }]}
                        >
                            <Input.Password minLength={3} maxLength={24} />
                        </Form.Item>
                        <Form.Item
                            label='SAS token'
                            name='sasToken'
                            tooltip='shared access signature used to authority to Blob Storage Account.
                                See more https://docs.microsoft.com/bs-latn-ba/azure/storage/common/storage-sas-overview?toc=/azure/storage/blobs/toc.json'
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
    }

    private renderAWSS3Configuration(): JSX.Element {
        return (
            <>
                <Form.Item
                    label='Bucket name'
                    name='bucketName'
                    rules={[{ required: true, message: 'Please, input bucket name' }]}
                >
                    <Input maxLength={63} />
                </Form.Item>
                <Form.Item
                    label='Credentials type'
                    name='credentialsType'
                    rules={[{ required: true, message: 'Please, select credentials type' }]}
                >
                    <Select defaultValue='select credentials type' onSelect={this.selectCredentialsType}>
                        <Select.Option value={CredentialsType.TEMP_KEY_SECRET_KEY_TOKEN_SET}>
                            {CredentialsType.TEMP_KEY_SECRET_KEY_TOKEN_SET}
                        </Select.Option>
                        <Select.Option value={CredentialsType.ANONYMOUS_ACCESS}>
                            {CredentialsType.ANONYMOUS_ACCESS}
                        </Select.Option>
                    </Select>
                </Form.Item>
                {this.renderCredentialsBlok()}
            </>
        );
    }

    private renderAzureBlobStorageConfiguration(): JSX.Element {
        return (
            <>
                <Form.Item
                    label='Container name'
                    name='containerName'
                    rules={[{ required: true, message: 'Please, input container name' }]}
                >
                    <Input maxLength={63} />
                </Form.Item>
                <Form.Item
                    label='Credentials type'
                    name='credentialsType'
                    rules={[{ required: true, message: 'Please, select credentials type' }]}
                >
                    <Select defaultValue='select credentials type' onSelect={this.selectCredentialsType}>
                        <Select.Option value={CredentialsType.ACCOUNT_NAME_TOKEN_PAIR}>
                            {CredentialsType.ACCOUNT_NAME_TOKEN_PAIR}
                        </Select.Option>
                    </Select>
                </Form.Item>
                {/* TODO: need to change selected value on credentials
                type to "default" when provider type value changes */}
                {this.renderCredentialsBlok()}
            </>
        );
    }

    public render(): JSX.Element {
        const { providerType } = this.state;

        return (
            <Row justify='start' align='middle' className='cvat-create-cloud-storage-content'>
                <Col span={24}>
                    <Form layout='horizontal' ref={this.formRef}>
                        <Form.Item
                            label='Display name'
                            tooltip='What name will be used for display?'
                            name='displayName'
                            rules={[{ required: true, message: 'Please, input your display name' }]}
                        >
                            <Input maxLength={63} />
                        </Form.Item>
                        <Form.Item label='Description' name='description' labelAlign='left'>
                            <TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder='Add storage description' />
                        </Form.Item>
                        <Form.Item
                            label='Provider'
                            name='provider'
                            rules={[{ required: true, message: 'Please, select provider' }]}
                        >
                            <Select defaultValue='select provider type' onSelect={this.selectProviderType}>
                                <Select.Option value={ProviderType.AWS_S3_BUCKET}>
                                    {ProviderType.AWS_S3_BUCKET}
                                </Select.Option>
                                <Select.Option value={ProviderType.AZURE_BLOB_CONTAINER}>
                                    {ProviderType.AZURE_BLOB_CONTAINER}
                                </Select.Option>
                            </Select>
                        </Form.Item>
                        {providerType === ProviderType.AWS_S3_BUCKET ? this.renderAWSS3Configuration() : null}
                        {providerType === ProviderType.AZURE_BLOB_CONTAINER ?
                            this.renderAzureBlobStorageConfiguration() :
                            null}
                    </Form>
                </Col>
                <Col span={6} offset={18}>
                    <Button htmlType='button' onClick={this.onReset} className='cvat-create-cloud-storage-reset-button'>
                        Cansel
                    </Button>
                    <Button
                        type='primary'
                        htmlType='submit'
                        onClick={this.onSumbit}
                        className='cvat-create-cloud-storage-submit-button'
                    >
                        Submit
                    </Button>
                </Col>
            </Row>
        );
    }
}

export default withRouter(CreateCloudStorageContent);
