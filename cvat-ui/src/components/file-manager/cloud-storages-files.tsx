// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { ReactText, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row } from 'antd/lib/grid';
import Tree from 'antd/lib/tree/Tree';
import Spin from 'antd/lib/spin';
import Alert from 'antd/lib/alert';
import Empty from 'antd/lib/empty';

import { CloudStorage, CombinedState } from 'reducers/interfaces';
import { loadCloudStorageContentAsync } from 'actions/cloud-storage-actions';

interface Props {
    cloudStorage: CloudStorage;
    onCheckFiles: (checkedKeysValue: ReactText[]) => void;
}

interface CloudStorageFile {
    title: string;
    key: string;
    isLeaf: boolean;
}

export default function CloudStorageFiles(props: Props): JSX.Element {
    const { cloudStorage, onCheckFiles } = props;
    const dispatch = useDispatch();
    const initialized = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.initialized);
    const isFetching = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.fetching);
    const content = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.content);
    const [contentNotInManifest, setContentNotInManifest] = useState<ReactText[] | null>(null);
    const [contentNotInStorage, setContentNotInStorage] = useState<ReactText[] | null>(null);

    const { DirectoryTree } = Tree;

    const [fileNames, setFileNames] = useState<string[]>([]);
    const [treeData, setTreeData] = useState<CloudStorageFile[]>([]);

    useEffect(() => {
        dispatch(loadCloudStorageContentAsync(cloudStorage));
    }, [cloudStorage]);

    useEffect(() => {
        if (content) {
            setFileNames(Object.keys(content));
        }
    }, [content]);

    useEffect(() => {
        const nodes = fileNames.map((filename: string) => ({
            title: filename,
            key: filename,
            isLeaf: true,
            disabled: content[filename].length !== 2 && !filename.includes('manifest.jsonl'),
        }));

        setTreeData(nodes);

        // define files which does not exist in the manifest
        setContentNotInManifest(fileNames.filter((fileName: string) => !content[fileName].includes('m')));
        setContentNotInStorage(fileNames.filter((fileName: string) => !content[fileName].includes('s')));
    }, [fileNames]); // todo: extend with curent selected manifest

    if (isFetching) {
        return (
            <Row className='cvat-creaqte-task-page-cloud-storages-tab-empty-content' justify='center' align='middle'>
                <Spin size='large' />
            </Row>
        );
    }

    return (
        <>
            {initialized && contentNotInManifest?.length ? (
                <Alert
                    className='cvat-cloud-storage-alert-file-not-exist-in-manifest'
                    message='Some files are not contained in the manifest'
                    type='warning'
                />
            ) : null}
            {initialized && contentNotInStorage?.length ? (
                <Alert
                    className='cvat-cloud-storage-alert-file-not-exist-in-storage'
                    message='Some files specified on the manifest were not found on the storage'
                    type='warning'
                />
            ) : null}
            {initialized && treeData.length ? (
                <DirectoryTree
                    multiple
                    checkable
                    height={256}
                    showLine
                    onCheck={(
                        checkedKeys:
                            | {
                                  // FIXME: add handler for dirs and files not in manifest
                                  checked: React.Key[];
                                  halfChecked: React.Key[];
                              }
                            | React.Key[],
                    ) => onCheckFiles(checkedKeys as ReactText[])}
                    // onExpand={onExpand}
                    treeData={treeData}
                />
            ) : (
                <Empty className='cvat-empty-cloud-storages-tree' description='The storage is empty' />
            )}
        </>
    );
}
