// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import Form from 'antd/lib/form';
import Select from 'antd/lib/select';
import { CloudStorage } from 'reducers';
import SelectCloudStorage from 'components/select-cloud-storage/select-cloud-storage';
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
            />
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
