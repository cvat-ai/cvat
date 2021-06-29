// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState, ReactText } from 'react';
import Form from 'antd/lib/form';
import notification from 'antd/lib/notification';
import AutoComplete from 'antd/lib/auto-complete';
import Input from 'antd/lib/input';
import { debounce } from 'lodash';

import getCore from 'cvat-core-wrapper';
import { CloudStorage } from 'reducers/interfaces';
import CloudStorageFiles from './cloud-storages-files';

interface Props {
    cloudStorageId: number | null;
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

const searchCloudStoragesWrapper = debounce((phrase, setList) => {
    const filter = { search: phrase }; // TODO: Change to displayName (does not work now)
    searchCloudStorages(filter).then((list) => {
        setList(list);
    });
}, 500);

export default function CloudStorageTab(props: Props): JSX.Element {
    const [initialList, setInitialList] = useState<CloudStorage[]>([]);
    const [list, setList] = useState<CloudStorage[]>([]);
    const [searchPhrase, setSearchPhrase] = useState<string>('');
    const { cloudStorageId, onSelectFiles, onSelectCloudStorage } = props;

    useEffect(() => {
        searchCloudStorages({}).then((data) => {
            setInitialList(data);
            if (!list.length) {
                setList(data);
            }
        });
    }, []);

    // todo: clear this form after the task was created
    return (
        <Form
            className='cvat-create-task-page-cloud-storages-tab-form'
            layout='vertical'
        >
            <Form.Item
                label='Select cloud storage'
                name='cloudStorageSelect'
                rules={[{ required: true, message: 'Please, specify a cloud storage' }]}
                valuePropName='label'
            >
                <AutoComplete
                    value={searchPhrase}
                    placeholder='Search...'
                    showSearch
                    onSearch={(phrase: string) => {
                        setSearchPhrase(phrase);
                        if (!phrase) {
                            setList(initialList);
                        } else {
                            searchCloudStoragesWrapper(phrase, setList);
                        }
                    }}
                    options={list.map((cloudStorage) => ({
                        value: cloudStorage.id.toString(),
                        label: cloudStorage.displayName,
                    }))}
                    onSelect={(value: string) => {
                        const cloudStorage = list
                            .filter((_cloudStorage: CloudStorage) => _cloudStorage.id === +value)[0];
                        onSelectCloudStorage(+value);
                        setSearchPhrase(cloudStorage?.displayName);
                    }}
                >

                    <Input />
                </AutoComplete>
            </Form.Item>

            { cloudStorageId ? (
                <CloudStorageFiles
                    id={cloudStorageId}
                    onCheckFiles={(files: ReactText[]): void => onSelectFiles(files.map((file) => file.toString()))}
                />
            ) : null}
        </Form>
    );
}
