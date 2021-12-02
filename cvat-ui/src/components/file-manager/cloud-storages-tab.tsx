// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import Form from 'antd/lib/form';
import notification from 'antd/lib/notification';
import AutoComplete from 'antd/lib/auto-complete';
import Input from 'antd/lib/input';
import { debounce } from 'lodash';

import Select from 'antd/lib/select';
import getCore from 'cvat-core-wrapper';
import { CloudStorage } from 'reducers/interfaces';
import { AzureProvider, GoogleCloudProvider, S3Provider } from 'icons';
import { ProviderType } from 'utils/enums';
import CloudStorageFiles from './cloud-storages-files';

interface Props {
    formRef: any;
    cloudStorage: CloudStorage | null;
    searchPhrase: string;
    setSearchPhrase: (searchPhrase: string) => void;
    selectedFiles: string[];
    onSelectFiles: (files: string[]) => void;
    onSelectCloudStorage: (cloudStorageId: number | null) => void;
}

async function searchCloudStorages(filter: Record<string, string>): Promise<CloudStorage[]> {
    try {
        const data = await getCore().cloudStorages.get(filter);
        return data;
    } catch (error) {
        notification.error({
            message: 'Could not fetch a list of cloud storages',
            description: error.toString(),
        });
    }

    return [];
}

const { Option } = Select;

const searchCloudStoragesWrapper = debounce((phrase, setList) => {
    const filter = { displayName: phrase };
    searchCloudStorages(filter).then((list) => {
        setList(list);
    });
}, 500);

export default function CloudStorageTab(props: Props): JSX.Element {
    const { searchPhrase, setSearchPhrase } = props;
    const [initialList, setInitialList] = useState<CloudStorage[]>([]);
    const [list, setList] = useState<CloudStorage[]>([]);
    const {
        formRef, cloudStorage, selectedFiles, onSelectFiles, onSelectCloudStorage,
    } = props;
    const [selectedManifest, setSelectedManifest] = useState<string | null>(null);

    useEffect(() => {
        searchCloudStorages({}).then((data) => {
            setInitialList(data);
            if (!list.length) {
                setList(data);
            }
        });
    }, []);

    useEffect(() => {
        if (!searchPhrase) {
            setList(initialList);
        } else {
            searchCloudStoragesWrapper(searchPhrase, setList);
        }
    }, [searchPhrase, initialList]);

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

    const onBlur = (): void => {
        if (!searchPhrase && cloudStorage) {
            onSelectCloudStorage(null);
        } else if (searchPhrase) {
            const potentialStorages = list.filter((_cloudStorage) => _cloudStorage.displayName.includes(searchPhrase));
            if (potentialStorages.length === 1) {
                const potentialStorage = potentialStorages[0];
                setSearchPhrase(potentialStorage.displayName);
                // eslint-disable-next-line prefer-destructuring
                potentialStorage.manifestPath = potentialStorage.manifests[0];
                onSelectCloudStorage(potentialStorage);
            }
        }
    };

    return (
        <Form ref={formRef} className='cvat-create-task-page-cloud-storages-tab-form' layout='vertical'>
            <Form.Item
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
            </Form.Item>

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
