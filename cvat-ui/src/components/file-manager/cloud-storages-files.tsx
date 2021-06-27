// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
/* eslint-disable @typescript-eslint/no-unused-vars */
import './styles.scss';
import React, {
    ReactText, useCallback, useEffect, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import { Row, Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Tabs from 'antd/lib/tabs';
import { CloudTwoTone, PlusCircleOutlined } from '@ant-design/icons';
import Tree, { TreeNodeNormal } from 'antd/lib/tree/Tree';
import Spin from 'antd/lib/spin';
import { CloudStoragesQuery, CombinedState } from 'reducers/interfaces';
import IntelligentScissorsImplementation from 'utils/opencv-wrapper/intelligent-scissors';
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

    const { DirectoryTree } = Tree;
    const [selectedFiles, setSelectedFiles] = useState<CloudStorageFile[] | null>([]);

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
        const tmp = [];
        for (const fileName of fileNames) {
            tmp.push(
                {
                    title: fileName,
                    key: fileName,
                    isLeaf: true,
                },

            );
        }
        setTreeData(tmp);
    }, [fileNames]);

    // const onSelectFiles = (keys: React.Key[]): void => {

    // };

    if (isFetching) {
        return (
            <Row className='cvat-creaqte-task-page-cloud-storages-tab-empty7-content' justify='center' align='middle'>
                <Spin size='large' />
            </Row>
        );
    }

    return (
        <>
            { treeData.length ? (
                <DirectoryTree
                    multiple
                    checkable
                    height={256}
                    showLine
                    // defaultExpandAll
                    // onSelect={(event): void => onSelectFiles(event.target.value)}
                    onCheck={(checkedKeys: { // FIXME: add handler for dirs and files not in manifest
                        checked: React.Key[];
                        halfChecked: React.Key[];
                    } | React.Key[]) => onCheckFiles(checkedKeys as ReactText[])}
                    // onExpand={onExpand}
                    // eslint-disable-next-line react/jsx-props-no-multi-spaces
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
