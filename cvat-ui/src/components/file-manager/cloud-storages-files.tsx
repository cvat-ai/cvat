// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, {
    ReactText, useEffect, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import { Row } from 'antd/lib/grid';
import { BulbFilled, CloudTwoTone, WarningOutlined } from '@ant-design/icons';
import Tree, { TreeNodeNormal } from 'antd/lib/tree/Tree';
import Spin from 'antd/lib/spin';
import { CombinedState } from 'reducers/interfaces';
import { loadCloudStorageContentAsync } from 'actions/cloud-storage-actions';

interface Props {
    id: number,
    onCheckFiles: (checkedKeysValue: ReactText[]) => void,
}

interface CloudStorageFile {
    title: string,
    key: string,
    isLeaf: boolean,
}

export default function CloudStorageFiles(props: Props): JSX.Element {
    const { id, onCheckFiles } = props;
    const dispatch = useDispatch();
    const history = useHistory();
    const initialized = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.initialized);
    const isFetching = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.fetching);
    const totalCount = useSelector((state: CombinedState) => state.cloudStorages.count);
    const content = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.content);
    const [contentNotInManifest, setContentNotInManifest] = useState<ReactText[] | null>(null);
    const [contentNotInStorage, setContentNotInStorage] = useState<ReactText[] | null>(null);

    const { DirectoryTree } = Tree;
    // const [selectedFiles, setSelectedFiles] = useState<CloudStorageFile[] | null>([]);

    const [fileNames, setFileNames] = useState<string[]>([]);
    const [treeData, setTreeData] = useState<CloudStorageFile[]>([]);
    useEffect(
        () => {
            if (!isFetching && !initialized) {
                dispatch(loadCloudStorageContentAsync(id));
            } else if (!isFetching && initialized) {
                setFileNames(Object.keys(content));
            }
        },
        [content],
    );

    useEffect(() => {
        // prepare nodes
        const tmp = [];
        for (const fileName of fileNames) {
            tmp.push(
                {
                    title: fileName,
                    key: fileName,
                    isLeaf: true,
                    disabled: (content[fileName].length !== 2 && !fileName.includes('manifest.jsonl')),
                },

            );
        }
        setTreeData(tmp);

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
            {
                initialized && contentNotInManifest?.length && (
                    <div className='notification-file-not-exist-in-manifest'>
                        <Paragraph className='cvat-text-color'>
                            <WarningOutlined className='warning-icon' />
                            Some files are not contained in the manifest
                        </Paragraph>
                    </div>
                )
            }
            {
                initialized && contentNotInStorage?.length && (
                    <div className='notification-file-not-exist-in-storage'>
                        <Paragraph className='cvat-text-color'>
                            <WarningOutlined className='warning-icon' />
                            Some files specified on the manifest were not found on the storage
                        </Paragraph>
                    </div>
                )
            }
            { initialized && treeData.length ? (
                <DirectoryTree
                    multiple
                    checkable
                    height={256}
                    showLine
                    onCheck={(checkedKeys: { // FIXME: add handler for dirs and files not in manifest
                        checked: React.Key[];
                        halfChecked: React.Key[];
                    } | React.Key[]) => onCheckFiles(checkedKeys as ReactText[])}
                    // onExpand={onExpand}
                    treeData={treeData}
                />
            ) : (
                <div className='cvat-empty-cloud-storages-tree'>
                    <CloudTwoTone className='cvat-cloud-storage-icon' twoToneColor='#40a9ff' />
                    <Paragraph className='cvat-text-color'>Your have not avaliable storages yet</Paragraph>
                </div>
            )}
        </>
    );
}
