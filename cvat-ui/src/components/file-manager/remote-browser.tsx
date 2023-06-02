// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    MouseEvent, useEffect, useState, useRef,
} from 'react';
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
    mimeType: string;
    nextToken?: string | null;
}

export type RemoteFile = Pick<Node, 'key' | 'type' | 'mimeType'>;

interface Props {
    resource: 'share' | CloudStorage;
    manifestPath?: string;
    onSelectFiles: (checkedKeysValue: RemoteFile[]) => void;
}

const core = getCore();

const defaultPath = ['root'];
const defaultRoot: Node = {
    name: 'root',
    key: 'root',
    children: [],
    type: 'DIR',
    mimeType: 'DIR',
    initialized: false,
    nextToken: null,
};

function RemoteBrowser(props: Props): JSX.Element {
    const { SHARE_MOUNT_GUIDE_URL } = config;
    const { resource, manifestPath, onSelectFiles } = props;
    const isMounted = useIsMounted();
    const resourceRef = useRef<Props['resource']>(resource);
    const manifestPathRef = useRef<string | undefined>(manifestPath);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [currentPath, setCurrentPath] = useState([...defaultPath]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFetching, setFetching] = useState(false);
    const [content, setContent] = useState<Node>({ ...defaultRoot });

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
                children.map((child) => {
                    const ending = `${child.type === 'DIR' ? '/' : ''}`;
                    return {
                        ...child,
                        key: isRoot() ? `${child.name}${ending}` : `${path}${child.name}${ending}`,
                        initialized: false,
                        children: [],
                    };
                })
            );
            setFetching(true);
            const currentResource = resourceRef.current;
            const currentManifest = manifestPathRef.current;
            const isRelevant = (): boolean => (
                // check if component is still relevant after async request, and resource & share are the same
                // if not, results are not valid anymore
                isMounted() &&
                currentResource === resourceRef.current &&
                currentManifest === manifestPathRef.current
            );
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
                if (isRelevant()) {
                    // select all new children if parent was selected
                    if (selectedRowKeys.includes(target.key)) {
                        const copy = selectedRowKeys.slice(0);
                        for (const child of nodes) {
                            copy.push(child.key);
                        }
                        setSelectedRowKeys(copy);
                    }

                    setContent({ ...content });
                }
            } catch (error: any) {
                if (isRelevant()) {
                    notification.error({
                        message: 'Storage content fetching failed',
                        description: error.toString(),
                    });
                }
            } finally {
                if (isRelevant()) {
                    setFetching(false);
                }
            }
        }
    };

    let dataSource = content;
    for (const subpath of currentPath.slice(1)) {
        const child = (dataSource.children as Node[]).find((item) => item.name === subpath);
        dataSource = child as Node;
    }

    useEffect(() => {
        if (resourceRef.current !== resource || manifestPathRef.current !== manifestPath) {
            setContent({ ...defaultRoot });
            setCurrentPage(1);
            setFetching(false);
            setCurrentPath([...defaultPath]);
            setSelectedRowKeys([]);
            resourceRef.current = resource;
            manifestPathRef.current = manifestPath;
        }
    }, [resource, manifestPath]);

    useEffect(() => {
        setCurrentPage(1);
        if (!dataSource.initialized) {
            updateContent();
        }
    }, [dataSource]);

    useEffect(() => {
        const nodes: Node[] = [];
        const collectNodes = (node: Node): void => {
            for (const child of node.children) {
                if (selectedRowKeys.includes(child.key)) {
                    nodes.push(child);
                }
                collectNodes(child);
            }
        };
        collectNodes(content);
        onSelectFiles(nodes);
    }, [selectedRowKeys]);

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
                {currentPath.map((segment: string, idx: number) => {
                    const key = currentPath.slice(0, idx + 1).join('/');
                    return (
                        <Breadcrumb.Item
                            className='cvat-remote-browser-nav-breadcrumb'
                            onClick={() => {
                                setCurrentPath(key.split('/'));
                            }}
                            key={key}
                        >
                            {segment}
                        </Breadcrumb.Item>
                    );
                })}
            </Breadcrumb>
            <div className='cvat-remote-browser-table-wrapper'>
                <Table
                    scroll={{ y: 472 }}
                    rowSelection={{
                        type: 'checkbox',
                        selectedRowKeys,
                        onChange: (_selectedRowKeys) => {
                            let copy = _selectedRowKeys.slice(0);

                            if (!copy.includes(dataSource.key) && !dataSource.nextToken) {
                                // select parent if all children have been fetched and selected
                                if (dataSource.children.every((child) => copy.includes(child.key))) {
                                    copy.push(dataSource.key);

                                    // also update all the parents recoursively
                                    const traverse = (node: Node, selectedKeys: React.Key[]): boolean => {
                                        if (dataSource === node) {
                                            return true;
                                        }

                                        for (const child of node.children) {
                                            // true if target node is a descendant and it was added to keys
                                            const val = traverse(child, selectedKeys);
                                            if (val) {
                                                // check and update ancestor if necessary
                                                if (node.children
                                                    .every((_child) => selectedKeys.includes(_child.key))) {
                                                    selectedKeys.push(node.key);
                                                    return true;
                                                }
                                            }
                                        }

                                        return false;
                                    };

                                    for (const child of content.children) {
                                        traverse(child, copy);
                                    }
                                }
                            }

                            // deselect children if parent was deselected
                            const deselectedKeys = selectedRowKeys.filter((key) => !_selectedRowKeys.includes(key));
                            for (const key of deselectedKeys) {
                                if (key.toLocaleString().endsWith('/')) {
                                    copy = copy.filter((_key) => !_key.toLocaleString()
                                        .startsWith(`${key.toLocaleString()}`));
                                }
                            }

                            // deselect parent if a child was deselected
                            copy = copy.filter((key) => !key.toLocaleString().endsWith('/') || !deselectedKeys
                                .some((_key) => _key.toLocaleString().startsWith(`${key.toLocaleString()}`)));

                            // select all children if parent was selected
                            const selectChildren = (node: Node): void => {
                                for (const child of node.children) {
                                    if (!copy.includes(child.key)) {
                                        copy.push(child.key);
                                        selectChildren(child);
                                    }
                                }
                            };
                            const listenedNodes = dataSource.children;
                            for (const node of listenedNodes) {
                                if (copy.includes(node.key)) {
                                    selectChildren(node);
                                }
                            }

                            setSelectedRowKeys(copy);
                        },
                        preserveSelectedRowKeys: true,
                        getCheckboxProps: (record: Node) => {
                            if (record.type !== 'DIR') {
                                return {};
                            }

                            const strKeys = selectedRowKeys.map((key) => key.toLocaleString());
                            const subkeys = strKeys.filter((key: string) => (
                                key.startsWith(`${record.key}`) && key.length > record.key.length
                            ));

                            const some = !!subkeys.length;
                            const every = strKeys.includes(record.key);

                            if (some && !every) {
                                return {
                                    indeterminate: true,
                                };
                            }

                            return {};
                        },
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
