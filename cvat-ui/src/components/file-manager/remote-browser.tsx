// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { MouseEvent, useEffect, useState } from 'react';
import Breadcrumb from 'antd/lib/breadcrumb';
import Button from 'antd/lib/button';
import Pagination from 'antd/lib/pagination';
import Table from 'antd/lib/table';
import { CloudStorage } from 'reducers';
import { useIsMounted } from 'utils/hooks';
import { RightOutlined } from '@ant-design/icons';

interface Node {
    children: Node[];
    initialized: boolean;
    name: string;
    key: string;
    type: 'REG' | 'DIR';
}

interface Props {
    cloudStorage: CloudStorage;
    manifestPath?: string;
    onSelectFiles: (checkedKeysValue: string[]) => void;
}

function RemoteBrowser(props: Props): JSX.Element {
    const { cloudStorage, manifestPath, onSelectFiles } = props;
    const isMounted = useIsMounted();
    const [currentPath, setCurrentPath] = useState(['root']);
    const [currentPage, setCurrentPage] = useState(1);
    const [nextToken, setNextToken] = useState<string | null>(null);
    const [isFetching, setFetching] = useState(false);
    const [content, setContent] = useState<Node>({
        name: 'root',
        key: 'root',
        children: [],
        type: 'DIR',
        initialized: false,
    });

    const updateContent = (): void => {
        let target = content;
        for (const subpath of currentPath.slice(1)) {
            const child = target.children.find((item) => item.name === subpath);
            target = child as Node;
        }

        if (!target.initialized || nextToken) {
            const isRoot = (): boolean => currentPath.slice(1).length === 0;
            const path = `${currentPath.slice(1).join('/')}/`;
            setFetching(true);
            cloudStorage.getContent(path, nextToken, manifestPath).then((response: { next: string | null, content: Omit<Node, 'key'>[] }) => {
                const { next, content: children } = response;
                if (isMounted()) {
                    target.initialized = true;
                    target.children = children.map((child) => {
                        const splittedName = child.name.split('/');
                        const name = splittedName[child.type === 'REG' ? splittedName.length - 1 : splittedName.length - 2].replaceAll(/\//g, '');
                        return ({
                            ...child,
                            name,
                            key: isRoot() ? name : `${path}${name}`,
                            initialized: false,
                            children: child.children || [],
                        });
                    });

                    setContent({ ...content });
                    setNextToken(next);
                }
            }).finally(() => {
                if (isMounted()) {
                    setFetching(false);
                }
            });
        }
    };

    useEffect(() => {
        updateContent();
    }, [currentPath]);

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, node: Node) => {
                if (node.type === 'DIR') {
                    return (
                        <Button size='small' type='link' onClick={() => setCurrentPath([...currentPath, name])}>{name}</Button>
                    );
                }

                return name;
            },
        },
    ];

    let dataSource = content;
    for (const subpath of currentPath.slice(1)) {
        const child = (dataSource.children as Node[]).find((item) => item.name === subpath);
        dataSource = child as Node;
    }

    const PAGE_SIZE = 300;
    return (
        <div>
            <Breadcrumb>
                {currentPath.map((segment: string) => (
                    <Breadcrumb.Item
                        className='cvat-cloud-storage-browser-nav-breadcrumb'
                        onClick={() => {
                            if (segment !== currentPath[currentPath.length - 1]) {
                                setCurrentPath(
                                    currentPath.slice(0, currentPath.findIndex((val) => val === segment) + 1),
                                );
                            }
                        }}
                        key={segment}
                    >
                        {segment}
                    </Breadcrumb.Item>
                ))}
            </Breadcrumb>
            <div className='cvat-cloud-storage-browser-table-wrapper'>
                <Table
                    rowSelection={{
                        type: 'checkbox',
                        onChange: (selectedRowKeys) => {
                            onSelectFiles(selectedRowKeys.map((key) => key.toLocaleString()));
                        },
                        preserveSelectedRowKeys: true,
                    }}
                    childrenColumnName='$children'
                    loading={isFetching}
                    size='small'
                    columns={columns}
                    pagination={{
                        pageSize: PAGE_SIZE,
                        current: currentPage,
                        showPrevNextJumpers: false,
                    }}
                    dataSource={dataSource.children}
                />
                <Pagination
                    className='cvat-cloud-storage-browser-pages'
                    pageSize={PAGE_SIZE}
                    size='small'
                    total={dataSource.children.length}
                    onChange={(val: number) => {
                        setCurrentPage(val);
                    }}
                    showPrevNextJumpers={false}
                    current={currentPage}
                    itemRender={(_, type, originalElement) => {
                        if (type === 'prev') {
                            return null;
                        }

                        if (type === 'next') {
                            if (nextToken) {
                                return (
                                    <Button
                                        className='ant-pagination-item-link'
                                        onClick={(evt: MouseEvent) => {
                                            evt.stopPropagation();
                                            updateContent();
                                        }}
                                    >
                                        <RightOutlined />
                                    </Button>
                                );
                            }

                            return null;
                        }

                        return originalElement;
                    }}
                />
            </div>
        </div>
    );
}

export default React.memo(RemoteBrowser);
