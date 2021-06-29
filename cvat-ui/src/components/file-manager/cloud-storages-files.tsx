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
    onSelectFiles: (checkedKeysValue: string[]) => void;
}

interface CloudStorageFile {
    title: string;
    key: string;
    isLeaf: boolean;
}

type Files =
    | ReactText[]
    | {
        checked: ReactText[];
        halfChecked: ReactText[];
    };

export default function CloudStorageFiles(props: Props): JSX.Element {
    const { cloudStorage, onSelectFiles } = props;
    const dispatch = useDispatch();
    const isFetching = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.fetching);
    const content = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.content);
    const error = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.error);
    const [contentNotInManifest, setContentNotInManifest] = useState<boolean>(false);
    const [contentNotInStorage, setContentNotInStorage] = useState<boolean>(false);

    const [treeData, setTreeData] = useState<CloudStorageFile[]>([]);

    useEffect(() => {
        dispatch(loadCloudStorageContentAsync(cloudStorage));
    }, [cloudStorage.id]);

    useEffect(() => {
        if (content) {
            const fileNames = Object.keys(content);
            const nodes = fileNames.map((filename: string) => ({
                title: filename,
                key: filename,
                isLeaf: true,
                disabled: content[filename].length !== 2 && !filename.includes('manifest.jsonl'),
            }));

            setTreeData(nodes);
            setContentNotInManifest(fileNames.some((fileName: string) => !content[fileName].includes('m')));
            setContentNotInStorage(fileNames.some((fileName: string) => !content[fileName].includes('s')));
        } else {
            setTreeData([]);
            setContentNotInManifest(false);
            setContentNotInStorage(false);
        }
    }, [content]); // todo: extend with curent selected manifest

    if (isFetching) {
        return (
            <Row className='cvat-create-task-page-empty-cloud-storage' justify='center' align='middle'>
                <Spin size='large' />
            </Row>
        );
    }

    if (error) {
        return (
            <Alert
                className='cvat-cloud-storage-alert-fetching-failed'
                message='Could not fetch cloud storage data'
                type='error'
            />
        );
    }

    return (
        <>
            {contentNotInManifest ? (
                <Alert
                    className='cvat-cloud-storage-alert-file-not-exist-in-manifest'
                    message='Some files are not contained in the manifest'
                    type='warning'
                />
            ) : null}
            {contentNotInStorage ? (
                <Alert
                    className='cvat-cloud-storage-alert-file-not-exist-in-storage'
                    message='Some files specified on the manifest were not found on the storage'
                    type='warning'
                />
            ) : null}
            {treeData.length ? (
                <Tree.DirectoryTree
                    selectable={false}
                    multiple
                    checkable
                    height={256}
                    // FIXME: add handler for dirs and files not in manifest
                    onCheck={(checkedKeys: Files) => onSelectFiles(checkedKeys as string[])}
                    treeData={treeData}
                />
            ) : (
                <Empty className='cvat-empty-cloud-storages-tree' description='The storage is empty' />
            )}
        </>
    );
}
