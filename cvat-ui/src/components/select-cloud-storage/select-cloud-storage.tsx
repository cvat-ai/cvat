// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Form from 'antd/lib/form';
import notification from 'antd/lib/notification';
import AutoComplete from 'antd/lib/auto-complete';
import Input from 'antd/lib/input';
import { debounce } from 'lodash';
import { CloudStorage } from 'reducers';
import { AzureProvider, GoogleCloudProvider, S3Provider } from 'icons';
import { ProviderType } from 'utils/enums';
import { getCore } from 'cvat-core-wrapper';

export interface Props {
    searchPhrase: string;
    cloudStorage: CloudStorage | null;
    name?: string[];
    setSearchPhrase: (searchPhrase: string) => void;
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

const searchCloudStoragesWrapper = debounce((phrase, setList) => {
    const filter = {
        filter: JSON.stringify({
            and: [{
                in: [phrase, { var: 'name' }],
            }],
        }),
    };
    searchCloudStorages(filter).then((list) => {
        setList(list);
    });
}, 500);

function SelectCloudStorage(props: Props): JSX.Element {
    const {
        searchPhrase, cloudStorage, name, setSearchPhrase, onSelectCloudStorage,
    } = props;
    const [initialList, setInitialList] = useState<CloudStorage[]>([]);
    const [list, setList] = useState<CloudStorage[]>([]);

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

    const onBlur = (): void => {
        if (!searchPhrase && cloudStorage) {
            onSelectCloudStorage(null);
        } else if (searchPhrase) {
            const potentialStorages = list.filter((_cloudStorage) => _cloudStorage.displayName.includes(searchPhrase));
            if (potentialStorages.length === 1 && potentialStorages[0].id !== cloudStorage?.id) {
                const potentialStorage = potentialStorages[0];
                setSearchPhrase(potentialStorage.displayName);
                // eslint-disable-next-line prefer-destructuring
                potentialStorage.manifestPath = (potentialStorage.manifests?.length) ? potentialStorage.manifests[0] : '';
                onSelectCloudStorage(potentialStorage);
            }
        }
    };

    return (
        <Form.Item
            label='Select cloud storage'
            name={name || 'cloudStorageSelect'}
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
                    const selectedCloudStorage = list
                        .filter((_cloudStorage: CloudStorage) => _cloudStorage.id === +value)[0] || null;
                    // eslint-disable-next-line prefer-destructuring
                    if (selectedCloudStorage.id !== cloudStorage?.id) {
                        if (selectedCloudStorage.manifests?.length) {
                            [selectedCloudStorage.manifestPath] = selectedCloudStorage.manifests;
                        }
                        onSelectCloudStorage(selectedCloudStorage);
                        setSearchPhrase(selectedCloudStorage?.displayName || '');
                    }
                }}
                allowClear
                className={`cvat-search${!name ? '-' : `-${name[0].replace('Storage', '-storage')}-`}cloud-storage-field`}
            >
                <Input />
            </AutoComplete>
        </Form.Item>
    );
}

export default React.memo(SelectCloudStorage);
