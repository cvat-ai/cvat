// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { MouseEvent, useEffect, useState } from 'react';
import Breadcrumb from 'antd/lib/breadcrumb';
import Button from 'antd/lib/button';
import Pagination from 'antd/lib/pagination';
import Table from 'antd/lib/table';
import Paragraph from 'antd/lib/typography/Paragraph';
import Text from 'antd/lib/typography/Text';

import config from 'config';
import { CloudStorage, RemoteFileType } from 'reducers';
import { useIsMounted } from 'utils/hooks';
import { RightOutlined } from '@ant-design/icons';
import { getCore } from 'cvat-core-wrapper';
import { Empty } from 'antd';

interface Node {
    children: Node[];
    initialized: boolean;
    name: string;
    key: string;
    type: RemoteFileType;
    mime_type?: string;
}

interface Props {
    cloudStorage: CloudStorage | 'share';
    manifestPath?: string;
    onSelectFiles: (checkedKeysValue: { key: string, type: RemoteFileType, mime_type?: string }[]) => void;
}

const core = getCore();

function RemoteBrowser(props: Props): JSX.Element {
    const { SHARE_MOUNT_GUIDE_URL } = config;
    const { cloudStorage, manifestPath, onSelectFiles } = props;
    const isMounted = useIsMounted();
    const [currentPath, setCurrentPath] = useState(['root']);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(300);
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
            if (cloudStorage === 'share') {
                core.server.share(path).then((files: (Omit<Node, 'key' | 'children'>)[]) => {
                    if (isMounted()) {
                        const converted = files.map((child) => ({
                            ...child,
                            key: isRoot() ? child.name : `${path}${child.name}`,
                            initialized: false,
                            children: [],
                        }));

                        target.initialized = true;
                        target.children = target.children.concat(converted);
                        setContent({ ...content });
                    }
                }).finally(() => {
                    if (isMounted()) {
                        setFetching(false);
                    }
                });
            } else {
                cloudStorage.getContent(path, nextToken, manifestPath).then((response: { next: string | null, content: Omit<Node, 'key' | 'children'>[] }) => {
                    const { next, content: children } = response;
                    if (isMounted()) {
                        target.initialized = true;
                        target.children = target.children.concat(children.map((child) => ({
                            ...child,
                            key: isRoot() ? child.name : `${path}${child.name}`,
                            initialized: false,
                            children: [],
                        })));

                        setContent({ ...content });
                        setNextToken(next);
                    }
                }).finally(() => {
                    if (isMounted()) {
                        setFetching(false);
                    }
                });
            }
        }
    };

    useEffect(() => {
        updateContent();
    }, [currentPath]);

    useEffect(() => {
        onSelectFiles([]);
    }, [cloudStorage]);

    useEffect(() => {
        const pagesContainer = window.document.getElementsByClassName('cvat-remote-browser-pages')[0];
        const anchor = window.document.querySelectorAll('.cvat-remote-browser-pages .ant-pagination-next')[0];
        const button = window.document.getElementsByClassName('cvat-remote-browser-receive-more-btn')[0];
        if (pagesContainer && button && anchor) {
            pagesContainer.insertBefore(button, anchor);
        }
    });

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

    if (content.initialized && !content.children.length && cloudStorage === 'share') {
        return (
            <>
                <Empty />
                <Paragraph className='cvat-remote-browser-empty'>
                    Please, be sure you had
                    <Text strong>
                        <a href={SHARE_MOUNT_GUIDE_URL}> mounted </a>
                    </Text>
                    share before you built CVAT and the shared storage contains files
                </Paragraph>
            </>
        );
    }

    return (
        <div>
            <Breadcrumb>
                {currentPath.map((segment: string) => (
                    <Breadcrumb.Item
                        className='cvat-remote-browser-nav-breadcrumb'
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
            <div className='cvat-remote-browser-table-wrapper'>
                <Table
                    rowSelection={{
                        type: 'checkbox',
                        onChange: (_, selectedRows) => {
                            onSelectFiles(selectedRows);
                        },
                        preserveSelectedRowKeys: true,
                    }}
                    childrenColumnName='$children'
                    loading={isFetching}
                    size='small'
                    columns={columns}
                    pagination={{
                        pageSize,
                        current: currentPage,
                        showPrevNextJumpers: false,
                    }}
                    dataSource={dataSource.children}
                />
                <Pagination
                    className='cvat-remote-browser-pages'
                    pageSize={pageSize}
                    size='small'
                    total={dataSource.children.length}
                    onChange={(newPage: number, newPageSize: number) => {
                        setCurrentPage(newPage);
                        setPageSize(newPageSize);
                    }}
                    pageSizeOptions={[10, 100, 300, 500]}
                    showPrevNextJumpers={false}
                    current={currentPage}
                    itemRender={(_, type, originalElement) => {
                        if (type === 'prev') {
                            return null;
                        }

                        if (type === 'next') {
                            return null;
                        }

                        return originalElement;
                    }}
                />
                {
                    !!nextToken && (
                        <RightOutlined
                            className='cvat-remote-browser-receive-more-btn'
                            disabled={!nextToken}
                            onClick={(evt: MouseEvent) => {
                                if (!isFetching) {
                                    evt.stopPropagation();
                                    updateContent();
                                }
                            }}
                        />
                    )
                }
            </div>
        </div>
    );
}

export default React.memo(RemoteBrowser);
