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
import { FileOutlined, FolderOutlined, RightOutlined } from '@ant-design/icons';
import { getCore } from 'cvat-core-wrapper';
import { Empty, notification } from 'antd';

interface Node {
    children: Node[];
    initialized: boolean;
    name: string;
    key: string;
    type: RemoteFileType;
    mime_type?: string;
    nextToken?: string | null;
}

interface Props {
    resource: CloudStorage | 'share';
    manifestPath?: string;
    onSelectFiles: (checkedKeysValue: { key: string, type: RemoteFileType, mime_type?: string }[]) => void;
}

const core = getCore();

function RemoteBrowser(props: Props): JSX.Element {
    const { SHARE_MOUNT_GUIDE_URL } = config;
    const { resource, manifestPath, onSelectFiles } = props;
    const isMounted = useIsMounted();
    const [currentPath, setCurrentPath] = useState(['root']);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFetching, setFetching] = useState(false);
    const [content, setContent] = useState<Node>({
        name: 'root',
        key: 'root',
        children: [],
        type: 'DIR',
        initialized: false,
        nextToken: null,
    });

    const updateContent = async (): Promise<void> => {
        let target = content;
        for (const subpath of currentPath.slice(1)) {
            const child = target.children.find((item) => item.name === subpath);
            target = child as Node;
        }

        if (!target.initialized || target.nextToken) {
            const isRoot = (): boolean => currentPath.slice(1).length === 0;
            const path = `${currentPath.slice(1).join('/')}/`;
            const convertChildren = (children: Omit<Node, 'key' | 'children'>[]): Node[] => (
                children.map((child) => ({
                    ...child,
                    key: isRoot() ? child.name : `${path}${child.name}`,
                    initialized: false,
                    children: [],
                }))
            );
            setFetching(true);
            try {
                let nodes: Node[] = [];
                if (resource === 'share') {
                    const files: (Omit<Node, 'key' | 'children'>)[] = await core.server.share(path);
                    nodes = convertChildren(files);
                } else {
                    const response: { next: string | null, content: Omit<Node, 'key' | 'children'>[] } =
                        await resource.getContent(path, target.nextToken, manifestPath);
                    const { next, content: files } = response;
                    target.nextToken = next;
                    nodes = convertChildren(files);
                }

                target.children = target.children.concat(nodes);
                target.initialized = true;
                if (isMounted()) {
                    setContent({ ...content });
                }
            } catch (error: any) {
                notification.error({
                    message: 'Storage content fetching failed',
                    description: error.toString(),
                });
            } finally {
                if (isMounted()) {
                    setFetching(false);
                }
            }
        }
    };

    useEffect(() => {
        updateContent();
    }, [currentPath]);

    useEffect(() => {
        onSelectFiles([]);
    }, [resource]);

    useEffect(() => {
        const button = window.document.getElementsByClassName('cvat-remote-browser-receive-more-btn')[0];
        if (button) {
            if (isFetching) {
                button.setAttribute('disabled', '');
            } else {
                button.removeAttribute('disabled');
            }
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
                        <>
                            <Button size='small' type='link' onClick={() => setCurrentPath([...currentPath, name])}>
                                <FolderOutlined />
                                {name}
                            </Button>
                        </>
                    );
                }

                return (
                    <>
                        <FileOutlined className='cvat-remote-browser-file-icon' />
                        {name}
                    </>
                );
            },
        },
    ];

    let dataSource = content;
    for (const subpath of currentPath.slice(1)) {
        const child = (dataSource.children as Node[]).find((item) => item.name === subpath);
        dataSource = child as Node;
    }

    if (content.initialized && !content.children.length && resource === 'share') {
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

    const PAGE_SIZE = 500;
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
                    scroll={{ y: 472 }}
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
                        pageSize: PAGE_SIZE,
                        current: currentPage,
                        showPrevNextJumpers: false,
                    }}
                    dataSource={dataSource.children}
                />
                <Pagination
                    className='cvat-remote-browser-pages'
                    pageSize={PAGE_SIZE}
                    showQuickJumper
                    showSizeChanger={false}
                    total={dataSource.children.length}
                    onChange={(newPage: number) => {
                        setCurrentPage(newPage);
                    }}
                    current={currentPage}
                    itemRender={(_, type, originalElement) => {
                        if (type === 'next') {
                            if (dataSource.nextToken) {
                                return (
                                    <button
                                        type='button'
                                        className='cvat-remote-browser-receive-more-btn ant-pagination-item-link'
                                    >
                                        <RightOutlined onClick={(evt: MouseEvent) => {
                                            const totalPages = Math.ceil(dataSource.children.length / PAGE_SIZE);
                                            if (currentPage === totalPages) {
                                                if (!isFetching) {
                                                    evt.stopPropagation();
                                                    updateContent().then(() => {
                                                        setCurrentPage(currentPage + 1);
                                                    });
                                                }
                                            } else {
                                                setCurrentPage(currentPage + 1);
                                            }
                                        }}
                                        />
                                    </button>
                                );
                            }
                        }

                        return originalElement;
                    }}
                />
            </div>
        </div>
    );
}

export default React.memo(RemoteBrowser);
