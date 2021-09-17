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
import { EventDataNode } from 'antd/lib/tree';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Divider from 'antd/lib/divider';
import { CloudStorage, CombinedState } from 'reducers/interfaces';
import { loadCloudStorageContentAsync } from 'actions/cloud-storage-actions';

interface Props {
    cloudStorage: CloudStorage;
    selectedManifest: string;
    onSelectFiles: (checkedKeysValue: string[]) => void;
    selectedFiles: string[];
}

interface DataNode {
    title: string;
    key: string;
    isLeaf: boolean;
    disabled: boolean;
    children: DataNode[];
}

interface DataStructure {
    name: string;
    children: Map<string, DataStructure> | null;
    unparsedChildren: string[] | null;
}

type Files =
    | ReactText[]
    | {
        checked: ReactText[];
        halfChecked: ReactText[];
    };

export default function CloudStorageFiles(props: Props): JSX.Element {
    const {
        cloudStorage, selectedManifest, selectedFiles, onSelectFiles,
    } = props;
    const dispatch = useDispatch();
    const isFetching = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.fetching);
    const content = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.content);
    const error = useSelector((state: CombinedState) => state.cloudStorages.activities.contentLoads.error);
    const [treeData, setTreeData] = useState<DataNode[]>([]);
    const [initialData, setInitialData] = useState<DataStructure>({
        name: 'root',
        children: null,
        unparsedChildren: null,
    });

    const [checkedAll, setCheckedAll] = useState(false);

    useEffect(() => {
        dispatch(loadCloudStorageContentAsync(cloudStorage));
    }, [cloudStorage.id, selectedManifest]);

    const parseContent = (mass: string[], root = ''): Map<string, DataStructure> => {
        const data: Map<string, DataStructure> = new Map();
        // define directories
        const upperDirs: Set<string> = new Set(
            mass.filter((path: string) => path.includes('/')).map((path: string) => path.split('/', 1)[0]),
        );

        for (const dir of upperDirs) {
            const child: DataStructure = {
                name: dir,
                children: null,
                unparsedChildren: mass
                    .filter((path: string) => path.startsWith(`${dir}/`))
                    .map((path: string) => path.replace(`${dir}/`, '')),
            };
            data.set(`${root}${dir}/`, child);
        }

        // define files
        const rootFiles = mass.filter((path: string) => !path.includes('/'));

        for (const rootFile of rootFiles) {
            const child: DataStructure = {
                name: rootFile,
                children: null,
                unparsedChildren: null,
            };
            data.set(`${root}${rootFile}`, child);
        }
        return data;
    };

    const updateData = (key: string, data: Map<string, DataStructure> | null): Map<string, DataStructure> | null => {
        if (data === null) {
            return data;
        }

        for (const [dataItemKey, dataItemValue] of data) {
            if (key.startsWith(dataItemKey) && key.replace(dataItemKey, '')) {
                // eslint-disable-next-line no-param-reassign
                data = updateData(key, dataItemValue.children);
            } else if (dataItemKey === key) {
                const unparsedDataItemChildren = dataItemValue.unparsedChildren;
                if (dataItemValue && unparsedDataItemChildren) {
                    dataItemValue.children = parseContent(unparsedDataItemChildren, dataItemKey);
                    dataItemValue.unparsedChildren = null;
                }
            }
        }
        return data;
    };

    const onLoadData = (key: string): Promise<void> =>
        new Promise((resolve) => {
            if (initialData.children === null) {
                resolve();
                return;
            }
            setInitialData({
                ...initialData,
                children: updateData(key, initialData.children),
            });
            resolve();
        });

    useEffect(() => {
        if (content) {
            const children = parseContent(content);

            setInitialData({
                ...initialData,
                children,
            });
        } else {
            setInitialData({
                name: 'root',
                children: null,
                unparsedChildren: null,
            });
        }
    }, [content]);

    const prepareNodes = (data: Map<string, DataStructure>, nodes: DataNode[]): DataNode[] => {
        for (const [key, value] of data) {
            const node: DataNode = {
                title: value.name,
                key,
                isLeaf: !value.children && !value.unparsedChildren,
                disabled: !!value.unparsedChildren,
                children: [],
            };
            if (value.children) {
                node.children = prepareNodes(value.children, []);
            }
            nodes.push(node);
        }
        return nodes;
    };

    useEffect(() => {
        if (initialData.children && content) {
            const nodes = prepareNodes(initialData.children, []);
            setTreeData(nodes);
        } else {
            setTreeData([]);
        }
    }, [initialData]);

    const onChangeCheckedAll = (checked: boolean): void => {
        setCheckedAll(checked);
        if (checked) {
            onSelectFiles((content as string[]).concat([selectedManifest]));
        } else {
            onSelectFiles([]);
        }
    };

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
            {treeData.length ? (
                <>
                    <Checkbox
                        className='cvat-cloud-storage-files-checkbox'
                        onChange={(event: CheckboxChangeEvent) => onChangeCheckedAll(event.target.checked)}
                        checked={checkedAll}
                    >
                        Select all
                    </Checkbox>
                    <Divider className='cvat-divider' />
                    <Tree.DirectoryTree
                        selectable={false}
                        multiple
                        checkable
                        height={256}
                        onCheck={(checkedKeys: Files) => {
                            const checkedFiles = (checkedKeys as string[]).filter((f) => !f.endsWith('/'));
                            if (checkedFiles.length === (content as string[]).length) {
                                setCheckedAll(true);
                            } else if (checkedAll) {
                                setCheckedAll(false);
                            }
                            onSelectFiles(checkedFiles.concat([selectedManifest]));
                        }}
                        loadData={(event: EventDataNode): Promise<void> => onLoadData(event.key.toLocaleString())}
                        treeData={treeData}
                        checkedKeys={selectedFiles}
                    />
                </>
            ) : (
                <Empty className='cvat-empty-cloud-storages-tree' description='The storage is empty' />
            )}
        </>
    );
}
