// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import Form from 'antd/lib/form';
import Select from 'antd/lib/select';
import { CloudStorage } from 'reducers';
import SelectCloudStorage from 'components/select-cloud-storage/select-cloud-storage';
import config from 'config';
import CloudStorageBrowser, { RemoteFile } from './remote-browser';

interface Props {
    formRef: any;
    cloudStorage: CloudStorage | null;
    searchPhrase: string;
    setSearchPhrase: (searchPhrase: string) => void;
    onSelectFiles: (files: RemoteFile[]) => void;
    onSelectCloudStorage: (cloudStorageId: number | null) => void;
}

const { Option } = Select;

export default function CloudStorageTab(props: Props): JSX.Element {
    const { searchPhrase, setSearchPhrase } = props;
    const {
        formRef, cloudStorage, onSelectFiles, onSelectCloudStorage,
    } = props;
    const [selectedSource, setSelectedSource] = useState<string | null>(null);

    useEffect(() => {
        if (cloudStorage) {
            const source = cloudStorage.manifests[0] || config.BUCKET_CONTENT_KEY;
            setSelectedSource(source);
            formRef.current.setFieldsValue({ manifestSelect: source });
        }
    }, [cloudStorage?.id]);

    useEffect(() => {
        if (cloudStorage) {
            cloudStorage.manifestPath = (selectedSource !== config.BUCKET_CONTENT_KEY) ? selectedSource : null;
        }
    }, [selectedSource]);

    return (
        <Form ref={formRef} layout='vertical'>
            <SelectCloudStorage
                searchPhrase={searchPhrase}
                cloudStorage={cloudStorage}
                setSearchPhrase={setSearchPhrase}
                onSelectCloudStorage={onSelectCloudStorage}
            />
            {cloudStorage ? (
                <Form.Item
                    label='Select data source'
                    name='manifestSelect'
                    rules={[{ required: true, message: 'Please, specify a data source' }]}
                    initialValue={(cloudStorage.manifests?.length) ? cloudStorage.manifests[0] : null}
                >
                    <Select
                        onSelect={(value: string) => setSelectedSource(value)}
                    >
                        {cloudStorage.manifests.concat([config.BUCKET_CONTENT_KEY]).map(
                            (manifest: string): JSX.Element => (
                                <Option key={manifest} value={manifest}>
                                    {manifest}
                                </Option>
                            ),
                        )}
                    </Select>
                </Form.Item>
            ) : null}

            {cloudStorage && selectedSource ? (
                <Form.Item
                    label='Files'
                    name='cloudStorageFiles'
                    rules={[{ required: true, message: 'Please, select a files' }]}
                >
                    <CloudStorageBrowser
                        resource={cloudStorage}
                        manifestPath={selectedSource === config.BUCKET_CONTENT_KEY ? undefined : selectedSource}
                        onSelectFiles={onSelectFiles}
                        defaultPrefix={cloudStorage.prefix}
                    />
                </Form.Item>
            ) : null}
        </Form>
    );
}
