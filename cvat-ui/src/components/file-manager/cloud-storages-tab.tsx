// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import Form from 'antd/lib/form';

import Select from 'antd/lib/select';
import { CloudStorage } from 'reducers/interfaces';
import CloudStorageFiles from './cloud-storages-files';
import SelectCloudStorage from 'components/select-cloud-storage/select-cloud-storage';

interface Props {
    formRef: any;
    cloudStorage: CloudStorage | null;
    searchPhrase: string;
    setSearchPhrase: (searchPhrase: string) => void;
    selectedFiles: string[];
    onSelectFiles: (files: string[]) => void;
    onSelectCloudStorage: (cloudStorageId: number | null) => void;
}

const { Option } = Select;

export default function CloudStorageTab(props: Props): JSX.Element {
    const { searchPhrase, setSearchPhrase } = props;
    const {
        formRef, cloudStorage, selectedFiles, onSelectFiles, onSelectCloudStorage,
    } = props;
    const [selectedManifest, setSelectedManifest] = useState<string | null>(null);

    useEffect(() => {
        if (cloudStorage) {
            setSelectedManifest(cloudStorage.manifests[0]);
        }
    }, [cloudStorage]);

    useEffect(() => {
        if (selectedManifest) {
            cloudStorage.manifestPath = selectedManifest;
        }
    }, [selectedManifest]);

    return (
        <Form ref={formRef} className='cvat-create-task-page-cloud-storages-tab-form' layout='vertical'>

            <SelectCloudStorage
                searchPhrase={searchPhrase}
                cloudStorage={cloudStorage}
                setSearchPhrase={setSearchPhrase}
                onSelectCloudStorage={onSelectCloudStorage}
                // cloudStoragesList={list}
                // setCloudStoragesList={setList}
            />
            {/* <Form.Item
                label='Select cloud storage'
                name='cloudStorageSelect'
                rules={[{ required: true, message: 'Please, specify a cloud storage' }]}
                valuePropName='label'
            >
                <AutoComplete
                    onBlur={onBlur}
                    value={searchPhrase}
                    placeholder='Search...'
                    showSearch
                    onSearch={(phrase: string) => {
                        setSearchPhrase(phrase);
                    }}
                    options={list.map((_cloudStorage) => ({
                        value: _cloudStorage.id.toString(),
                        label: (
                            <span
                                className='cvat-cloud-storage-select-provider'
                            >
                                {_cloudStorage.providerType === ProviderType.AWS_S3_BUCKET && <S3Provider />}
                                {_cloudStorage.providerType === ProviderType.AZURE_CONTAINER && <AzureProvider />}
                                {
                                    _cloudStorage.providerType === ProviderType.GOOGLE_CLOUD_STORAGE &&
                                    <GoogleCloudProvider />
                                }
                                {_cloudStorage.displayName}
                            </span>
                        ),
                    }))}
                    onSelect={(value: string) => {
                        const selectedCloudStorage =
                            list.filter((_cloudStorage: CloudStorage) => _cloudStorage.id === +value)[0] || null;
                        // eslint-disable-next-line prefer-destructuring
                        selectedCloudStorage.manifestPath = selectedCloudStorage.manifests[0];
                        onSelectCloudStorage(selectedCloudStorage);
                        setSearchPhrase(selectedCloudStorage?.displayName || '');
                    }}
                    allowClear
                >
                    <Input />
                </AutoComplete>
            </Form.Item> */}

            {cloudStorage ? (
                <Form.Item
                    label='Select manifest file'
                    name='manifestSelect'
                    rules={[{ required: true, message: 'Please, specify a manifest file' }]}
                    initialValue={cloudStorage.manifests[0]}
                >
                    <Select
                        onSelect={(value: string) => setSelectedManifest(value)}
                    >
                        {cloudStorage.manifests.map(
                            (manifest: string): JSX.Element => (
                                <Option key={manifest} value={manifest}>
                                    {manifest}
                                </Option>
                            ),
                        )}
                    </Select>
                </Form.Item>
            ) : null}

            {cloudStorage && selectedManifest ? (
                <Form.Item
                    label='Files'
                    name='cloudStorageFiles'
                    rules={[{ required: true, message: 'Please, select a files' }]}
                >
                    <CloudStorageFiles
                        cloudStorage={cloudStorage}
                        selectedManifest={selectedManifest}
                        selectedFiles={selectedFiles}
                        onSelectFiles={onSelectFiles}
                    />
                </Form.Item>
            ) : null}
        </Form>
    );
}
